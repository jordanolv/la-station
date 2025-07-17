import { ChannelType, EmbedBuilder, ForumChannel, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import PartyItemModel, { IEvent } from '../models/partyItem.model';
import GuildModel from '../../discord/models/guild.model';
import { IParty } from '../models/partyConfig.model';

export class PartyService {
  // Helper pour convertir les chemins d'images en URLs complètes
  private static getFullImageUrl(imagePath?: string): string | undefined {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath; // Déjà une URL complète
    
    // Construire l'URL complète avec l'host de l'API
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3051';
    return `${baseUrl}${imagePath}`;
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
      .setDescription(event.eventInfo.description || 'Aucune description')
      .addFields([
        { name: '🎮 Jeu', value: event.eventInfo.game, inline: true },
        { name: '📅 Date', value: new Date(event.eventInfo.dateTime).toLocaleDateString('fr-FR'), inline: true },
        { name: '⏰ Heure', value: new Date(event.eventInfo.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), inline: true },
        { name: `👥 Participants (${participantInfo.count})`, value: participantInfo.list, inline: false },
        { name: '🎭 Rôle', value: roleId ? `<@&${roleId}>` : 'En cours de création...', inline: true }
      ])
      .setColor(event.eventInfo.color ? parseInt(event.eventInfo.color.replace('#', ''), 16) : 0xFF6B6B)
      .setFooter({ text: 'Réagissez avec 🎉 pour participer à cet événement !' })
      .setTimestamp();

    if (event.eventInfo.image) {
      const fullImageUrl = this.getFullImageUrl(event.eventInfo.image);
      if (fullImageUrl) {
        embed.setImage(fullImageUrl);
      }
    }

    return embed;
  }

  // Créer le rôle Discord pour un événement
  private static async createEventRole(guild: any, event: IEvent) {
    return guild.roles.create({
      name: `🎉 ${event.eventInfo.name}`,
      color: event.eventInfo.color ? parseInt(event.eventInfo.color.replace('#', ''), 16) : 0xFF6B6B,
      hoist: false,
      mentionable: true,
      reason: `Rôle créé pour l'événement: ${event.eventInfo.name}`
    });
  }

  // Configurer les permissions du channel
  private static async setupChannelPermissions(channel: any, guild: any, eventRole: any) {
    if (channel.isTextBased() && 'permissionOverwrites' in channel) {
      await channel.permissionOverwrites.set([
        {
          id: guild.roles.everyone.id,
          deny: ['SendMessages']
        },
        {
          id: eventRole.id,
          allow: ['SendMessages', 'ViewChannel']
        }
      ]);
    }
  }

  // Publier le message d'événement
  private static async publishEventMessage(channel: any, event: IEvent, embed: EmbedBuilder): Promise<string> {
    let messageId: string;

    if (channel.type === ChannelType.GuildForum) {
      const forumChannel = channel as ForumChannel;
      const thread = await forumChannel.threads.create({
        name: `🎉 ${event.eventInfo.name} - ${new Date(event.eventInfo.dateTime).toLocaleDateString('fr-FR')}`,
        message: {
          embeds: [embed]
        }
      });
      messageId = thread.lastMessageId!;
    } else if (channel.isTextBased() && 'send' in channel) {
      const message = await channel.send({ embeds: [embed] });
      messageId = message.id;
    } else {
      throw new Error(`Type de channel non supporté: ${channel.type}`);
    }

    // Ajouter la réaction par défaut
    const messageToReact = channel.isTextBased() && 'messages' in channel 
      ? await channel.messages.fetch(messageId)
      : null;
    
    if (messageToReact) {
      await messageToReact.react('🎉');
    }

    return messageId;
  }

  // Vérifier si un channel est un party channel actif
  static async isPartyChannel(channelId: string): Promise<{ isParty: boolean; event?: IEvent }> {
    const event = await PartyItemModel.findOne({ 'discord.channelId': channelId });
    return { isParty: !!event, event: event || undefined };
  }

  // Vérifier si un utilisateur a le rôle requis pour un événement
  static async hasEventRole(userId: string, guildId: string, roleId: string): Promise<boolean> {
    try {
      const client = BotClient.getInstance();
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      
      return member.roles.cache.has(roleId);
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle:', error);
      return false;
    }
  }

  // Configuration des soirées par serveur
  static async getPartyConfig(guildId: string): Promise<IParty | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.party || null;
  }

  static async getOrCreatePartyConfig(guildId: string): Promise<IParty> {
    let guild = await GuildModel.findOne({ guildId });
    if (!guild || !guild.features?.party) {
      guild = await GuildModel.findOneAndUpdate(
        { guildId },
        { 
          $set: { 
            'features.party': {
              enabled: false,
              channelId: ''
            }
          }
        },
        { new: true, upsert: true }
      );
    }
    return guild.features.party!;
  }

  static async updatePartyConfig(guildId: string, updates: Partial<IParty>): Promise<IParty | null> {
    const updateFields: any = {};
    Object.keys(updates).forEach(key => {
      updateFields[`features.party.${key}`] = updates[key as keyof IParty];
    });
    
    const guild = await GuildModel.findOneAndUpdate(
      { guildId },
      { $set: updateFields },
      { new: true }
    );
    
    return guild?.features?.party || null;
  }

  // CRUD des événements
  static async getEventById(eventId: string): Promise<IEvent | null> {
    return PartyItemModel.findById(eventId);
  }

  static async getEventsByGuild(guildId: string): Promise<IEvent[]> {
    return PartyItemModel.find({ 'discord.guildId': guildId }).sort({ 'eventInfo.dateTime': 1 });
  }

  static async createEvent(eventData: Partial<IEvent>): Promise<IEvent> {
    return PartyItemModel.create(eventData);
  }

  static async updateEvent(eventId: string, updates: Partial<IEvent>): Promise<IEvent | null> {
    return PartyItemModel.findByIdAndUpdate(eventId, updates, { new: true });
  }

  static async deleteEvent(eventId: string): Promise<boolean> {
    const result = await PartyItemModel.findByIdAndDelete(eventId);
    return !!result;
  }

  static async findByMessageId(messageId: string): Promise<IEvent | null> {
    return PartyItemModel.findOne({ 'discord.messageId': messageId });
  }

  // Intégration Discord
  static async createEventInDiscord(client: BotClient, eventData: Partial<IEvent>): Promise<IEvent> {
    try {
      const guild = await client.guilds.fetch(eventData.discord!.guildId!);
      if (!guild) throw new Error('Serveur Discord non trouvé');

      // Créer l'événement en base
      const event = await this.createEvent(eventData);

      // Récupérer le channel configuré
      const channel = await guild.channels.fetch(event.discord.channelId);
      if (!channel) throw new Error('Channel non trouvé');

      // Créer le rôle Discord
      const eventRole = await this.createEventRole(guild, event);

      // Configurer les permissions du channel
      await this.setupChannelPermissions(channel, guild, eventRole);

      // Créer l'embed
      const embed = this.createEventEmbed(event, eventRole.id);

      // Publier le message d'événement
      const messageId = await this.publishEventMessage(channel, event, embed);

      // Mettre à jour l'événement avec les IDs Discord
      const updatedEvent = await this.updateEvent(event._id.toString().toString(), {
        discord: {
          ...event.discord,
          roleId: eventRole.id,
          messageId
        }
      });

      return updatedEvent!;
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement Discord:', error);
      throw error;
    }
  }

  // Gestion des réactions
  static async handleReactionAdd(client: BotClient, messageId: string, userId: string): Promise<void> {
    try {
      const event = await this.findByMessageId(messageId);
      if (!event) return;

      // Vérifier si l'événement n'est pas complet
      if (event.participants.length >= event.eventInfo.maxSlots) {
        return; // Événement complet
      }

      // Vérifier si l'utilisateur n'est pas déjà participant
      if (event.participants.includes(userId)) return;

      const guild = await client.guilds.fetch(event.discord.guildId);
      const member = await guild.members.fetch(userId);
      
      // Donner le rôle
      if (event.discord.roleId) {
        await member.roles.add(event.discord.roleId);
      }

      // Ajouter l'utilisateur aux participants
      await this.updateEvent(event._id.toString(), {
        participants: [...event.participants, userId]
      });

      // Mettre à jour l'embed
      await this.updateEventEmbed(client, event);

    } catch (error) {
      console.error('Erreur lors de l\'ajout de réaction:', error);
    }
  }

  static async handleReactionRemove(client: BotClient, messageId: string, userId: string): Promise<void> {
    try {
      const event = await this.findByMessageId(messageId);
      if (!event) return;

      // Vérifier si l'utilisateur est participant
      if (!event.participants.includes(userId)) return;

      const guild = await client.guilds.fetch(event.discord.guildId);
      const member = await guild.members.fetch(userId);
      
      // Retirer le rôle
      if (event.discord.roleId) {
        await member.roles.remove(event.discord.roleId);
      }

      // Retirer l'utilisateur des participants
      const newParticipants = event.participants.filter(p => p !== userId);
      await this.updateEvent(event._id.toString(), {
        participants: newParticipants
      });

      // Mettre à jour l'embed
      await this.updateEventEmbed(client, event);

    } catch (error) {
      console.error('Erreur lors du retrait de réaction:', error);
    }
  }

  // Mettre à jour l'embed de l'événement
  static async updateEventEmbed(client: BotClient, event: IEvent): Promise<void> {
    try {
      const guild = await client.guilds.fetch(event.discord.guildId);
      
      // Récupérer le message
      const channel = await guild.channels.fetch(event.discord.channelId) as TextChannel;
      const message = await channel.messages.fetch(event.discord.messageId!);

      // Récupérer l'événement à jour
      const updatedEvent = await this.getEventById(event._id.toString());
      if (!updatedEvent) return;

      // Créer le nouvel embed
      const embed = this.createEventEmbed(updatedEvent, updatedEvent.discord.roleId);

      // Mettre à jour le message
      await message.edit({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'embed:', error);
    }
  }
}