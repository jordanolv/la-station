import {
  ChannelType,
  ForumChannel,
  ThreadChannel,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import ConfigPanelModel, { IConfigPanelState } from '../models/config-panel.model';
import { panelRegistry, ConfigPanel } from './config-panel.registry';

const FORUM_NAME = '⚙️┃config-bot';

export class ConfigPanelService {
  /**
   * Initialise ou synchronise le forum et tous les panels enregistrés.
   * Appelé au `ready` du bot.
   */
  static async init(client: BotClient): Promise<void> {
    const guild = client.guilds.cache.get(getGuildId());
    if (!guild) return;

    let state = await ConfigPanelModel.findOne();
    if (!state) {
      state = await ConfigPanelModel.create({ panels: new Map() });
    }

    const forum = await this.ensureForum(client, state);
    if (!forum) return;

    const panels = panelRegistry.getAll();
    for (const panel of panels) {
      await this.syncPanel(client, forum, state, panel);
    }

    console.log(`[ConfigPanel] ${panels.length} panels synchronisés dans #${forum.name}`);
  }

  /**
   * Rafraîchit les containers V2 d'un panel donné (après modification de config).
   * Chaque container est envoyé dans un message séparé pour ne pas dépasser la limite de 40 composants.
   */
  static async refreshPanel(client: BotClient, panelId: string): Promise<void> {
    const state = await ConfigPanelModel.findOne();
    if (!state) return;

    const panel = panelRegistry.get(panelId);
    if (!panel) return;

    const entry = state.panels.get(panelId);
    if (!entry) return;

    const guild = client.guilds.cache.get(getGuildId());
    if (!guild) return;

    try {
      const thread = (await guild.channels.fetch(entry.threadId)) as ThreadChannel | null;
      if (!thread) return;

      const containers = await panel.buildContainers(client);
      const messageIds = entry.messageIds?.length ? entry.messageIds : [entry.messageId];

      // Mettre à jour les messages existants
      for (let i = 0; i < containers.length; i++) {
        if (i < messageIds.length) {
          const message = await thread.messages.fetch(messageIds[i]).catch(() => null);
          if (message) {
            await message.edit({
              components: [containers[i]],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        } else {
          // Nouveau container → envoyer un message supplémentaire
          const newMsg = await thread.send({
            components: [containers[i]],
            flags: MessageFlags.IsComponentsV2,
          });
          messageIds.push(newMsg.id);
        }
      }

      // Supprimer les messages en trop si le nombre de containers a diminué
      for (let i = containers.length; i < messageIds.length; i++) {
        const msg = await thread.messages.fetch(messageIds[i]).catch(() => null);
        if (msg) await msg.delete().catch(() => null);
      }

      // Persister les messageIds si changement
      const newIds = messageIds.slice(0, containers.length);
      const changed = JSON.stringify(newIds) !== JSON.stringify(messageIds.slice(0, containers.length))
        || (entry.messageIds?.length ?? 0) !== newIds.length;
      if (changed || !entry.messageIds?.length) {
        entry.messageIds = newIds;
        state.markModified('panels');
        await state.save();
      }
    } catch (err) {
      console.error(`[ConfigPanel] Erreur refresh panel "${panelId}":`, err);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private static async ensureForum(
    client: BotClient,
    state: IConfigPanelState,
  ): Promise<ForumChannel | null> {
    const guild = client.guilds.cache.get(getGuildId())!;

    if (state.forumChannelId) {
      const existing = guild.channels.cache.get(state.forumChannelId);
      if (existing && existing.type === ChannelType.GuildForum) {
        return existing as ForumChannel;
      }
    }

    const forum = await guild.channels.create({
      name: FORUM_NAME,
      type: ChannelType.GuildForum,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: client.user!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageThreads,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    });

    state.forumChannelId = forum.id;
    await state.save();

    console.log(`[ConfigPanel] Forum "${FORUM_NAME}" créé (${forum.id})`);
    return forum;
  }

  private static async syncPanel(
    client: BotClient,
    forum: ForumChannel,
    state: IConfigPanelState,
    panel: ConfigPanel,
  ): Promise<void> {
    const containers = await panel.buildContainers(client);

    const existing = state.panels.get(panel.id);

    if (existing) {
      try {
        const thread = (await forum.threads.fetch(existing.threadId).then(
          (r) => (r as any)?.id ? r : null,
        )) as ThreadChannel | null;

        if (thread) {
          // Utiliser messageIds si disponible, sinon fallback sur messageId (ancien format)
          const messageIds = existing.messageIds?.length ? existing.messageIds : [existing.messageId];
          const firstMsg = await thread.messages.fetch(messageIds[0]).catch(() => null);

          if (firstMsg) {
            // Mettre à jour les messages existants, un container par message
            const newIds: string[] = [];
            for (let i = 0; i < containers.length; i++) {
              if (i < messageIds.length) {
                const msg = await thread.messages.fetch(messageIds[i]).catch(() => null);
                if (msg) {
                  await msg.edit({ components: [containers[i]], flags: MessageFlags.IsComponentsV2 });
                  newIds.push(msg.id);
                }
              } else {
                const newMsg = await thread.send({ components: [containers[i]], flags: MessageFlags.IsComponentsV2 });
                newIds.push(newMsg.id);
              }
            }
            // Supprimer les messages en trop
            for (let i = containers.length; i < messageIds.length; i++) {
              const msg = await thread.messages.fetch(messageIds[i]).catch(() => null);
              if (msg) await msg.delete().catch(() => null);
            }
            existing.messageIds = newIds;
            state.markModified('panels');
            await state.save();
            return;
          }
        }
      } catch {
        // Thread ou message introuvable → recréer
      }
    }

    // Créer le thread avec le premier container
    const thread = await forum.threads.create({
      name: `${panel.emoji} ${panel.title}`,
      message: {
        components: [containers[0]],
        flags: MessageFlags.IsComponentsV2,
      },
    });

    const starterMessage = await thread.fetchStarterMessage();
    if (!starterMessage) return;

    const messageIds = [starterMessage.id];

    // Envoyer les containers supplémentaires
    for (let i = 1; i < containers.length; i++) {
      const msg = await thread.send({ components: [containers[i]], flags: MessageFlags.IsComponentsV2 });
      messageIds.push(msg.id);
    }

    state.panels.set(panel.id, {
      threadId: thread.id,
      messageId: starterMessage.id,
      messageIds,
    });
    await state.save();
  }
}
