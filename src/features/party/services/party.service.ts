import { BotClient } from '../../../bot/client';
import { PartyRepository } from './party.repository';
import { DiscordPartyService } from './discord.party.service';
import { ChatGamingService } from '../../chat-gaming/services/chat-gaming.service';
import { UserService } from '../../user/services/user.service';
import { EmbedBuilder } from 'discord.js';
import { LogService } from '../../../shared/logs/logs.service';
import { NotFoundError } from './party.types';
import { PartyEvent } from '../models/party-event.model';
import UserModel from '../../user/models/user.model';
import AppConfigModel from '../../discord/models/app-config.model';
import { getGuildId } from '../../../shared/guild';
import { LevelingService } from '../../leveling/services/leveling.service';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';

export interface CreateEventInput {
  name: string;
  game: string;
  description?: string;
  dateTime: Date;
  maxSlots: number;
  color?: string;
  image?: string;
  channelId: string;
  createdBy: string;
  chatGamingGameId?: string;
  announcementChannelId?: string;
}

export interface EndEventInput {
  attendedParticipants: string[];
  rewardAmount?: number;
  xpAmount?: number;
}

export class PartyService {
  private static repo = new PartyRepository();

  static async getPartyConfig() {
    const guild = await AppConfigModel.findOne({});
    return guild?.features?.party || null;
  }

  // ─── Discord event handlers ────────────────────────────────────────────────

  static async handleReactionAdd(client: BotClient, messageId: string, userId: string): Promise<void> {
    const event = await this.repo.findByMessageId(messageId);
    if (!event || event.status === 'ended' ||
        event.participants.length >= event.eventInfo.maxSlots ||
        event.participants.includes(userId)) return;

    try {
      await DiscordPartyService.addUserToThread(client, event, userId);
      const updated = await this.repo.addParticipant(event._id.toString(), userId);
      const embed = DiscordPartyService.createEventEmbed(updated, updated.discord.roleId);
      await DiscordPartyService.updateEventMessage(client, updated, embed);

      const logMessage = `**${event.eventInfo.name}** — ${event.eventInfo.game}\n` +
        `<@${userId}> a rejoint · ${updated.participants.length}/${event.eventInfo.maxSlots} places`;
      await LogService.info(client, logMessage, { feature: 'party', title: 'Participant ajouté' });
      await ConfigPanelService.refreshPanel(client, 'party');
    } catch (err) {
      console.error('[Party] Erreur réaction add:', err);
    }
  }

  static async handleReactionRemove(client: BotClient, messageId: string, userId: string): Promise<void> {
    const event = await this.repo.findByMessageId(messageId);
    if (!event || event.status === 'ended' || !event.participants.includes(userId)) return;

    try {
      await DiscordPartyService.removeUserFromThread(client, event, userId);
      const updated = await this.repo.removeParticipant(event._id.toString(), userId);
      const embed = DiscordPartyService.createEventEmbed(updated, updated.discord.roleId);
      await DiscordPartyService.updateEventMessage(client, updated, embed);

      const logMessage = `**${event.eventInfo.name}** — ${event.eventInfo.game}\n` +
        `<@${userId}> a quitté · ${updated.participants.length}/${event.eventInfo.maxSlots} places`;
      await LogService.info(client, logMessage, { feature: 'party', title: 'Participant retiré' });
      await ConfigPanelService.refreshPanel(client, 'party');
    } catch (err) {
      console.error('[Party] Erreur réaction remove:', err);
    }
  }

  static async isPartyChannel(channelId: string): Promise<{ isParty: boolean; event?: PartyEvent }> {
    const event = await this.repo.findByChannel(channelId);
    return { isParty: !!event, event: event || undefined };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  static async createEvent(client: BotClient, data: CreateEventInput): Promise<PartyEvent> {
    const eventData = {
      eventInfo: {
        name: data.name,
        game: data.game,
        description: data.description,
        dateTime: data.dateTime,
        maxSlots: data.maxSlots,
        color: data.color || '#FF6B6B',
        image: data.image,
      },
      discord: { channelId: data.channelId },
      participants: [],
      createdBy: data.createdBy,
      chatGamingGameId: data.chatGamingGameId,
      status: 'pending' as const,
    };

    const event = await this.repo.create(eventData);

    let roleId: string | undefined;
    if (event.chatGamingGameId) {
      const chatGame = await ChatGamingService.getGameById(event.chatGamingGameId);
      roleId = chatGame?.roleId;
    } else {
      const partyConfig = await this.getPartyConfig();
      roleId = partyConfig?.defaultRoleId;
    }

    const { channel } = await DiscordPartyService.getGuildAndChannel(client, event.discord.channelId);
    const embed = DiscordPartyService.createEventEmbed(event, roleId);
    const { messageId, threadId } = await DiscordPartyService.publishEventMessage(channel as any, event, embed);
    const updated = await this.repo.updateDiscordInfo(event._id.toString(), messageId, threadId, roleId);

    if (data.announcementChannelId) {
      const threadUrl = `https://discord.com/channels/${getGuildId()}/${threadId}`;
      let gameImageUrl: string | undefined;
      if (event.chatGamingGameId) {
        const chatGame = await ChatGamingService.getGameById(event.chatGamingGameId);
        gameImageUrl = chatGame?.image;
      }
      const announcementMessageId = await DiscordPartyService.sendAnnouncementMessage(client, updated, data.announcementChannelId, threadUrl, roleId, gameImageUrl);
      if (announcementMessageId) {
        await this.repo.updateDiscordInfo(updated._id.toString(), undefined, undefined, undefined, announcementMessageId, data.announcementChannelId);
      }
    }

    const logMessage = `**${updated.eventInfo.name}** — ${updated.eventInfo.game}\n` +
      `👤 <@${data.createdBy}> · 📅 <t:${Math.floor(data.dateTime.getTime() / 1000)}:F> · 👥 ${data.maxSlots} places`;
    await LogService.success(client, logMessage, { feature: 'party', title: 'Soirée créée' });

    return updated;
  }

  static async getActiveEvents(): Promise<PartyEvent[]> {
    return this.repo.findActiveEvents();
  }

  static async getEventById(eventId: string): Promise<PartyEvent | null> {
    return this.repo.findById(eventId);
  }

  static async deleteEvent(client: BotClient, eventId: string): Promise<void> {
    const event = await this.repo.findById(eventId);
    if (!event) throw new NotFoundError('Événement non trouvé');
    await Promise.all([
      DiscordPartyService.deleteThread(client, event),
      DiscordPartyService.deleteAnnouncementMessage(client, event),
    ]);
    await this.repo.delete(eventId);

    const logMessage = `**${event.eventInfo.name}** — ${event.eventInfo.game}\n` +
      `👥 ${event.participants.length} participant(s) inscrit(s)`;
    await LogService.error(client, logMessage, { feature: 'party', title: 'Soirée supprimée' });
  }

  static async endEvent(client: BotClient, eventId: string, data: EndEventInput): Promise<PartyEvent> {
    const event = await this.repo.findById(eventId);
    if (!event) throw new NotFoundError('Événement non trouvé');

    const updated = await this.repo.update(eventId, {
      status: 'ended',
      endedAt: new Date(),
      attendedParticipants: data.attendedParticipants,
      rewardAmount: data.rewardAmount ?? 0,
      xpAmount: data.xpAmount ?? 0,
    });

    if (data.attendedParticipants.length > 0) {
      await this.distributeRewards(client, updated, data.attendedParticipants, data.rewardAmount ?? 0, data.xpAmount ?? 0);
    }

    await DiscordPartyService.removeAllReactions(client, updated);
    await DiscordPartyService.archiveThread(client, updated);

    const attendedList = data.attendedParticipants.length > 0
      ? data.attendedParticipants.map(id => `<@${id}>`).join(', ')
      : '*aucun*';
    const rewardLine = [
      data.rewardAmount ? `💰 ${data.rewardAmount}/pers` : null,
      data.xpAmount ? `⭐ ${data.xpAmount} XP/pers` : null,
    ].filter(Boolean).join(' · ') || 'Aucune récompense';
    const logMessage = `**${event.eventInfo.name}** — ${event.eventInfo.game}\n` +
      `👥 Présents : ${attendedList}\n${rewardLine}`;
    await LogService.info(client, logMessage, { feature: 'party', title: 'Soirée terminée' });

    return updated;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private static async distributeRewards(
    client: BotClient,
    event: PartyEvent,
    attendedParticipants: string[],
    rewardAmount: number,
    xpAmount: number,
  ): Promise<void> {
    for (const participantId of attendedParticipants) {
      try {
        let user = await UserModel.findOne({ discordId: participantId });
        if (!user) {
          const guild = await client.guilds.fetch(getGuildId());
          const discordUser = await client.users.fetch(participantId);
          user = await UserService.createUser(discordUser, guild);
        }

        if (rewardAmount > 0) {
          user.profil.money += rewardAmount;
          await user.save();
        }

        if (xpAmount > 0) {
          const mockMessage = { guild: { id: getGuildId() }, author: { id: participantId }, react: () => Promise.resolve() };
          await LevelingService.giveXpToUser(client, mockMessage as any, xpAmount);
        }

        await UserModel.findOneAndUpdate({ discordId: participantId }, { $inc: { 'stats.partyParticipated': 1 } });
      } catch (err) {
        console.error(`[Party] Erreur distribution ${participantId}:`, err);
      }
    }

    await this.sendRewardsEmbed(client, event, attendedParticipants, rewardAmount, xpAmount);
  }

  private static async sendRewardsEmbed(
    client: BotClient,
    event: PartyEvent,
    attendedParticipants: string[],
    moneyPerParticipant: number,
    xpPerParticipant: number,
  ): Promise<void> {
    try {
      if (!event.discord.threadId) return;
      const thread = await client.channels.fetch(event.discord.threadId);
      if (!thread?.isThread()) return;

      const embed = new EmbedBuilder()
        .setTitle('🎉 Merci d\'avoir participé !')
        .setDescription(`La soirée **${event.eventInfo.name}** est terminée !`)
        .setColor((event.eventInfo.color as any) || '#FF6B6B')
        .addFields({ name: '👥 Participants présents', value: attendedParticipants.map(id => `<@${id}>`).join(', ') || 'Aucun' })
        .setTimestamp();

      if (moneyPerParticipant > 0) {
        embed.addFields({ name: '💰 Argent', value: `**${moneyPerParticipant}** 💰 / personne`, inline: true });
      }
      if (xpPerParticipant > 0) {
        embed.addFields({ name: '⭐ XP', value: `**${xpPerParticipant}** XP / personne`, inline: true });
      }

      await thread.send({ embeds: [embed] });
    } catch (err) {
      console.error('[Party] Erreur embed rewards:', err);
    }
  }
}
