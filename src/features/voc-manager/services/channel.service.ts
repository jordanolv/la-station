import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, UserSelectMenuBuilder, VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { VOC_CONFIG_BUTTON_ID, VOC_INVITE_USER_SELECT_ID } from '../constants/vocManager.constants';
import { VocManagerRepository } from '../repositories/vocManager.repository';
import { MountainService } from './mountain.service';

export class ChannelService {
  // ─── Join event ────────────────────────────────────────────────────────────

  static async handleJoin(client: BotClient, _oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (newState.member?.user.bot) return;

    const guildId = newState.guild.id;
    const vocManager = await VocManagerRepository.get(guildId);
    if (!vocManager?.enabled) return;

    const joinChannel = vocManager.joinChannels.find(c => c.id === newState.channelId);

    if (joinChannel) {
      await this.createUserChannel(client, newState, guildId, joinChannel, vocManager.channelCount);
    } else if (newState.channelId && vocManager.createdChannels.includes(newState.channelId)) {
      // User joined an already-created channel — start tracking
      const mountainId = MountainService.getChannelMountain(newState.channelId);
      if (mountainId) {
        MountainService.startSession(newState.member!.user.id, newState.channelId, mountainId);
      }
    }
  }

  // ─── Leave event ───────────────────────────────────────────────────────────

  static async handleLeave(client: BotClient, oldState: VoiceState, _newState: VoiceState): Promise<void> {
    if (oldState.member?.user.bot) return;

    const guildId = oldState.guild.id;
    const userId = oldState.member!.user.id;
    const channelId = oldState.channelId!;

    const vocManager = await VocManagerRepository.get(guildId);
    if (!vocManager?.enabled || !vocManager.createdChannels.includes(channelId)) return;

    await MountainService.checkAndUnlock(client, userId, channelId, guildId);

    const channel = oldState.channel;
    if (channel && channel.members.size === 0) {
      try {
        await channel.delete();
        MountainService.dissociateChannel(channelId);
        await VocManagerRepository.removeCreatedChannel(guildId, channelId);
        console.log(`[ChannelService] Canal supprimé: ${channel.name}`);
      } catch (err) {
        console.error('[ChannelService] Erreur suppression canal:', err);
      }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private static async createUserChannel(
    _client: BotClient,
    newState: VoiceState,
    guildId: string,
    joinChannel: { id: string; category: string; nameTemplate: string },
    channelCount: number
  ): Promise<void> {
    const username = newState.member?.user.username ?? 'Utilisateur';
    const mountain = MountainService.getRandom();

    const channelName = (joinChannel.nameTemplate ?? '🎮 {username} #{count}')
      .replace('{username}', username)
      .replace('{user}', username)
      .replace('{mountain}', mountain?.name ?? 'Vocal')
      .replace('{count}', (channelCount + 1).toString())
      .replace('{total}', (channelCount + 1).toString());

    try {
      const newChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: joinChannel.category,
      });

      if (newState.member?.voice.channel) {
        await newState.member.voice.setChannel(newChannel).catch(err => {
          console.error('[ChannelService] Erreur déplacement utilisateur:', err);
        });
      }

      await VocManagerRepository.addCreatedChannel(guildId, newChannel.id);

      if (mountain) {
        MountainService.associateChannel(newChannel.id, mountain.id);
        MountainService.startSession(newState.member!.user.id, newChannel.id, mountain.id);
        await this.postMountainEmbed(newChannel, mountain);
      }

      console.log(`[ChannelService] Canal créé: ${newChannel.name} pour ${username}`);
    } catch (err) {
      console.error('[ChannelService] Erreur création canal:', err);
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
    } catch (err) {
      console.error('[ChannelService] Erreur mise à jour message config:', err);
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private static async postMountainEmbed(
    channel: import('discord.js').VoiceChannel,
    mountain: import('./mountain.service').MountainInfo
  ): Promise<void> {
    try {
      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle(`⛰️ ${mountain.name}`)
        .setDescription(mountain.description)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '🔗 En savoir plus', value: `[Wikipédia](${mountain.wiki})`, inline: true }
        )
        .setImage(mountain.image)
        .setTimestamp()
        .setFooter({ text: `🏔️ Restez 30 minutes pour débloquer cette montagne !` });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[ChannelService] Erreur envoi embed montagne:', err);
    }
  }
}
