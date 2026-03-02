import { ChannelType, VoiceState, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVocManager, IVocManagerDoc, IJoinChannel } from '../models/vocManagerConfig.model';
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

  // Map channelId to mountainId for created channels
  private static channelMountains = new Map<string, string>();

  // Track when users join channels: Map<userId_channelId, { mountainId: string, joinedAt: number }>
  private static userChannelSessions = new Map<string, { mountainId: string, joinedAt: number }>();

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

  /**
   * Get a mountain by its ID
   */
  static getMountainById(mountainId: string): MountainInfo | undefined {
    return this.MOUNTAINS.find(m => m.id === mountainId);
  }

  /**
   * Get all mountains
   */
  static getAllMountains(): MountainInfo[] {
    return [...this.MOUNTAINS];
  }

  /**
   * Reload mountains from the JSON file
   */
  static reloadMountains(): void {
    try {
      const mountainsPath = path.join(__dirname, '../data/mountains.json');
      const mountainsData = fs.readFileSync(mountainsPath, 'utf-8');
      this.MOUNTAINS = JSON.parse(mountainsData);
      console.log(`[VocManager] ${this.MOUNTAINS.length} montagnes rechargées depuis mountains.json`);
    } catch (error) {
      console.error('[VocManager] Erreur lors du rechargement des montagnes:', error);
    }
  }

  /**
   * Associate a channel with a mountain
   */
  private static setChannelMountain(channelId: string, mountainId: string): void {
    this.channelMountains.set(channelId, mountainId);
    console.log(`[VocManager] Channel ${channelId} associated with mountain: ${mountainId}`);
  }

  /**
   * Get the mountain ID for a channel
   */
  private static getChannelMountain(channelId: string): string | undefined {
    return this.channelMountains.get(channelId);
  }

  /**
   * Remove channel-mountain association
   */
  private static removeChannelMountain(channelId: string): void {
    this.channelMountains.delete(channelId);
  }

  /**
   * Track when a user joins a mountain channel
   */
  private static startUserChannelSession(userId: string, channelId: string, mountainId: string): void {
    const sessionKey = `${userId}_${channelId}`;
    this.userChannelSessions.set(sessionKey, {
      mountainId,
      joinedAt: Date.now()
    });
    console.log(`[VocManager] User ${userId} started session in channel ${channelId} for mountain ${mountainId}`);
  }

  /**
   * Get and remove a user's channel session
   */
  private static endUserChannelSession(userId: string, channelId: string): { mountainId: string, joinedAt: number, durationSeconds: number } | null {
    const sessionKey = `${userId}_${channelId}`;
    const session = this.userChannelSessions.get(sessionKey);

    if (!session) return null;

    this.userChannelSessions.delete(sessionKey);

    const durationMs = Date.now() - session.joinedAt;
    const durationSeconds = Math.floor(durationMs / 1000);

    console.log(`[VocManager] User ${userId} ended session in channel ${channelId}, duration: ${durationSeconds}s`);

    return {
      mountainId: session.mountainId,
      joinedAt: session.joinedAt,
      durationSeconds
    };
  }

  /**
   * Unlock a mountain for a user and send notification
   */
  private static async unlockMountain(userId: string, mountainId: string, guildId: string, client: BotClient): Promise<void> {
    try {
      // Check if user already has this mountain
      let userMountains = await UserMountainsModel.findOne({ userId });

      if (!userMountains) {
        userMountains = new UserMountainsModel({
          userId,
          unlockedMountains: []
        });
      }

      // Check if already unlocked
      const alreadyUnlocked = userMountains.unlockedMountains.some(m => m.mountainId === mountainId);
      if (alreadyUnlocked) {
        console.log(`[VocManager] Mountain ${mountainId} already unlocked for user ${userId}`);
        return;
      }

      // Add the new mountain
      userMountains.unlockedMountains.push({
        mountainId,
        unlockedAt: new Date()
      });

      await userMountains.save();

      // Find the mountain info
      const mountain = this.MOUNTAINS.find(m => m.id === mountainId);
      if (!mountain) return;

      // Send unlock notification
      await this.sendMountainUnlockNotification(userId, mountain, userMountains.unlockedMountains.length, guildId, client);

      console.log(`[VocManager] Mountain ${mountainId} unlocked for user ${userId} (${userMountains.unlockedMountains.length}/${this.MOUNTAINS.length})`);
    } catch (error) {
      console.error('[VocManager] Error unlocking mountain:', error);
    }
  }

  /**
   * Send a notification when a mountain is unlocked
   */
  private static async sendMountainUnlockNotification(userId: string, mountain: MountainInfo, totalUnlocked: number, guildId: string, client: BotClient): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const vocManager = await this.getVocManager(guildId);
      if (!vocManager) return;

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏔️ Nouvelle montagne débloquée !')
        .setDescription(`<@${userId}> a débloqué **${mountain.name}** après avoir passé 30 secondes dans un salon vocal !`)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '📊 Progression', value: `${totalUnlocked}/${this.MOUNTAINS.length} montagnes`, inline: true }
        )
        .setThumbnail(mountain.image)
        .setFooter({ text: 'Continuez à explorer pour débloquer toutes les montagnes !' })
        .setTimestamp();

      // Send to notification channel if configured
      if (vocManager.notificationChannelId) {
        const notificationChannel = await guild.channels.fetch(vocManager.notificationChannelId).catch(() => null);
        if (notificationChannel && notificationChannel.isTextBased()) {
          await notificationChannel.send({ embeds: [embed] }).catch((err: unknown) => {
            console.error('[VocManager] Failed to send notification to channel:', err);
          });
          console.log(`[VocManager] Mountain unlock notification sent to channel ${vocManager.notificationChannelId} for user ${userId}: ${mountain.name}`);
        } else {
          console.log(`[VocManager] Notification channel ${vocManager.notificationChannelId} not found or not text-based`);
        }
      } else {
        console.log(`[VocManager] No notification channel configured. Mountain unlock: ${mountain.name} for user ${userId}`);
      }
    } catch (error) {
      console.error('[VocManager] Error sending mountain unlock notification:', error);
    }
  }

  static async getVocManager(guildId: string): Promise<IVocManager | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.vocManager || null;
  }

  /**
   * Crée une configuration VocManager pour une guilde
   */
  static async createVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    const vocManagerConfig: IVocManager = {
      enabled,
      joinChannels: [],
      createdChannels: [],
      channelCount: 0
    };

    guild.features = guild.features || {};
    guild.features.vocManager = vocManagerConfig;
    await guild.save();

    return vocManagerConfig;
  }

  /**
   * Récupère ou crée une configuration VocManager pour une guilde
   */
  static async getOrCreateVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    const vocManager = await this.getVocManager(guildId);
    if (vocManager) {
      return vocManager;
    }
    
    return this.createVocManager(guildId, enabled);
  }

  /**
   * Ajoute un canal à la liste des canaux créés
   */
  static async addChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    guild.features.vocManager.createdChannels.push(channelId);
    guild.features.vocManager.channelCount += 1;
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Supprime un canal de la liste des canaux créés
   */
  static async removeChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features?.vocManager) return null;

    guild.features.vocManager.createdChannels = guild.features.vocManager.createdChannels.filter(
      (id: string) => id !== channelId
    );
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Ajoute un canal de jointure avec ses paramètres
   */
  static async addJoinChannel(
    guildId: string, 
    channelId: string, 
    category: string,
    nameTemplate: string = '🎮 {username} #{count}'
  ): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    // Vérifier si ce canal existe déjà
    const existingIndex = guild.features.vocManager.joinChannels.findIndex(channel => channel.id === channelId);
    
    if (existingIndex !== -1) {
      // Mettre à jour le canal existant
      guild.features.vocManager.joinChannels[existingIndex] = {
        id: channelId,
        nameTemplate,
        category,
      };
    } else {
      // Ajouter un nouveau canal
      guild.features.vocManager.joinChannels.push({
        id: channelId,
        nameTemplate,
        category,
      });
    }

    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Supprime un canal de jointure
   */
  static async removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features?.vocManager) return null;

    guild.features.vocManager.joinChannels = guild.features.vocManager.joinChannels.filter(
      channel => channel.id !== channelId
    );
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Modifie les paramètres d'un canal de jointure spécifique
   */
  static async updateJoinChannelSettings(
    guildId: string, 
    channelId: string, 
    nameTemplate?: string,
    category?: string
  ): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features?.vocManager) return null;

    const channelIndex = guild.features.vocManager.joinChannels.findIndex(channel => channel.id === channelId);
    if (channelIndex === -1) return null;

    if (nameTemplate !== undefined) {
      guild.features.vocManager.joinChannels[channelIndex].nameTemplate = nameTemplate;
    }
    
    if (category !== undefined) {
      guild.features.vocManager.joinChannels[channelIndex].category = category;
    }

    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Met à jour le canal de notification pour les déverrouillages de montagnes
   */
  static async updateNotificationChannel(guildId: string, channelId: string | null): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    guild.features.vocManager.notificationChannelId = channelId || undefined;

    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Active ou désactive la fonctionnalité
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    guild.features.vocManager.enabled = enabled;
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Récupère les paramètres d'un canal de jointure spécifique
   */
  static async getJoinChannelSettings(
    guildId: string, 
    channelId: string
  ): Promise<IJoinChannel | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    const joinChannel = vocManagerData.joinChannels.find(channel => channel.id === channelId);
    return joinChannel || null;
  }

  /**
   * Gère l'événement quand un utilisateur rejoint un canal vocal
   */
  static async handleUserJoinChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      // Ignorer les bots
      if (newState.member?.user.bot) return;
      
      const guildId = newState.guild.id;
      
      // Récupérer la configuration du gestionnaire de canaux vocaux
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager || !vocManager.enabled) return;
      
      // Vérifier si le canal rejoint est un canal de jointure
      const joinChannel = vocManager.joinChannels.find(channel => channel.id === newState.channelId);
      
      if (joinChannel) {
        // Créer un nouveau canal vocal
        const username = newState.member?.user.username || 'Utilisateur';
        const channelNumber = vocManager.channelCount + 1;
        const mountainInfo = this.MOUNTAINS.length > 0
          ? this.MOUNTAINS[Math.floor(Math.random() * this.MOUNTAINS.length)]
          : null;

        let channelName = joinChannel.nameTemplate || '🎮 {username} #{count}';
        channelName = channelName
          .replace('{username}', username)
          .replace('{user}', username)
          .replace('{mountain}', mountainInfo?.name || 'Vocal')
          .replace('{count}', channelNumber.toString())
          .replace('{total}', channelNumber.toString());

        try {
          // Créer le canal vocal
          const newChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: joinChannel.category,
          });

          // Déplacer l'utilisateur dans le nouveau canal
          if (newState.member && newState.member.voice.channel) {
            await newState.member.voice.setChannel(newChannel).catch(error => {
              console.error('Erreur lors du déplacement de l\'utilisateur:', error);
            });
          }

          // Mettre à jour la base de données
          await this.addChannel(guildId, newChannel.id);

          if (mountainInfo) {
            // Associate the channel with the mountain
            this.setChannelMountain(newChannel.id, mountainInfo.id);

            // Start tracking the user's session in this channel
            this.startUserChannelSession(newState.member!.user.id, newChannel.id, mountainInfo.id);

            // Poster le message d'information sur la montagne
            try {
              const mountainEmbed = new EmbedBuilder()
                .setColor('#8B4513')
                .setAuthor({
                  name: 'Système de Montagnes',
                  iconURL: newState.guild.iconURL() || undefined
                })
                .setTitle(`⛰️ ${mountainInfo.name}`)
                .setDescription(mountainInfo.description)
                .addFields(
                  { name: '📏 Altitude', value: mountainInfo.altitude, inline: true },
                  { name: '🔗 En savoir plus', value: `[Wikipédia](${mountainInfo.wiki})`, inline: true }
                )
                .setImage(mountainInfo.image)
                .setTimestamp()
                .setFooter({ text: '🏔️ Restez 30 minutes pour débloquer cette montagne !' });

              await newChannel.send({ embeds: [mountainEmbed] });

              console.log(`[VocManager] Message de la montagne envoyé dans le vocal ${newChannel.name}`);
            } catch (error) {
              console.error('Erreur lors de la création du message de la montagne:', error);
            }
          }

          console.log(`[VocManager] Canal vocal créé: ${newChannel.name} pour ${username}`);
        } catch (error) {
          console.error('Erreur lors de la création du canal vocal:', error);
        }
      } else {
        // Check if user joined an existing created channel (not the join channel)
        const isCreatedChannel = vocManager.createdChannels.includes(newState.channelId || '');

        if (isCreatedChannel && newState.channelId) {
          // Get the mountain for this channel
          const mountainId = this.getChannelMountain(newState.channelId);

          if (mountainId) {
            // Start tracking this user's session
            this.startUserChannelSession(newState.member!.user.id, newState.channelId, mountainId);
          }
        }
      }
    } catch (error) {
      console.error('Erreur dans handleUserJoinChannel:', error);
    }
  }

  /**
   * Met à jour le message de configuration pour ajouter/retirer le select menu d'invitations
   */
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

      // Récupérer les messages du canal
      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      if (!messages) return;

      // Trouver le message de configuration
      const configMessage = messages.find(msg =>
        msg.embeds.length > 0 &&
        msg.embeds[0].title === '🎙️ Salon vocal créé !' &&
        msg.components.length > 0
      );

      if (!configMessage) return;

      // Mettre à jour l'embed
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

      const configButton = new ButtonBuilder()
        .setCustomId(`${VOC_CONFIG_BUTTON_ID}_${guildId}_${channelId}_${ownerId}`)
        .setLabel('⚙️ Configurer')
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(configButton);

      const components: ActionRowBuilder<ButtonBuilder | UserSelectMenuBuilder>[] = [
        buttonRow
      ];

      // Ajouter le select menu d'invitations seulement si le canal est privé
      if (isPrivate) {
        const userSelect = new UserSelectMenuBuilder()
          .setCustomId(`${VOC_INVITE_USER_SELECT_ID}_${guildId}_${channelId}_${ownerId}`)
          .setPlaceholder('➕ Sélectionner des utilisateurs à inviter')
          .setMinValues(1)
          .setMaxValues(10);

        const inviteRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
        components.push(inviteRow);
      }

      await configMessage.edit({
        embeds: [embed],
        components: components
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message de configuration:', error);
    }
  }

  /**
   * Check if a user should unlock a mountain based on their session duration
   * This should be called when a user leaves a voice channel
   */
  static async checkAndUnlockMountain(client: BotClient, userId: string, channelId: string, guildId: string): Promise<void> {
    try {
      // End the user's session and get the duration
      const session = this.endUserChannelSession(userId, channelId);
      if (!session) return;

      const REQUIRED_TIME_IN_SECONDS = 30; // 30 seconds for testing (normally 30 * 60)

      // If user spent enough time in this channel, unlock the mountain
      if (session.durationSeconds >= REQUIRED_TIME_IN_SECONDS) {
        await this.unlockMountain(userId, session.mountainId, guildId, client);
      } else {
        console.log(`[VocManager] User ${userId} spent ${session.durationSeconds}s in channel, needs ${REQUIRED_TIME_IN_SECONDS}s to unlock ${session.mountainId}`);
      }
    } catch (error) {
      console.error('[VocManager] Error checking mountain unlock:', error);
    }
  }

  /**
   * Gère l'événement quand un utilisateur quitte un canal vocal
   */
  static async handleUserLeaveChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      // Ignorer les bots
      if (oldState.member?.user.bot) return;

      const guildId = oldState.guild.id;
      const userId = oldState.member!.user.id;

      // Récupérer la configuration du gestionnaire de canaux vocaux
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager || !vocManager.enabled) return;

      // Vérifier si le canal quitté est un canal créé par le gestionnaire
      if (vocManager.createdChannels.includes(oldState.channelId || '')) {
        const channel = oldState.channel;

        // Check if the user should unlock a mountain
        await this.checkAndUnlockMountain(client, userId, oldState.channelId!, guildId);

        // Si le canal est vide, le supprimer
        if (channel && channel.members.size === 0) {
          try {
            await channel.delete();

            // Remove channel-mountain association
            this.removeChannelMountain(oldState.channelId!);

            // Mettre à jour la base de données
            await this.removeChannel(guildId, oldState.channelId || '');

            console.log(`[VocManager] Canal vocal supprimé: ${channel.name}`);
          } catch (error) {
            console.error('Erreur lors de la suppression du canal vocal:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur dans handleUserLeaveChannel:', error);
    }
  }
} 