import { BotClient } from '../../../bot/client';
import { PartyRepository } from './party.repository';
import { DiscordPartyService } from './discord.party.service';
import { PartyValidator } from './party.validator';
import { ImageUploadService } from '../../../shared/services/ImageUploadService';
import { PartyConfig } from '../models/partyConfig.model';
import { PartyEvent } from '../models/partyEvent.model';
import { LevelingService } from '../../leveling/services/leveling.service';
import { ChatGamingService } from '../../chat-gaming/services/chatGaming.service';
import { UserService } from '../../user/services/guildUser.service';
import { EmbedBuilder } from 'discord.js';
import { LogService } from '../../../shared/logs/logs.service';
import {
  CreateEventDTO,
  UpdateEventDTO,
  EventResponseDTO,
  ParticipantInfoDTO,
  EndEventDTO,
  ValidationError,
  NotFoundError
} from './party.types';
import GuildUserModel from '../../user/models/guild-user.model';
import GuildModel from '../../discord/models/guild.model';

export class PartyService {
  private repository: PartyRepository;
  
  constructor() {
    this.repository = new PartyRepository();
  }

  // Méthodes pour les event listeners
  static async handleReactionAdd(client: BotClient, messageId: string, userId: string): Promise<void> {
    const service = new PartyService();
    const event = await service.repository.findByMessageId(messageId);

    if (!event || event.status === 'ended' || 
        event.participants.length >= event.eventInfo.maxSlots || 
        event.participants.includes(userId)) {
      return;
    }

    try {
      await DiscordPartyService.addUserToThread(client, event, userId);
      const updatedEvent = await service.repository.addParticipant(event._id.toString(), userId);
      const embed = DiscordPartyService.createEventEmbed(updatedEvent, updatedEvent.discord.roleId);
      await DiscordPartyService.updateEventMessage(client, updatedEvent, embed);
    } catch (error) {
      console.error('[PARTY] Erreur réaction add:', error);
    }
  }

  static async handleReactionRemove(client: BotClient, messageId: string, userId: string): Promise<void> {
    const service = new PartyService();
    const event = await service.repository.findByMessageId(messageId);

    if (!event || event.status === 'ended' || !event.participants.includes(userId)) {
      return;
    }

    try {
      await DiscordPartyService.removeUserFromThread(client, event, userId);
      const updatedEvent = await service.repository.removeParticipant(event._id.toString(), userId);
      const embed = DiscordPartyService.createEventEmbed(updatedEvent, updatedEvent.discord.roleId);
      await DiscordPartyService.updateEventMessage(client, updatedEvent, embed);
    } catch (error) {
      console.error('[PARTY] Erreur réaction remove:', error);
    }
  }


  private formatEventForFrontend(event: PartyEvent): EventResponseDTO {
    const eventDate = new Date(event.eventInfo.dateTime);
    
    return {
      _id: event._id.toString(),
      name: event.eventInfo.name,
      game: event.eventInfo.game,
      description: event.eventInfo.description,
      date: eventDate.toISOString().split('T')[0],
      time: eventDate.toTimeString().slice(0, 5),
      maxSlots: event.eventInfo.maxSlots,
      currentSlots: event.participants.length,
      image: event.eventInfo.image,
      color: event.eventInfo.color,
      guildId: event.discord.guildId,
      channelId: event.discord.channelId,
      messageId: event.discord.messageId,
      threadId: event.discord.threadId,
      roleId: event.discord.roleId,
      participants: event.participants,
      createdBy: event.createdBy,
      status: event.status,
      attendedParticipants: event.attendedParticipants,
      rewardAmount: event.rewardAmount,
      xpAmount: event.xpAmount,
      startedAt: event.startedAt,
      endedAt: event.endedAt
    };
  }

  // Méthodes d'instance
  async createEvent(client: BotClient, data: CreateEventDTO): Promise<EventResponseDTO> {
    // Validation
    const validation = PartyValidator.validateCreateEvent(data);
    PartyValidator.throwIfInvalid(validation);

    // Upload d'image si nécessaire
    const imageUrl = data.image ? await ImageUploadService.uploadPartyImage(data.image as any) : undefined;

    // Créer l'événement en base
    const eventData = {
      eventInfo: {
        name: data.name,
        game: data.game,
        description: data.description,
        dateTime: data.dateTime,
        maxSlots: data.maxSlots,
        image: imageUrl,
        color: data.color || '#FF6B6B'
      },
      discord: {
        guildId: data.guildId,
        channelId: data.channelId
      },
      participants: [],
      createdBy: data.createdBy,
      chatGamingGameId: data.chatGamingGameId,
      status: 'pending' as const
    };

    const event = await this.repository.create(eventData);

    // Déterminer le rôle
    let roleId: string | undefined;
    if (event.chatGamingGameId) {
      const chatGamingGame = await ChatGamingService.getGameById(event.chatGamingGameId);
      roleId = chatGamingGame?.roleId;
    } else {
      const partyConfig = await this.getPartyConfig(event.discord.guildId);
      roleId = partyConfig?.defaultRoleId;
    }

    // Publier sur Discord
    const { channel } = await DiscordPartyService.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);
    const embed = DiscordPartyService.createEventEmbed(event, roleId);
    const { messageId, threadId } = await DiscordPartyService.publishEventMessage(channel as any, event, embed);

    // Mettre à jour avec les IDs Discord
    const updatedEvent = await this.repository.updateDiscordInfo(event._id.toString(), messageId, threadId, roleId);

    // Envoyer l'annonce si nécessaire
    if (data.announcementChannelId) {
      const threadUrl = `https://discord.com/channels/${event.discord.guildId}/${threadId}`;
      
      // Récupérer l'image du jeu si disponible
      let gameImageUrl: string | undefined;
      if (event.chatGamingGameId) {
        try {
          const { ChatGamingService } = require('../../chat-gaming/services/chatGaming.service');
          const chatGamingGame = await ChatGamingService.getGameById(event.chatGamingGameId);
          gameImageUrl = chatGamingGame?.image;
        } catch (error) {
          console.error('Erreur récupération image jeu:', error);
        }
      }
      
      await DiscordPartyService.sendAnnouncementMessage(client, updatedEvent, data.announcementChannelId, threadUrl, roleId, gameImageUrl);
    }

    // Logger la création de l'événement
    const logMessage = `**${updatedEvent.eventInfo.name}** - ${updatedEvent.eventInfo.game}\n\n` +
      `👤 **Créateur:** <@${data.createdBy}>\n` +
      `📅 **Date:** <t:${Math.floor(data.dateTime.getTime() / 1000)}:F>\n` +
      `👥 **Places:** ${data.maxSlots}\n` +
      `📍 **Channel:** <#${data.channelId}>`;

    await LogService.success(client, data.guildId, logMessage, { feature: 'party', title: 'Une soirée a été créée' });

    return this.formatEventForFrontend(updatedEvent);
  }

  async updateEvent(eventId: string, updates: UpdateEventDTO): Promise<EventResponseDTO> {
    const validation = PartyValidator.validateUpdateEvent(updates);
    PartyValidator.throwIfInvalid(validation);

    const updateData: any = {};
    
    if (updates.name) updateData['eventInfo.name'] = updates.name;
    if (updates.game) updateData['eventInfo.game'] = updates.game;
    if (updates.description !== undefined) updateData['eventInfo.description'] = updates.description;
    if (updates.dateTime) updateData['eventInfo.dateTime'] = updates.dateTime;
    if (updates.maxSlots) updateData['eventInfo.maxSlots'] = updates.maxSlots;
    if (updates.color) updateData['eventInfo.color'] = updates.color;
    if (updates.channelId) updateData['discord.channelId'] = updates.channelId;
    if (updates.chatGamingGameId !== undefined) updateData['chatGamingGameId'] = updates.chatGamingGameId;
    
    if (updates.image) {
      const imageUrl = await ImageUploadService.uploadPartyImage(updates.image as any);
      updateData['eventInfo.image'] = imageUrl;
    }

    const updatedEvent = await this.repository.update(eventId, updateData);
    return this.formatEventForFrontend(updatedEvent);
  }

  async getEventById(eventId: string): Promise<EventResponseDTO> {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }
    return this.formatEventForFrontend(event);
  }

  async getEventsByGuild(guildId: string): Promise<EventResponseDTO[]> {
    const events = await this.repository.findByGuild(guildId);
    return events.map(event => this.formatEventForFrontend(event));
  }

  async deleteEvent(eventId: string): Promise<void> {
    const success = await this.repository.delete(eventId);
    if (!success) {
      throw new NotFoundError('Événement non trouvé');
    }
  }

  async startEvent(eventId: string): Promise<EventResponseDTO> {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }
    if (event.status !== 'pending') {
      throw new ValidationError('Événement déjà démarré ou terminé');
    }

    const updatedEvent = await this.repository.update(eventId, { 
      status: 'started', 
      startedAt: new Date() 
    });
    return this.formatEventForFrontend(updatedEvent);
  }

  async endEvent(eventId: string, data: EndEventDTO): Promise<EventResponseDTO> {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }
    if (event.status !== 'started') {
      throw new ValidationError('Événement doit être démarré avant d\'être terminé');
    }

    // Validation des participants présents
    const invalidParticipants = data.attendedParticipants.filter(id => 
      !event.participants.includes(id)
    );
    if (invalidParticipants.length > 0) {
      throw new ValidationError('Certains participants présents ne sont pas dans la liste originale');
    }

    const validation = PartyValidator.validateRewards(data.rewardAmount, data.xpAmount);
    PartyValidator.throwIfInvalid(validation);

    const updatedEvent = await this.repository.update(eventId, {
      status: 'ended',
      endedAt: new Date(),
      attendedParticipants: data.attendedParticipants,
      rewardAmount: data.rewardAmount || 0,
      xpAmount: data.xpAmount || 0
    });

    return this.formatEventForFrontend(updatedEvent);
  }

  async getParticipantsInfo(client: BotClient, eventId: string): Promise<ParticipantInfoDTO[]> {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const participantsInfo: ParticipantInfoDTO[] = [];
    const guild = await client.guilds.fetch(event.discord.guildId);

    for (const participantId of event.participants) {
      try {
        const member = await guild.members.fetch(participantId);
        participantsInfo.push({
          id: participantId,
          name: member.user.username,
          displayName: member.displayName || member.user.displayName
        });
      } catch (error) {
        console.error(`Erreur récupération utilisateur ${participantId}:`, error);
      }
    }

    return participantsInfo;
  }

  static async isPartyChannel(channelId: string): Promise<{ isParty: boolean; event?: PartyEvent }> {
    const repository = new PartyRepository();
    const event = await repository.findByChannel(channelId);
    return { isParty: !!event, event: event || undefined };
  }

  async getPartyConfig(guildId: string): Promise<PartyConfig | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.party || null;
  }

  private async _updateEventEmbed(client: BotClient, event: PartyEvent): Promise<void> {
    try {
      const embed = DiscordPartyService.createEventEmbed(event, event.discord.roleId);
      await DiscordPartyService.updateEventMessage(client, event, embed);
    } catch (error) {
      console.error('[PARTY] Erreur mise à jour embed:', error);
    }
  }

  async finishEventWithRewards(client: BotClient, eventId: string, data: EndEventDTO): Promise<EventResponseDTO> {
    const result = await this.endEvent(eventId, data);
    const event = await this.repository.findById(eventId);
    
    if (!event) return result;

    // Actions Discord
    await DiscordPartyService.removeAllReactions(client, event);
    await DiscordPartyService.archiveThread(client, event);
    
    if (data.attendedParticipants.length > 0 && (data.rewardAmount! > 0 || data.xpAmount! > 0)) {
      console.log('[PARTY] Distribution des rewards en cours...');
      await this.distributeRewards(client, event, data.attendedParticipants, data.rewardAmount || 0, data.xpAmount || 0);
    } else {
      console.log('[PARTY] Aucune distribution de rewards (conditions non remplies)');
    }

    return result;
  }

  private async distributeRewards(client: BotClient, event: PartyEvent, attendedParticipants: string[], rewardAmount: number, xpAmount: number): Promise<void> {
    if (attendedParticipants.length === 0 || (rewardAmount <= 0 && xpAmount <= 0)) return;

    const moneyPerParticipant = rewardAmount > 0 ? Math.floor(rewardAmount / attendedParticipants.length) : 0;
    const xpPerParticipant = xpAmount > 0 ? Math.floor(xpAmount / attendedParticipants.length) : 0;

    for (const participantId of attendedParticipants) {
      try {
        let user = await GuildUserModel.findOne({ discordId: participantId, guildId: event.discord.guildId });
        
        // Créer l'utilisateur s'il n'existe pas
        if (!user) {
          try {
            const guild = await client.guilds.fetch(event.discord.guildId);
            const discordUser = await client.users.fetch(participantId);
            user = await UserService.createGuildUser(discordUser, guild);
          } catch (createError) {
            console.error(`[PARTY] Impossible de créer l'utilisateur ${participantId}:`, createError);
            continue;
          }
        }

        if (moneyPerParticipant > 0) {
          user.profil.money += moneyPerParticipant;
          await user.save();
        }

        if (xpPerParticipant > 0) {
          const mockMessage = { 
            guild: { id: event.discord.guildId }, 
            author: { id: participantId },
            react: () => Promise.resolve() // Mock react method pour éviter les erreurs
          };
          // Utiliser la nouvelle méthode qui gère XP + level up
          await LevelingService.giveXpToUser(client, mockMessage as any, xpPerParticipant);
        } else if (moneyPerParticipant === 0) {
          // Sauvegarder si seulement de l'argent mais pas d'XP
          await user.save();
        }
      } catch (error) {
        console.error(`[PARTY] Erreur distribution ${participantId}:`, error);
      }
    }

    // Envoyer l'embed de rewards dans le thread
    await this.sendRewardsEmbed(client, event, attendedParticipants, moneyPerParticipant, xpPerParticipant, rewardAmount, xpAmount);
  }

  private async sendRewardsEmbed(client: BotClient, event: PartyEvent, attendedParticipants: string[], moneyPerParticipant: number, xpPerParticipant: number, totalMoney: number, totalXp: number): Promise<void> {
    try {
      if (!event.discord.threadId) return;

      const thread = await client.channels.fetch(event.discord.threadId);
      if (!thread || !thread.isThread()) return;

      const participantMentions = attendedParticipants.map(id => `<@${id}>`);
      
      const embed = new EmbedBuilder()
        .setTitle('🎉 Merci d\'avoir participé !')
        .setDescription(`La soirée **${event.eventInfo.name}** est terminée !`)
        .setColor((event.eventInfo.color as any) || '#FF6B6B')
        .addFields(
          {
            name: '👥 Participants présents',
            value: participantMentions.join(', ') || 'Aucun',
            inline: false
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Système de récompenses' });

      if (totalMoney > 0) {
        embed.addFields({
          name: '💰 Argent distribué',
          value: `**${moneyPerParticipant}** 💰 par personne\n(Total: ${totalMoney} 💰)`,
          inline: true
        });
      }

      if (totalXp > 0) {
        embed.addFields({
          name: '⭐ XP distribué',
          value: `**${xpPerParticipant}** XP par personne\n(Total: ${totalXp} XP)`,
          inline: true
        });
      }

      await thread.send({ embeds: [embed] });
      
    } catch (error) {
      console.error('[PARTY] Erreur envoi embed rewards:', error);
    }
  }

  // Méthodes statiques pour anciennes routes
  static async getEventById(eventId: string): Promise<PartyEvent | null> {
    const repository = new PartyRepository();
    return repository.findById(eventId);
  }

  static async getEventByIdFormatted(eventId: string): Promise<EventResponseDTO | null> {
    try {
      const service = new PartyService();
      return await service.getEventById(eventId);
    } catch (error) {
      return null;
    }
  }

  static async getEventsByGuild(guildId: string): Promise<EventResponseDTO[]> {
    const service = new PartyService();
    return service.getEventsByGuild(guildId);
  }

  static async findByMessageId(messageId: string): Promise<PartyEvent | null> {
    const repository = new PartyRepository();
    return repository.findByMessageId(messageId);
  }


  static async addParticipant(eventId: string, userId: string): Promise<PartyEvent | null> {
    try {
      const repository = new PartyRepository();
      return await repository.addParticipant(eventId, userId);
    } catch (error) {
      return null;
    }
  }

  static async removeParticipant(eventId: string, userId: string): Promise<PartyEvent | null> {
    try {
      const repository = new PartyRepository();
      return await repository.removeParticipant(eventId, userId);
    } catch (error) {
      return null;
    }
  }

  static async updateEvent(eventId: string, updates: any): Promise<PartyEvent | null> {
    try {
      const repository = new PartyRepository();
      return await repository.update(eventId, updates);
    } catch (error) {
      return null;
    }
  }

  static async updateEventFormatted(eventId: string, updates: any): Promise<EventResponseDTO | null> {
    try {
      const service = new PartyService();
      await service.updateEvent(eventId, updates);
      return await service.getEventById(eventId);
    } catch (error) {
      return null;
    }
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const service = new PartyService();
      await service.deleteEvent(eventId);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async createEventInDiscord(client: BotClient, eventData: any, announcementChannelId?: string): Promise<EventResponseDTO> {
    const service = new PartyService();
    const createData: CreateEventDTO = {
      name: eventData.eventInfo.name,
      game: eventData.eventInfo.game,
      description: eventData.eventInfo.description,
      dateTime: eventData.eventInfo.dateTime,
      maxSlots: eventData.eventInfo.maxSlots,
      image: eventData.eventInfo.image,
      color: eventData.eventInfo.color,
      guildId: eventData.discord.guildId,
      channelId: eventData.discord.channelId,
      createdBy: eventData.createdBy,
      chatGamingGameId: eventData.chatGamingGameId,
      announcementChannelId
    };
    
    return service.createEvent(client, createData);
  }

  static async updateEventEmbed(client: BotClient, event: PartyEvent): Promise<void> {
    const embed = DiscordPartyService.createEventEmbed(event, event.discord.roleId);
    await DiscordPartyService.updateEventMessage(client, event, embed);
  }

  static async removeEventReactions(client: BotClient, event: PartyEvent): Promise<void> {
    await DiscordPartyService.removeAllReactions(client, event);
  }

  static async renameEventThreadAsEnded(client: BotClient, event: PartyEvent): Promise<void> {
    await DiscordPartyService.archiveThread(client, event);
  }

  static async distributeRewards(client: BotClient, event: PartyEvent, attendedParticipants: string[], rewardAmount: number, xpAmount: number): Promise<void> {
    const service = new PartyService();
    await service.distributeRewards(client, event, attendedParticipants, rewardAmount, xpAmount);
  }

}