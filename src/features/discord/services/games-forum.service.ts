import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ForumChannel,
  Guild,
  MessageFlags,
  ThreadChannel,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { AppConfigService } from './app-config.service';

export const GAMES_PING_BUTTON_ID = 'games:pingrole';

export interface GamesForumConfig {
  forumId: string | null;
  quizThreadId: string | null;
  bingoThreadId: string | null;
  arcadeThreadId: string | null;
  justePrixThreadId: string | null;
  announceChannelId: string | null;
  pingRoleId: string | null;
}

const POSTS: { key: 'quiz' | 'bingo' | 'arcadePost' | 'justePrix'; name: string; content: string }[] = [
  {
    key: 'quiz',
    name: '❓ Quiz du jour',
    content: '**Bienvenue sur le quiz quotidien !**\nChaque jour à 13h : choisis ton thème, réponds à ta question, récap et classements à 22h.\n🔥 Enchaîne les bonnes réponses pour gagner des expéditions bonus.',
  },
  {
    key: 'bingo',
    name: '🎯 Bingo',
    content: '**Le repaire du bingo.**\nQuand une partie démarre, le nombre mystère se devine ici. Numéros bonus, gros lot… restez à l\'affût !',
  },
  {
    key: 'arcadePost',
    name: '🕹️ Arcade',
    content: '**Le salon des mini-jeux.**\nShifumi, Puissance 4, Morpion, Battle — lancez vos défis ici !',
  },
  {
    key: 'justePrix',
    name: '💰 Juste Prix',
    content: '**Le Juste Prix.**\nQuand une manche démarre, propose **UN** nombre — tu peux le changer jusqu\'à la révélation. Le plus proche gagne, le nombre exact fait sauter la banque ! 🎯',
  },
];

export class GamesForumService {
  static async getConfig(): Promise<GamesForumConfig> {
    const app = await AppConfigService.getOrCreateConfig();
    const channels = app.config.channels ?? {};
    return {
      forumId: channels.gamesForum ?? null,
      quizThreadId: channels.quiz ?? null,
      bingoThreadId: channels.bingo ?? null,
      arcadeThreadId: channels.arcadePost ?? null,
      justePrixThreadId: channels.justePrix ?? null,
      announceChannelId: channels.gamesAnnounce ?? null,
      pingRoleId: app.config.gamesPingRoleId ?? null,
    };
  }

  /** Crée tout : channel forum (ou réutilise celui fourni), rôle ping, posts par jeu, post d'inscription au ping. */
  static async setup(client: BotClient, options: { announceChannelId?: string | null; forumChannelId?: string | null }): Promise<void> {
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    if (!guild) throw new Error('Guild introuvable');

    const app = await AppConfigService.getOrCreateConfig();
    if (!app.config.channels) app.config.channels = {};
    const channels = app.config.channels as Record<string, string>;

    const forumId = options.forumChannelId || channels.gamesForum;
    let forum = forumId ? (guild.channels.cache.get(forumId) as ForumChannel | undefined) : undefined;
    if (forum && forum.type !== ChannelType.GuildForum) throw new Error('Le channel choisi n\'est pas un forum');
    if (!forum) {
      forum = await guild.channels.create({
        name: '🗂️・jeux',
        type: ChannelType.GuildForum,
        topic: 'Un post par jeu : quiz du jour, bingo, arcade. Suis un post ou prends le rôle 🎮 pour être notifié.',
      });
    }
    channels.gamesForum = forum.id;

    if (!app.config.gamesPingRoleId || !guild.roles.cache.has(app.config.gamesPingRoleId)) {
      const role = await guild.roles.create({ name: '🎮 Jeux', mentionable: true, reason: 'Rôle opt-in notifications jeux' });
      app.config.gamesPingRoleId = role.id;
    }

    for (const post of POSTS) {
      const existing = channels[post.key] ? guild.channels.cache.get(channels[post.key]!) : null;
      if (existing?.isThread() && existing.parentId === forum.id) continue;
      const thread = await forum.threads.create({ name: post.name, message: { content: post.content } });
      channels[post.key] = thread.id;
    }

    if (!channels.gamesPingPost) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(GAMES_PING_BUTTON_ID)
          .setLabel('🔔 Être notifié des jeux')
          .setStyle(ButtonStyle.Primary),
      );
      const thread = await forum.threads.create({
        name: '🔔 Notifications',
        message: {
          content: 'Clique sur le bouton pour recevoir (ou retirer) le rôle **🎮 Jeux** — tu seras pingé à chaque question du jour et à chaque bingo.',
          components: [row],
        },
      });
      channels.gamesPingPost = thread.id;
    }

    if (options.announceChannelId !== undefined) {
      if (options.announceChannelId) channels.gamesAnnounce = options.announceChannelId;
      else delete channels.gamesAnnounce;
    }

    app.markModified('config.channels');
    await app.save();
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

  /** Ping le rôle opt-in dans un thread de jeu. */
  static async pingInThread(thread: ThreadChannel, text: string): Promise<void> {
    const config = await this.getConfig();
    if (!config.pingRoleId) return;
    await thread.send({
      content: `<@&${config.pingRoleId}> ${text}`,
      allowedMentions: { roles: [config.pingRoleId] },
    }).catch(() => {});
  }

  static async handlePingRoleButton(interaction: ButtonInteraction): Promise<void> {
    const config = await this.getConfig();
    if (!config.pingRoleId) {
      await interaction.reply({ content: 'Le rôle de notification n\'est pas configuré.', flags: MessageFlags.Ephemeral });
      return;
    }
    const guild = interaction.guild as Guild;
    const member = await guild.members.fetch(interaction.user.id);
    const has = member.roles.cache.has(config.pingRoleId);
    if (has) await member.roles.remove(config.pingRoleId);
    else await member.roles.add(config.pingRoleId);
    await interaction.reply({
      content: has
        ? '🔕 Rôle **🎮 Jeux** retiré — plus de pings.'
        : '🔔 Rôle **🎮 Jeux** ajouté — tu seras pingé au lancement des jeux !',
      flags: MessageFlags.Ephemeral,
    });
  }
}
