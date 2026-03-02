import { ChannelType, VoiceState, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVocManager, IJoinChannel } from '../models/vocManagerConfig.model';
import GuildModel from '../../discord/models/guild.model';
import { GuildService } from '../../discord/services/guild.service';
import UserMountainsModel from '../models/userMountains.model';
import * as fs from 'fs';
import * as path from 'path';

export const VOC_CONFIG_BUTTON_ID = 'voc-config-button';
export const VOC_INVITE_USER_SELECT_ID = 'voc-invite-user-select';

export interface MountainInfo {
  id: string;
  name: string;
  description: string;
  altitude: string;
  image: string;
  wiki: string;
}

export class VocManagerService {
  private static MOUNTAINS: MountainInfo[] = [];

  // Map channelId → mountainId pour les canaux créés
  private static channelMountains = new Map<string, string>();

  // Map userId_channelId → { mountainId, joinedAt }
  private static userChannelSessions = new Map<string, { mountainId: string; joinedAt: number }>();

  static {
    try {
      const mountainsPath = path.join(__dirname, '../data/mountains.json');
      const mountainsData = fs.readFileSync(mountainsPath, 'utf-8');
      this.MOUNTAINS = JSON.parse(mountainsData);
      console.log(`[VocManager] ${this.MOUNTAINS.length} montagnes chargées depuis mountains.json`);
    } catch (error) {
      console.error('[VocManager] Erreur lors du chargement des montagnes:', error);
      this.MOUNTAINS = [];
    }
  }

  // ─── Mountains ─────────────────────────────────────────────────────────────

  static getMountainById(mountainId: string): MountainInfo | undefined {
    return this.MOUNTAINS.find(m => m.id === mountainId);
  }

  static getAllMountains(): MountainInfo[] {
    return [...this.MOUNTAINS];
  }

  static reloadMountains(): void {
    try {
      const mountainsPath = path.join(__dirname, '../data/mountains.json');
      const mountainsData = fs.readFileSync(mountainsPath, 'utf-8');
      this.MOUNTAINS = JSON.parse(mountainsData);
      console.log(`[VocManager] ${this.MOUNTAINS.length} montagnes rechargées`);
    } catch (error) {
      console.error('[VocManager] Erreur lors du rechargement des montagnes:', error);
    }
  }

  private static getRandomMountain(): MountainInfo | null {
    if (this.MOUNTAINS.length === 0) return null;
    return this.MOUNTAINS[Math.floor(Math.random() * this.MOUNTAINS.length)];
  }

  // ─── Channel ↔ mountain association ────────────────────────────────────────

  private static setChannelMountain(channelId: string, mountainId: string): void {
    this.channelMountains.set(channelId, mountainId);
  }

  private static getChannelMountain(channelId: string): string | undefined {
    return this.channelMountains.get(channelId);
  }

  private static removeChannelMountain(channelId: string): void {
    this.channelMountains.delete(channelId);
  }

  // ─── User sessions ─────────────────────────────────────────────────────────

  private static startUserChannelSession(userId: string, channelId: string, mountainId: string): void {
    const key = `${userId}_${channelId}`;
    this.userChannelSessions.set(key, { mountainId, joinedAt: Date.now() });
    console.log(`[VocManager] Session démarrée: user=${userId} channel=${channelId} mountain=${mountainId}`);
  }

  private static endUserChannelSession(userId: string, channelId: string): { mountainId: string; joinedAt: number; durationSeconds: number } | null {
    const key = `${userId}_${channelId}`;
    const session = this.userChannelSessions.get(key);
    if (!session) return null;

    this.userChannelSessions.delete(key);
    const durationSeconds = Math.floor((Date.now() - session.joinedAt) / 1000);
    console.log(`[VocManager] Session terminée: user=${userId} durée=${durationSeconds}s`);

    return { mountainId: session.mountainId, joinedAt: session.joinedAt, durationSeconds };
  }

  // ─── Mountain unlock ────────────────────────────────────────────────────────

  static async checkAndUnlockMountain(client: BotClient, userId: string, channelId: string, guildId: string): Promise<void> {
    try {
      const session = this.endUserChannelSession(userId, channelId);
      if (!session) return;

      const REQUIRED_SECONDS = 30 * 60; // 30 minutes

      if (session.durationSeconds >= REQUIRED_SECONDS) {
        await this.unlockMountain(userId, session.mountainId, guildId, client);
      } else {
        console.log(`[VocManager] User ${userId} a passé ${session.durationSeconds}s (besoin de ${REQUIRED_SECONDS}s)`);
      }
    } catch (error) {
      console.error('[VocManager] Erreur checkAndUnlockMountain:', error);
    }
  }

  private static async unlockMountain(userId: string, mountainId: string, guildId: string, client: BotClient): Promise<void> {
    try {
      let userMountains = await UserMountainsModel.findOne({ userId });
      if (!userMountains) {
        userMountains = new UserMountainsModel({ userId, unlockedMountains: [] });
      }

      const alreadyUnlocked = userMountains.unlockedMountains.some(m => m.mountainId === mountainId);
      if (alreadyUnlocked) return;

      userMountains.unlockedMountains.push({ mountainId, unlockedAt: new Date() });
      await userMountains.save();

      const mountain = this.getMountainById(mountainId);
      if (!mountain) return;

      await this.sendMountainUnlockNotification(userId, mountain, userMountains.unlockedMountains.length, guildId, client);
      console.log(`[VocManager] Montagne ${mountainId} débloquée pour ${userId} (${userMountains.unlockedMountains.length}/${this.MOUNTAINS.length})`);
    } catch (error) {
      console.error('[VocManager] Erreur unlockMountain:', error);
    }
  }

  private static async sendMountainUnlockNotification(userId: string, mountain: MountainInfo, totalUnlocked: number, guildId: string, client: BotClient): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const vocManager = await this.getVocManager(guildId);
      if (!vocManager?.notificationChannelId) {
        console.log(`[VocManager] Pas de canal de notification configuré. Montagne débloquée: ${mountain.name} pour ${userId}`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏔️ Nouvelle montagne débloquée !')
        .setDescription(`<@${userId}> a débloqué **${mountain.name}** après avoir passé 30 minutes dans un salon vocal !`)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '📊 Progression', value: `${totalUnlocked}/${this.MOUNTAINS.length} montagnes`, inline: true }
        )
        .setThumbnail(mountain.image)
        .setFooter({ text: 'Continuez à explorer pour débloquer toutes les montagnes !' })
        .setTimestamp();

      const notificationChannel = await guild.channels.fetch(vocManager.notificationChannelId).catch(() => null);
      if (notificationChannel?.isTextBased()) {
        await notificationChannel.send({ embeds: [embed] }).catch((err: unknown) => {
          console.error('[VocManager] Erreur envoi notification:', err);
        });
      }
    } catch (error) {
      console.error('[VocManager] Erreur sendMountainUnlockNotification:', error);
    }
  }

  // ─── Config ────────────────────────────────────────────────────────────────

  static async getVocManager(guildId: string): Promise<IVocManager | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.vocManager ?? null;
  }

  static async createVocManager(guildId: string, enabled = false): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    guild.features = guild.features ?? {};
    guild.features.vocManager = { enabled, joinChannels: [], createdChannels: [], channelCount: 0 };
    await guild.save();
    return guild.features.vocManager;
  }

  static async getOrCreateVocManager(guildId: string, enabled = false): Promise<IVocManager> {
    const existing = await this.getVocManager(guildId);
    if (existing) return existing;
    return this.createVocManager(guildId, enabled);
  }

  static async addChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = { enabled: false, joinChannels: [], createdChannels: [], channelCount: 0 };
    }
    guild.features.vocManager.createdChannels.push(channelId);
    guild.features.vocManager.channelCount += 1;
    await guild.save();
    return guild.features.vocManager;
  }

  static async removeChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;
    guild.features.vocManager.createdChannels = guild.features.vocManager.createdChannels.filter((id: string) => id !== channelId);
    await guild.save();
    return guild.features.vocManager;
  }

  static async addJoinChannel(guildId: string, channelId: string, category: string, nameTemplate = '🎮 {username} #{count}'): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = { enabled: false, joinChannels: [], createdChannels: [], channelCount: 0 };
    }
    const idx = guild.features.vocManager.joinChannels.findIndex((c: IJoinChannel) => c.id === channelId);
    const entry = { id: channelId, nameTemplate, category };
    if (idx !== -1) guild.features.vocManager.joinChannels[idx] = entry;
    else guild.features.vocManager.joinChannels.push(entry);
    await guild.save();
    return guild.features.vocManager;
  }

  static async removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;
    guild.features.vocManager.joinChannels = guild.features.vocManager.joinChannels.filter((c: IJoinChannel) => c.id !== channelId);
    await guild.save();
    return guild.features.vocManager;
  }

  static async updateJoinChannelSettings(guildId: string, channelId: string, nameTemplate?: string, category?: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;
    const idx = guild.features.vocManager.joinChannels.findIndex((c: IJoinChannel) => c.id === channelId);
    if (idx === -1) return null;
    if (nameTemplate !== undefined) guild.features.vocManager.joinChannels[idx].nameTemplate = nameTemplate;
    if (category !== undefined) guild.features.vocManager.joinChannels[idx].category = category;
    await guild.save();
    return guild.features.vocManager;
  }

  static async updateNotificationChannel(guildId: string, channelId: string | null): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = { enabled: false, joinChannels: [], createdChannels: [], channelCount: 0 };
    }
    guild.features.vocManager.notificationChannelId = channelId ?? undefined;
    await guild.save();
    return guild.features.vocManager;
  }

  static async toggleFeature(guildId: string, enabled: boolean): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = { enabled: false, joinChannels: [], createdChannels: [], channelCount: 0 };
    }
    guild.features.vocManager.enabled = enabled;
    await guild.save();
    return guild.features.vocManager;
  }

  static async getJoinChannelSettings(guildId: string, channelId: string): Promise<IJoinChannel | null> {
    const vocManager = await this.getVocManager(guildId);
    return vocManager?.joinChannels.find(c => c.id === channelId) ?? null;
  }

  // ─── Voice events ──────────────────────────────────────────────────────────

  static async handleUserJoinChannel(client: BotClient, _oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      if (newState.member?.user.bot) return;

      const guildId = newState.guild.id;
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager?.enabled) return;

      const joinChannel = vocManager.joinChannels.find(c => c.id === newState.channelId);

      if (joinChannel) {
        const username = newState.member?.user.username ?? 'Utilisateur';
        const channelNumber = vocManager.channelCount + 1;
        const mountainInfo = this.getRandomMountain();

        const channelName = (joinChannel.nameTemplate ?? '🎮 {username} #{count}')
          .replace('{username}', username)
          .replace('{user}', username)
          .replace('{mountain}', mountainInfo?.name ?? 'Vocal')
          .replace('{count}', channelNumber.toString())
          .replace('{total}', channelNumber.toString());

        try {
          const newChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: joinChannel.category,
          });

          if (newState.member?.voice.channel) {
            await newState.member.voice.setChannel(newChannel).catch(err => {
              console.error('[VocManager] Erreur déplacement utilisateur:', err);
            });
          }

          await this.addChannel(guildId, newChannel.id);

          if (mountainInfo) {
            this.setChannelMountain(newChannel.id, mountainInfo.id);
            this.startUserChannelSession(newState.member!.user.id, newChannel.id, mountainInfo.id);

            try {
              const mountainEmbed = new EmbedBuilder()
                .setColor('#8B4513')
                .setTitle(`⛰️ ${mountainInfo.name}`)
                .setDescription(mountainInfo.description)
                .addFields(
                  { name: '📏 Altitude', value: mountainInfo.altitude, inline: true },
                  { name: '🔗 En savoir plus', value: `[Wikipédia](${mountainInfo.wiki})`, inline: true }
                )
                .setImage(mountainInfo.image)
                .setTimestamp()
                .setFooter({ text: '🏔️ Restez 30 minutes pour débloquer cette montagne !' });

              const configEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎙️ Salon vocal créé !')
                .setDescription(`<@${newState.member?.id}> a créé ce salon vocal **${channelName}**.\n\nUtilisez le bouton ci-dessous pour configurer le salon.`)
                .addFields(
                  { name: '📝 Nom actuel', value: channelName, inline: true },
                  { name: '👥 Limite', value: 'Illimité', inline: true },
                  { name: '🔒 Visibilité', value: 'Public', inline: true }
                )
                .setFooter({ text: 'Configuration disponible pendant toute la durée du salon' });

              const configButton = new ButtonBuilder()
                .setCustomId(`${VOC_CONFIG_BUTTON_ID}_${guildId}_${newChannel.id}_${newState.member?.id}`)
                .setLabel('⚙️ Configurer')
                .setStyle(ButtonStyle.Primary);

              const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(configButton);

              await newChannel.send({ embeds: [mountainEmbed, configEmbed], components: [buttonRow] });
            } catch (err) {
              console.error('[VocManager] Erreur envoi embed:', err);
            }
          }

          console.log(`[VocManager] Canal créé: ${newChannel.name} pour ${username}`);
        } catch (err) {
          console.error('[VocManager] Erreur création canal:', err);
        }
      } else {
        // Utilisateur rejoint un canal déjà créé
        if (newState.channelId && vocManager.createdChannels.includes(newState.channelId)) {
          const mountainId = this.getChannelMountain(newState.channelId);
          if (mountainId) {
            this.startUserChannelSession(newState.member!.user.id, newState.channelId, mountainId);
          }
        }
      }
    } catch (error) {
      console.error('[VocManager] Erreur handleUserJoinChannel:', error);
    }
  }

  static async handleUserLeaveChannel(client: BotClient, oldState: VoiceState, _newState: VoiceState): Promise<void> {
    try {
      if (oldState.member?.user.bot) return;

      const guildId = oldState.guild.id;
      const userId = oldState.member!.user.id;

      const vocManager = await this.getVocManager(guildId);
      if (!vocManager?.enabled) return;

      if (!vocManager.createdChannels.includes(oldState.channelId ?? '')) return;

      await this.checkAndUnlockMountain(client, userId, oldState.channelId!, guildId);

      const channel = oldState.channel;
      if (channel && channel.members.size === 0) {
        try {
          await channel.delete();
          this.removeChannelMountain(oldState.channelId!);
          await this.removeChannel(guildId, oldState.channelId!);
          console.log(`[VocManager] Canal supprimé: ${channel.name}`);
        } catch (err) {
          console.error('[VocManager] Erreur suppression canal:', err);
        }
      }
    } catch (error) {
      console.error('[VocManager] Erreur handleUserLeaveChannel:', error);
    }
  }

  // ─── Config message ────────────────────────────────────────────────────────

  static async updateConfigMessage(
    channelId: string,
    guildId: string,
    ownerId: string,
    isPrivate: boolean,
    channelName: string,
    limit: number,
    client: BotClient
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildVoice) return;

      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      if (!messages) return;

      const configMessage = messages.find(msg =>
        msg.embeds.length > 0 &&
        msg.embeds[0].title === '🎙️ Salon vocal créé !' &&
        msg.components.length > 0
      );
      if (!configMessage) return;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎙️ Salon vocal créé !')
        .setDescription(`<@${ownerId}> a créé ce salon vocal **${channelName}**.\n\nUtilisez le bouton ci-dessous pour configurer le salon.`)
        .addFields(
          { name: '📝 Nom actuel', value: channelName, inline: true },
          { name: '👥 Limite', value: limit === 0 ? 'Illimité' : `${limit} personnes`, inline: true },
          { name: '🔒 Visibilité', value: isPrivate ? '🔒 Privé' : '🌐 Public', inline: true }
        )
        .setFooter({ text: 'Configuration disponible pendant toute la durée du salon' });

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${VOC_CONFIG_BUTTON_ID}_${guildId}_${channelId}_${ownerId}`)
          .setLabel('⚙️ Configurer')
          .setStyle(ButtonStyle.Primary)
      );

      const components: ActionRowBuilder<ButtonBuilder | UserSelectMenuBuilder>[] = [buttonRow];

      if (isPrivate) {
        const inviteRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`${VOC_INVITE_USER_SELECT_ID}_${guildId}_${channelId}_${ownerId}`)
            .setPlaceholder('➕ Sélectionner des utilisateurs à inviter')
            .setMinValues(1)
            .setMaxValues(10)
        );
        components.push(inviteRow);
      }

      await configMessage.edit({ embeds: [embed], components });
    } catch (error) {
      console.error('[VocManager] Erreur updateConfigMessage:', error);
    }
  }

  // ─── User mountains ────────────────────────────────────────────────────────

  static async getUserUnlockedMountains(userId: string) {
    const doc = await UserMountainsModel.findOne({ userId });
    return doc?.unlockedMountains ?? [];
  }
}
