import {
  ForumChannel,
  ThreadChannel,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { PartyEvent } from '../models/party-event.model';
import { DiscordError } from './party.types';

export class DiscordPartyService {

  static async getGuildAndChannel(client: BotClient, channelId: string): Promise<{ guild: any; channel: any }> {
    try {
      const guild = await client.guilds.fetch(getGuildId());
      const channel = await guild.channels.fetch(channelId);
      return { guild, channel };
    } catch (error) {
      throw new DiscordError(`Impossible d'accéder au serveur/channel: ${error}`);
    }
  }

  static createEventContainer(event: PartyEvent, roleId?: string): ContainerBuilder {
    const ts = Math.floor(new Date(event.eventInfo.dateTime).getTime() / 1000);
    const filled = event.participants.length;
    const total = event.eventInfo.maxSlots;
    const isFull = filled >= total;

    const color = event.eventInfo.color
      ? parseInt(event.eventInfo.color.replace('#', ''), 16)
      : 0xFF6B6B;

    const container = new ContainerBuilder().setAccentColor(color);

    // Image en plein format
    if (event.eventInfo.image) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(event.eventInfo.image),
        ),
      );
    }

    if (roleId) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`<@&${roleId}>`),
      );
    }
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🎉 ${event.eventInfo.name}`),
    );

    // Description
    if (event.eventInfo.description) {
      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(event.eventInfo.description),
        );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Infos principales
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🎮 **${event.eventInfo.game}**\n📅 <t:${ts}:F> · <t:${ts}:R>`,
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Participants
    const slotBar = this.buildSlotBar(filled, total);
    const participantList = event.participants.length > 0
      ? event.participants.map(id => `<@${id}>`).join(' ')
      : '*Aucun participant pour le moment*';

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 👥 ${filled}/${total} participants\n${slotBar}\n${participantList}`,
      ),
    );

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          isFull ? `-# 🔒 Complet — réagis 🎉 pour rejoindre la liste d'attente` : `-# Réagis avec 🎉 pour participer !`,
        ),
      );

    return container;
  }

  private static buildSlotBar(filled: number, total: number): string {
    const barLength = 10;
    const filledCount = Math.round((filled / total) * barLength);
    const filled_ = '▰'.repeat(filledCount);
    const empty = '▱'.repeat(barLength - filledCount);
    return `-# ${filled_}${empty}`;
  }

  static async publishEventMessage(channel: ForumChannel, event: PartyEvent, container: ContainerBuilder): Promise<{ messageId: string; threadId: string }> {
    try {
      const eventDate = new Date(event.eventInfo.dateTime);
      const formattedDate = eventDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      const thread = await channel.threads.create({
        name: `[${formattedDate}] ${event.eventInfo.name}`,
        message: {
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        } as any,
        invitable: false,
      } as any);

      const starterMessage = await thread.fetchStarterMessage();
      const messageId = starterMessage?.id || thread.lastMessageId!;

      if (starterMessage) {
        await starterMessage.react('🎉').catch(() => {});
      }

      return { messageId, threadId: thread.id };
    } catch (error) {
      throw new DiscordError(`Impossible de publier l'événement: ${error}`);
    }
  }

  static async updateEventMessage(client: BotClient, event: PartyEvent, container: ContainerBuilder): Promise<void> {
    try {
      if (!event.discord.threadId) return;

      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread()) {
        const starterMessage = await thread.fetchStarterMessage();
        if (starterMessage) {
          await starterMessage.edit({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          } as any);
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

  static async deleteThread(client: BotClient, event: PartyEvent): Promise<void> {
    try {
      if (!event.discord.threadId) return;
      const thread = await client.channels.fetch(event.discord.threadId) as ThreadChannel;
      if (thread?.isThread()) {
        await thread.delete('Soirée supprimée').catch(() => {});
      }
    } catch (error) {
      console.error('[DISCORD] Erreur suppression thread:', error);
    }
  }


  static async getGuildBannerUrl(client: BotClient): Promise<string | null> {
    const guild = await client.guilds.fetch(getGuildId());
    return guild.bannerURL({ size: 4096 }) ?? null;
  }

  static async setGuildBanner(client: BotClient, imageUrl: string): Promise<void> {
    const guild = await client.guilds.fetch(getGuildId());
    const response = await fetch(imageUrl);
    if (!response.ok) throw new DiscordError(`Impossible de télécharger l'image du banner: ${imageUrl}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await guild.edit({ banner: `data:image/png;base64,${buffer.toString('base64')}` });
  }

  static async restoreGuildBanner(client: BotClient, originalBannerUrl: string | null): Promise<void> {
    const guild = await client.guilds.fetch(getGuildId());
    if (!originalBannerUrl) {
      await guild.edit({ banner: null });
      return;
    }
    const response = await fetch(originalBannerUrl);
    if (!response.ok) return;
    const buffer = Buffer.from(await response.arrayBuffer());
    await guild.edit({ banner: `data:image/png;base64,${buffer.toString('base64')}` });
  }
}
