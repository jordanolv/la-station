import {
  ChannelType,
  ForumChannel,
  MessageReaction,
  PermissionFlagsBits,
  ThreadChannel,
  User,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { AppConfigService } from './app-config.service';
import { BingoRepository } from '../../arcade/bingo/repositories/bingo.repository';
import { JustePrixRepository } from '../../arcade/juste-prix/repositories/juste-prix.repository';

export const GAMES_BELL_EMOJI = '🔔';

export type NotifGameKey = 'quiz' | 'bingo' | 'justePrix';

export interface GamesForumConfig {
  forumId: string | null;
  quizThreadId: string | null;
  bingoThreadId: string | null;
  arcadeThreadId: string | null;
  justePrixThreadId: string | null;
  announceChannelId: string | null;
  pingRoles: Record<NotifGameKey, string | null>;
}

const POSTS: { key: 'quiz' | 'bingo' | 'arcadePost' | 'justePrix'; name: string; content: string }[] = [
  {
    key: 'quiz',
    name: '❓ Quiz du jour',
    content: '**Bienvenue sur le quiz quotidien !**\nChaque jour à 13h : choisis ton thème, réponds à ta question, récap et classements à 22h.\n🔥 Enchaîne les bonnes réponses pour gagner des expéditions bonus.\n\n🔔 **Réagis à ce message pour être notifié à chaque question du jour !**',
  },
  {
    key: 'bingo',
    name: '🎯 Bingo',
    content: '**Le repaire du bingo.**\nQuand une partie démarre, le nombre mystère se devine ici. Numéros bonus, gros lot… restez à l\'affût !\n\n🔔 **Réagis à ce message pour être notifié à chaque partie !**',
  },
  {
    key: 'arcadePost',
    name: '🕹️ Arcade',
    content: '**Le salon des mini-jeux.**\nShifumi, Puissance 4, Morpion, Battle — lancez vos défis ici !',
  },
  {
    key: 'justePrix',
    name: '💰 Juste Prix',
    content: '**Le Juste Prix.**\nQuand une manche démarre, propose **UN** nombre — tu peux le changer jusqu\'à la révélation. Le plus proche gagne, le nombre exact fait sauter la banque ! 🎯\n\n🔔 **Réagis à ce message pour être notifié à chaque manche !**',
  },
];

const NOTIF_GAMES: { key: NotifGameKey; roleName: string }[] = [
  { key: 'quiz', roleName: '🔔 Quiz' },
  { key: 'bingo', roleName: '🔔 Bingo' },
  { key: 'justePrix', roleName: '🔔 Juste Prix' },
];

export class GamesForumService {
  static async getConfig(): Promise<GamesForumConfig> {
    const app = await AppConfigService.getOrCreateConfig();
    const channels = app.config.channels ?? {};
    const roles = app.config.gamesPingRoles ?? {};
    return {
      forumId: channels.gamesForum ?? null,
      quizThreadId: channels.quiz ?? null,
      bingoThreadId: channels.bingo ?? null,
      arcadeThreadId: channels.arcadePost ?? null,
      justePrixThreadId: channels.justePrix ?? null,
      announceChannelId: channels.gamesAnnounce ?? null,
      pingRoles: {
        quiz: roles.quiz ?? null,
        bingo: roles.bingo ?? null,
        justePrix: roles.justePrix ?? null,
      },
    };
  }

  /**
   * Crée tout : channel forum (ou réutilise celui fourni), rôles de notification par jeu,
   * posts par jeu avec la cloche 🔔 en réaction. Idempotent : applique permissions et
   * verrous sur l'existant, ne crée que ce qui manque.
   */
  static async setup(client: BotClient, options: { announceChannelId?: string | null; forumChannelId?: string | null }): Promise<void> {
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    if (!guild) throw new Error('Guild introuvable');

    const app = await AppConfigService.getOrCreateConfig();
    if (!app.config.channels) app.config.channels = {};
    const channels = app.config.channels as Record<string, string>;
    if (!app.config.gamesPingRoles) app.config.gamesPingRoles = {};
    const pingRoles = app.config.gamesPingRoles as Record<string, string>;

    const forumId = options.forumChannelId || channels.gamesForum;
    let forum = forumId ? (guild.channels.cache.get(forumId) as ForumChannel | undefined) : undefined;
    if (forum && forum.type !== ChannelType.GuildForum) throw new Error('Le channel choisi n\'est pas un forum');
    if (!forum) {
      forum = await guild.channels.create({
        name: '🗂️・jeux',
        type: ChannelType.GuildForum,
        topic: 'Un post par jeu : quiz du jour, bingo, juste prix, arcade. Réagis 🔔 sur un post pour être notifié.',
      });
    }
    channels.gamesForum = forum.id;

    // Permissions : personne ne crée de posts, les réponses se font dans les fils (déverrouillés par les jeux)
    await forum.permissionOverwrites.set([
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessagesInThreads],
        deny: [
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
        ],
      },
      {
        id: client.user!.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.ManageThreads,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AddReactions,
        ],
      },
    ]).catch(() => {});

    // Un rôle de notification par jeu
    for (const { key, roleName } of NOTIF_GAMES) {
      if (!pingRoles[key] || !guild.roles.cache.has(pingRoles[key]!)) {
        const role = await guild.roles.create({ name: roleName, mentionable: true, reason: `Rôle notifications ${roleName}` });
        pingRoles[key] = role.id;
      }
    }

    // Migration : suppression de l'ancien système (rôle unique + post 🔔 Notifications)
    if (app.config.gamesPingRoleId) {
      await guild.roles.cache.get(app.config.gamesPingRoleId)?.delete('Remplacé par les rôles de notification par jeu').catch(() => {});
      app.config.gamesPingRoleId = undefined;
    }
    if (channels.gamesPingPost) {
      const oldPost = await guild.channels.fetch(channels.gamesPingPost).catch(() => null);
      if (oldPost?.isThread()) await oldPost.delete('Remplacé par les réactions 🔔 sur les posts').catch(() => {});
      delete channels.gamesPingPost;
    }

    for (const post of POSTS) {
      const existing = channels[post.key] ? guild.channels.cache.get(channels[post.key]!) : null;
      if (!existing?.isThread() || existing.parentId !== forum.id) {
        const thread = await forum.threads.create({ name: post.name, message: { content: post.content } });
        channels[post.key] = thread.id;
      }
    }

    // Cloche 🔔 par défaut sur les posts notifiables
    for (const { key } of NOTIF_GAMES) {
      const thread = await guild.channels.fetch(channels[key]!).catch(() => null);
      if (!thread?.isThread()) continue;
      const starter = await thread.fetchStarterMessage().catch(() => null);
      await starter?.react(GAMES_BELL_EMOJI).catch(() => {});
    }

    if (options.announceChannelId !== undefined) {
      if (options.announceChannelId) channels.gamesAnnounce = options.announceChannelId;
      else delete channels.gamesAnnounce;
    }

    app.markModified('config.channels');
    app.markModified('config.gamesPingRoles');
    await app.save();

    // Quiz : jamais verrouillé — un thread lock grise les boutons pour les non-modos.
    // Les messages des membres y sont auto-supprimés (messageCreate).
    // Bingo et Juste Prix : verrouillés par défaut, les jeux les déverrouillent pendant les parties —
    // sauf si une partie est en cours au moment du setup.
    if (channels.quiz) await this.setThreadLocked(client, channels.quiz, false);
    const [bingoState, jpState] = await Promise.all([BingoRepository.get(), JustePrixRepository.get()]);
    const activeThreads = new Set([bingoState?.activeThreadId, jpState?.activeThreadId].filter(Boolean));
    for (const key of ['bingo', 'justePrix']) {
      const threadId = channels[key];
      if (threadId && !activeThreads.has(threadId)) await this.setThreadLocked(client, threadId, true);
    }
  }

  /** (Dé)verrouille un post de jeu — utilisé au spawn et en fin de partie. */
  static async setThreadLocked(client: BotClient, threadId: string, locked: boolean): Promise<void> {
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    const thread = await guild?.channels.fetch(threadId).catch(() => null);
    if (!thread?.isThread()) return;
    if (thread.archived) await thread.setArchived(false).catch(() => {});
    await thread.setLocked(locked).catch(() => {});
  }

  /** Poste une annonce dans le channel général configuré. Retourne l'id du message (à supprimer plus tard). */
  static async announce(client: BotClient, content: string): Promise<string | null> {
    const config = await this.getConfig();
    if (!config.announceChannelId) return null;
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    const channel = await guild?.channels.fetch(config.announceChannelId).catch(() => null);
    if (!channel?.isTextBased()) return null;
    const message = await channel.send({ content }).catch(() => null);
    return message?.id ?? null;
  }

  static async deleteAnnounce(client: BotClient, messageId?: string | null): Promise<void> {
    if (!messageId) return;
    const config = await this.getConfig();
    if (!config.announceChannelId) return;
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    const channel = await guild?.channels.fetch(config.announceChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    await message?.delete().catch(() => {});
  }

  /** Ping le rôle de notification du jeu dans son post. */
  static async pingInThread(thread: ThreadChannel, game: NotifGameKey, text: string): Promise<void> {
    const config = await this.getConfig();
    const roleId = config.pingRoles[game];
    if (!roleId) return;
    await thread.send({
      content: `<@&${roleId}> ${text}`,
      allowedMentions: { roles: [roleId] },
    }).catch(() => {});
  }

  /** Réaction 🔔 sur le message d'intro d'un post de jeu = prendre/retirer le rôle de notification. */
  static async handleBellReaction(reaction: MessageReaction, user: User, added: boolean): Promise<void> {
    if (reaction.emoji.name !== GAMES_BELL_EMOJI) return;

    const app = await AppConfigService.getOrCreateConfig();
    const channels = app.config.channels ?? {};
    const pingRoles = app.config.gamesPingRoles ?? {};

    // Le message d'intro d'un post forum a le même id que le thread
    const game = NOTIF_GAMES.find(({ key }) => channels[key] === reaction.message.id)?.key;
    if (!game || !pingRoles[game]) return;

    const guild = reaction.message.guild;
    if (!guild) return;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    if (added) await member.roles.add(pingRoles[game]!).catch(() => {});
    else await member.roles.remove(pingRoles[game]!).catch(() => {});
  }
}
