import { ChannelType, EmbedBuilder, ForumChannel, AttachmentBuilder } from 'discord.js';
import { BotClient } from '../../../bot/client';
import PartyItemModel, { IEvent } from '../models/partyItem.model';
import GuildModel from '../../discord/models/guild.model';
import { IParty } from '../models/partyConfig.model';
import path from 'path';

export class PartyService {
  // Helper pour récupérer guild et channel Discord
  private static async getGuildAndChannel(client: BotClient, guildId: string, channelId: string) {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    return { guild, channel };
  }

  // Helper pour récupérer un message Discord (forum uniquement)
  private static async getDiscordMessage(client: BotClient, event: IEvent) {
    const { channel } = await this.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);
    const forumChannel = channel as ForumChannel;
    const eventThread = await this.findEventThread(forumChannel, event.eventInfo.name, event.discord.messageId!);
    return eventThread ? await eventThread.fetchStarterMessage() : null;
  }

  // Helper pour convertir les chemins d'images en URLs complètes
  private static getFullImageUrl(imagePath?: string): string | undefined {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3051';
    return `${baseUrl}${imagePath}`;
  }

  // Helper pour formater les événements pour le frontend
  private static formatEventForFrontend(event: IEvent): any {
    const eventDate = new Date(event.eventInfo.dateTime);
    
    return {
      _id: event._id,
      name: event.eventInfo.name,
      game: event.eventInfo.game,
      description: event.eventInfo.description,
      date: eventDate.toISOString().split('T')[0], // Format YYYY-MM-DD
      time: eventDate.toTimeString().slice(0, 5), // Format HH:MM
      maxSlots: event.eventInfo.maxSlots,
      currentSlots: event.participants.length,
      image: this.getFullImageUrl(event.eventInfo.image),
      color: event.eventInfo.color,
      guildId: event.discord.guildId,
      channelId: event.discord.channelId,
      messageId: event.discord.messageId,
      roleId: event.discord.roleId,
      participants: event.participants,
      createdBy: event.createdBy,
      // Nouveaux champs pour la gestion du cycle de vie
      status: event.status || 'pending',
      attendedParticipants: event.attendedParticipants || [],
      rewardAmount: event.rewardAmount,
      startedAt: event.startedAt,
      endedAt: event.endedAt
    };
  }

  // Helper pour formater les participants
  private static formatParticipants(participants: string[], maxSlots: number): { count: string; list: string } {
    const count = `${participants.length}/${maxSlots}`;
    const list = participants.length > 0 
      ? participants.map(userId => `<@${userId}>`).join('\n')
      : 'Aucun participant pour le moment';
    
    return { count, list };
  }

  // Créer l'embed pour un événement
  private static createEventEmbed(event: IEvent, roleId?: string): EmbedBuilder {
    const participantInfo = this.formatParticipants(event.participants, event.eventInfo.maxSlots);
    
    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${event.eventInfo.name}`)
      .addFields([
        { name: '🎮 Jeu', value: event.eventInfo.game, inline: true },
        { name: '📅 Date', value: new Date(event.eventInfo.dateTime).toLocaleDateString('fr-FR'), inline: true },
        { name: '⏰ Heure', value: new Date(event.eventInfo.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), inline: true },
        { name: `👥 Participants (${participantInfo.count})`, value: participantInfo.list, inline: false }
      ])
      .setColor(event.eventInfo.color ? parseInt(event.eventInfo.color.replace('#', ''), 16) : 0xFF6B6B)
      .setFooter({ text: 'Réagissez avec 🎉 pour participer à cet événement !' })
      .setTimestamp();

      // Construire la description avec mention du rôle si disponible
      let description = '';
      if (roleId) {
        description += `🎭 <@&${roleId}>\n\n`;
      }
      if (event.eventInfo.description) {
        description += event.eventInfo.description;
      }
      
      if (description) {
        embed.setDescription(description);
      }

    // Ajouter l'image à l'embed si présente
    if (event.eventInfo.image) {
      if (event.eventInfo.image.startsWith('http')) {
        // URL complète
        embed.setImage(event.eventInfo.image);
      } else if (event.eventInfo.image.startsWith('/uploads/')) {
        // URL relative - convertir en URL absolue
        const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3051';
        embed.setImage(`${API_BASE_URL}${event.eventInfo.image}`);
      }
    }

    return embed;
  }


  // Helper pour trouver le thread d'un événement dans un forum
  private static async findEventThread(forumChannel: ForumChannel, eventName: string, messageId: string): Promise<any> {
    // Chercher dans les threads actifs
    const threads = await forumChannel.threads.fetchActive();
    let eventThread = threads.threads.find(thread => 
      thread.name.includes(eventName)
    );

    // Si pas trouvé dans les threads actifs, chercher dans les archivés
    if (!eventThread) {
      const archivedThreads = await forumChannel.threads.fetchArchived();
      eventThread = archivedThreads.threads.find(thread => 
        thread.name.includes(eventName)
      );
    }

    // Vérifier que c'est bien le bon thread en comparant le messageId du starter
    if (eventThread) {
      try {
        const starterMessage = await eventThread.fetchStarterMessage();
        if (starterMessage?.id !== messageId) {
          console.log(`[PARTY] MessageId mismatch: attendu ${messageId}, trouvé ${starterMessage?.id}`);
          return null;
        }
      } catch (error) {
        console.error(`[PARTY] Erreur vérification starter message:`, error);
        return null;
      }
    }

    return eventThread;
  }

  // Publier le message d'événement (forum uniquement)
  private static async publishEventMessage(channel: ForumChannel, event: IEvent, embed: EmbedBuilder): Promise<string> {
    const messageOptions = {
      embeds: [embed]
    };

    const thread = await channel.threads.create({
      name: `🎉 ${event.eventInfo.name} - ${new Date(event.eventInfo.dateTime).toLocaleDateString('fr-FR')}`,
      message: messageOptions
    });
    
    const messageToReact = await thread.fetchStarterMessage();
    const messageId = messageToReact?.id || thread.lastMessageId!;

    // Ajouter la réaction par défaut
    if (messageToReact) {
      await messageToReact.react('🎉').catch(() => {});
    }

    return messageId;
  }

  // Vérifier si un channel est un party channel actif
  static async isPartyChannel(channelId: string): Promise<{ isParty: boolean; event?: IEvent }> {
    const event = await PartyItemModel.findOne({ 'discord.channelId': channelId });
    return { isParty: !!event, event: event || undefined };
  }


  // Configuration des soirées par serveur
  static async getPartyConfig(guildId: string): Promise<IParty | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.party || null;
  }

  // CRUD des événements
  static async getEventById(eventId: string): Promise<IEvent | null> {
    return PartyItemModel.findById(eventId);
  }

  // Version formatée pour le frontend
  static async getEventByIdFormatted(eventId: string): Promise<any | null> {
    const event = await PartyItemModel.findById(eventId);
    return event ? this.formatEventForFrontend(event) : null;
  }

  static async getEventsByGuild(guildId: string): Promise<any[]> {
    const events = await PartyItemModel.find({ 'discord.guildId': guildId }).sort({ 'eventInfo.dateTime': 1 });
    
    // Formater les événements pour le frontend
    return events.map(event => this.formatEventForFrontend(event));
  }

  static async createEvent(eventData: Partial<IEvent>): Promise<IEvent> {
    return PartyItemModel.create(eventData);
  }

  static async updateEvent(eventId: string, updates: Partial<IEvent>): Promise<IEvent | null> {
    return PartyItemModel.findByIdAndUpdate(eventId, updates, { new: true });
  }

  // Méthode atomique pour ajouter un participant (évite les races)
  static async addParticipant(eventId: string, userId: string): Promise<IEvent | null> {
    return PartyItemModel.findByIdAndUpdate(
      eventId,
      { $addToSet: { participants: userId } }, // $addToSet évite les doublons
      { new: true }
    );
  }

  // Méthode atomique pour retirer un participant
  static async removeParticipant(eventId: string, userId: string): Promise<IEvent | null> {
    return PartyItemModel.findByIdAndUpdate(
      eventId,
      { $pull: { participants: userId } },
      { new: true }
    );
  }

  // Version formatée pour le frontend
  static async updateEventFormatted(eventId: string, updates: Partial<IEvent>): Promise<any | null> {
    const event = await PartyItemModel.findByIdAndUpdate(eventId, updates, { new: true });
    return event ? this.formatEventForFrontend(event) : null;
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    const result = await PartyItemModel.findByIdAndDelete(eventId);
    return !!result;
  }

  static async findByMessageId(messageId: string): Promise<IEvent | null> {
    return PartyItemModel.findOne({ 'discord.messageId': messageId });
  }

  // Protection contre les doubles créations
  static async findRecentDuplicate(guildId: string, eventName: string, createdBy: string): Promise<IEvent | null> {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    
    return PartyItemModel.findOne({
      'discord.guildId': guildId,
      'eventInfo.name': eventName,
      'createdBy': createdBy,
      'createdAt': { $gte: thirtySecondsAgo }
    });
  }

  // Intégration Discord
  static async createEventInDiscord(client: BotClient, eventData: Partial<IEvent>): Promise<any> {
    const event = await this.createEvent(eventData);
    const { channel } = await this.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);

    // Déterminer le rôle à utiliser
    let roleId: string | undefined;
    if (event.chatGamingGameId) {
      const { ChatGamingService } = require('../../chat-gaming/services/chatGaming.service');
      const chatGamingGame = await ChatGamingService.getGameById(event.chatGamingGameId);
      roleId = chatGamingGame?.roleId;
    } else {
      const partyConfig = await this.getPartyConfig(event.discord.guildId);
      roleId = partyConfig?.defaultRoleId;
    }

    // Publier l'événement dans le forum
    const embed = this.createEventEmbed(event, roleId);
    const messageId = await this.publishEventMessage(channel as ForumChannel, event, embed);

    // Mettre à jour avec les IDs Discord
    const updateData: any = { 'discord.messageId': messageId };
    if (roleId) updateData['discord.roleId'] = roleId;
    
    const updatedEvent = await PartyItemModel.findByIdAndUpdate(event._id.toString(), updateData, { new: true });
    return this.formatEventForFrontend(updatedEvent!);
  }

  // Gestion des réactions
  static async handleReactionAdd(client: BotClient, messageId: string, userId: string): Promise<void> {
    try {
      const event = await this.findByMessageId(messageId);
      if (!event || event.status === 'ended' || event.participants.length >= event.eventInfo.maxSlots || event.participants.includes(userId)) {
        return;
      }

      const { guild, channel } = await this.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);

      // Ajouter au thread du forum
      const eventThread = await this.findEventThread(channel as ForumChannel, event.eventInfo.name, messageId);
      if (eventThread) {
        await eventThread.members.add(userId).catch(() => {});
      }

      // Ajouter le participant et mettre à jour l'embed
      const updatedEvent = await this.addParticipant(event._id.toString(), userId);
      if (updatedEvent) {
        await this.updateEventEmbed(client, updatedEvent);
      }
    } catch (error) {
      console.error('[PARTY] Erreur réaction add:', error);
    }
  }

  static async handleReactionRemove(client: BotClient, messageId: string, userId: string): Promise<void> {
    try {
      const event = await this.findByMessageId(messageId);
      if (!event || event.status === 'ended' || !event.participants.includes(userId)) {
        return;
      }

      const { channel } = await this.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);

      // Retirer du thread du forum
      const eventThread = await this.findEventThread(channel as ForumChannel, event.eventInfo.name, messageId);
      if (eventThread) {
        await eventThread.members.remove(userId).catch(() => {});
      }

      // Retirer le participant et mettre à jour l'embed
      const updatedEvent = await this.removeParticipant(event._id.toString(), userId);
      if (updatedEvent) {
        await this.updateEventEmbed(client, updatedEvent);
      }
    } catch (error) {
      console.error('[PARTY] Erreur réaction remove:', error);
    }
  }

  // Mettre à jour l'embed de l'événement
  static async updateEventEmbed(client: BotClient, event: IEvent): Promise<void> {
    try {
      const updatedEvent = await this.getEventById(event._id.toString());
      if (!updatedEvent) return;

      const embed = this.createEventEmbed(updatedEvent, updatedEvent.discord.roleId);
      const message = await this.getDiscordMessage(client, event);
      
      if (message) {
        await message.edit({ embeds: [embed] }).catch(() => {});
      }
    } catch (error) {
      console.error('[PARTY] Erreur mise à jour embed:', error);
    }
  }

  // Supprimer toutes les réactions d'un événement terminé
  static async removeEventReactions(client: BotClient, event: IEvent): Promise<void> {
    try {
      const message = await this.getDiscordMessage(client, event);
      if (message) {
        await message.reactions.removeAll().catch(() => {});
      }
    } catch (error) {
      console.error('[PARTY] Erreur suppression réactions:', error);
    }
  }

  // Renommer le thread avec [END] devant le nom
  static async renameEventThreadAsEnded(client: BotClient, event: IEvent): Promise<void> {
    try {
      const { channel } = await this.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);
      const eventThread = await this.findEventThread(channel as ForumChannel, event.eventInfo.name, event.discord.messageId!);
      
      if (eventThread && !eventThread.name.startsWith('[END]')) {
        await eventThread.setName(`[END] ${eventThread.name}`).catch(() => {});
        await eventThread.setArchived(true, 'Événement terminé').catch(() => {});
      }
    } catch (error) {
      console.error('[PARTY] Erreur renommage thread:', error);
    }
  }

  // Distribuer les récompenses aux participants présents
  static async distributeRewards(client: BotClient, event: IEvent, attendedParticipants: string[], rewardAmount: number, xpAmount: number): Promise<void> {
    if (attendedParticipants.length === 0 || (rewardAmount <= 0 && xpAmount <= 0)) return;

    const moneyPerParticipant = rewardAmount > 0 ? Math.floor(rewardAmount / attendedParticipants.length) : 0;
    const xpPerParticipant = xpAmount > 0 ? Math.floor(xpAmount / attendedParticipants.length) : 0;

    const { LevelingService } = require('../../leveling/services/leveling.service');
    const GuildUserModel = require('../../user/models/guild-user.model').default;

    for (const participantId of attendedParticipants) {
      try {
        const user = await GuildUserModel.findOne({ discordId: participantId, guildId: event.discord.guildId });
        if (!user) continue;

        if (moneyPerParticipant > 0) user.profil.money += moneyPerParticipant;
        if (xpPerParticipant > 0) user.profil.exp += xpPerParticipant;
        
        await user.save();

        if (xpPerParticipant > 0) {
          const mockMessage = { guild: { id: event.discord.guildId }, author: { id: participantId } };
          await LevelingService.checkLevelUp(client, user, mockMessage as any);
        }
      } catch (error) {
        console.error(`[PARTY] Erreur distribution ${participantId}:`, error);
      }
    }
  }
}