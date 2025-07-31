import { ChannelType, EmbedBuilder, ForumChannel, ThreadChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { PartyEvent } from '../models/partyEvent.model';
import { DiscordError } from './party.types';

export class DiscordPartyService {
  
  static async getGuildAndChannel(client: BotClient, guildId: string, channelId: string): Promise<{ guild: any; channel: any }> {
    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId);
      return { guild, channel };
    } catch (error) {
      throw new DiscordError(`Impossible d'accéder au serveur/channel: ${error}`);
    }
  }




  static createEventEmbed(event: PartyEvent, roleId?: string): EmbedBuilder {
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

    // Description avec mention du rôle
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

    // Ajouter l'image si présente
    if (event.eventInfo.image) {
      embed.setImage(event.eventInfo.image);
    }

    return embed;
  }

  static async publishEventMessage(channel: ForumChannel, event: PartyEvent, embed: EmbedBuilder): Promise<{ messageId: string; threadId: string }> {
    try {
      const thread = await channel.threads.create({
        name: `🎉 ${event.eventInfo.name} - ${new Date(event.eventInfo.dateTime).toLocaleDateString('fr-FR')}`,
        message: { embeds: [embed] }
      });
      
      const starterMessage = await thread.fetchStarterMessage();
      const messageId = starterMessage?.id || thread.lastMessageId!;

      // Ajouter la réaction par défaut
      if (starterMessage) {
        await starterMessage.react('🎉').catch(() => {});
      }

      return {
        messageId,
        threadId: thread.id
      };
    } catch (error) {
      throw new DiscordError(`Impossible de publier l'événement: ${error}`);
    }
  }

  static async updateEventMessage(client: BotClient, event: PartyEvent, embed: EmbedBuilder): Promise<void> {
    try {
      if (!event.discord.threadId) {
        console.warn('[DISCORD] Pas de threadId pour mettre à jour l\'embed');
        return;
      }

      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread()) {
        const starterMessage = await thread.fetchStarterMessage();
        if (starterMessage) {
          await starterMessage.edit({ 
            embeds: [embed],
            files: [],
            content: null
          });
        }
      }
    } catch (error) {
      console.error('[DISCORD] Erreur mise à jour message:', error);
    }
  }

  static async addUserToThread(client: BotClient, event: PartyEvent, userId: string): Promise<void> {
    try {
      if (!event.discord.threadId) return;
      
      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread()) {
        await thread.members.add(userId).catch(() => {});
      }
    } catch (error) {
      console.error('[DISCORD] Erreur ajout utilisateur au thread:', error);
    }
  }

  static async removeUserFromThread(client: BotClient, event: PartyEvent, userId: string): Promise<void> {
    try {
      if (!event.discord.threadId) return;
      
      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread()) {
        await thread.members.remove(userId).catch(() => {});
      }
    } catch (error) {
      console.error('[DISCORD] Erreur retrait utilisateur du thread:', error);
    }
  }

  static async removeAllReactions(client: BotClient, event: PartyEvent): Promise<void> {
    try {
      if (!event.discord.threadId) return;
      
      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread()) {
        const starterMessage = await thread.fetchStarterMessage();
        if (starterMessage) {
          await starterMessage.reactions.removeAll().catch(() => {});
        }
      }
    } catch (error) {
      console.error('[DISCORD] Erreur suppression réactions:', error);
    }
  }

  static async archiveThread(client: BotClient, event: PartyEvent): Promise<void> {
    try {
      if (!event.discord.threadId) return;
      
      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread() && !thread.name.startsWith('[END]')) {
        await thread.setName(`[END] ${thread.name}`).catch(() => {});
        await thread.setArchived(true, 'Événement terminé').catch(() => {});
      }
    } catch (error) {
      console.error('[DISCORD] Erreur archivage thread:', error);
    }
  }

  static async sendAnnouncementMessage(
    client: BotClient, 
    event: PartyEvent, 
    announcementChannelId: string, 
    threadUrl: string, 
    roleId?: string,
    gameImageUrl?: string
  ): Promise<void> {
    try {
      const { guild } = await this.getGuildAndChannel(client, event.discord.guildId, event.discord.channelId);
      const announcementChannel = await guild.channels.fetch(announcementChannelId);
      
      if (!announcementChannel?.isTextBased()) {
        throw new DiscordError('Le channel d\'annonce n\'est pas un channel textuel');
      }

      const dateStr = new Date(event.eventInfo.dateTime).toLocaleDateString('fr-FR');
      const timeStr = new Date(event.eventInfo.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      const embed = new EmbedBuilder()
        .setTitle(`🎉 Nouvel événement : ${event.eventInfo.name}`)
        .setDescription(`Un nouvel événement a été créé !\n\n[Rejoindre l'événement](${threadUrl})`)
        .addFields([
          { name: '🎮 Jeu', value: event.eventInfo.game, inline: true },
          { name: '📅 Date', value: `${dateStr} à ${timeStr}`, inline: true },
          { name: '👥 Places', value: `${event.eventInfo.maxSlots} max`, inline: true }
        ])
        .setColor(event.eventInfo.color ? parseInt(event.eventInfo.color.replace('#', ''), 16) : 0xFF6B6B)
        .setTimestamp();

      // Thumbnail : image du jeu en priorité, sinon image de la soirée
      const thumbnailUrl = gameImageUrl || event.eventInfo.image;
      if (thumbnailUrl) {
        embed.setThumbnail(thumbnailUrl);
      }

      const messageOptions: any = { embeds: [embed] };
      if (roleId) {
        messageOptions.content = `<@&${roleId}>`;
      }

      await announcementChannel.send(messageOptions);
    } catch (error) {
      console.error('[DISCORD] Erreur envoi annonce:', error);
    }
  }

  private static formatParticipants(participants: string[], maxSlots: number): { count: string; list: string } {
    const count = `${participants.length}/${maxSlots}`;
    const list = participants.length > 0 
      ? participants.map(userId => `<@${userId}>`).join('\n')
      : 'Aucun participant pour le moment';
    
    return { count, list };
  }
}