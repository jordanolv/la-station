import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import UserModel from '../../user/models/user.model';

export const LEADERBOARD_TYPE = {
  MESSAGES: 'messages',
  VOCAL:    'vocal',
  ARCADE:   'arcade',
  STREAK:   'streak',
  PARTIES:  'parties',
} as const;

type LeaderboardType = typeof LEADERBOARD_TYPE[keyof typeof LEADERBOARD_TYPE];

interface TypeConfig {
  label: string;
  emoji: string;
  color: number;
  format: (val: number) => string;
}

const TYPE_CONFIG: Record<LeaderboardType, TypeConfig> = {
  messages: { label: 'Messages',      emoji: '💬', color: 0x3498db, format: v => `${v.toLocaleString('fr-FR')} msg` },
  vocal:    { label: 'Temps Vocal',   emoji: '🎤', color: 0x9b59b6, format: v => formatVoiceTime(v) },
  arcade:   { label: 'Arcade',        emoji: '🎮', color: 0x2ecc71, format: v => `${v} victoire${v > 1 ? 's' : ''}` },
  streak:   { label: 'Streak',        emoji: '🔥', color: 0xe74c3c, format: v => `${v} jour${v > 1 ? 's' : ''}` },
  parties:  { label: 'Soirées',       emoji: '🎉', color: 0xf39c12, format: v => `${v} soirée${v > 1 ? 's' : ''}` },
};

function getArcadeWins(user: any): number {
  return (user.stats?.arcade?.shifumi?.wins   || 0)
       + (user.stats?.arcade?.puissance4?.wins || 0)
       + (user.stats?.arcade?.morpion?.wins    || 0)
       + (user.stats?.arcade?.battle?.wins     || 0);
}

function getUserValue(user: any, type: LeaderboardType): number {
  if (!user) return 0;
  switch (type) {
    case 'messages': return user.stats?.totalMsg          || 0;
    case 'vocal':    return user.stats?.voiceTime         || 0;
    case 'arcade':   return getArcadeWins(user);
    case 'streak':   return user.stats?.dailyStreak       || 0;
    case 'parties':  return user.stats?.partyParticipated || 0;
  }
}

async function fetchRankedUsers(type: LeaderboardType): Promise<any[]> {
  if (type === 'arcade') {
    const all = await UserModel.find({}).lean();
    return all
      .map(u => ({ ...u, _computed: getArcadeWins(u) }))
      .sort((a, b) => b._computed - a._computed);
  }

  const sortKey: Record<Exclude<LeaderboardType, 'arcade'>, string> = {
    messages: 'stats.totalMsg',
    vocal:    'stats.voiceTime',
    streak:   'stats.dailyStreak',
    parties:  'stats.partyParticipated',
  };

  return UserModel.find({}).sort({ [sortKey[type as keyof typeof sortKey]]: -1 }).lean();
}

function buildNavRow(current: LeaderboardType): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...Object.entries(TYPE_CONFIG).map(([key, { emoji, label }]) =>
      new ButtonBuilder()
        .setCustomId(`leaderboard_${key}`)
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(key === current ? ButtonStyle.Primary : ButtonStyle.Secondary),
    ),
  );
}

async function buildLeaderboardContainer(
  requesterId: string,
  client: BotClient,
  type: LeaderboardType,
): Promise<ContainerBuilder> {
  const { label, emoji, color, format } = TYPE_CONFIG[type];

  const allRanked = await fetchRankedUsers(type);
  const top10 = allRanked.slice(0, 10);

  const userRankIndex = allRanked.findIndex((u: any) => u.discordId === requesterId);
  const userValue = getUserValue(allRanked[userRankIndex], type);

  const lines: string[] = [];
  for (let i = 0; i < top10.length; i++) {
    const user = top10[i];
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
    const value = type === 'arcade' ? (user._computed ?? 0) : getUserValue(user, type);
    const isMe = user.discordId === requesterId;

    let username = `<@${user.discordId}>`;
    try {
      const fetched = await client.users.fetch(user.discordId);
      username = isMe ? `**__${fetched.username}__**` : `**${fetched.username}**`;
    } catch {}

    lines.push(`${medal} ${username} — ${format(value)}`);
  }

  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emoji} Classement ${label}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        lines.length > 0 ? lines.join('\n') : '*Aucune donnée disponible.*',
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false));

  if (userRankIndex === -1 || userValue === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# *Tu n'apparais pas encore dans ce classement.*`),
    );
  } else if (userRankIndex >= 10) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# *Ta position : **#${userRankIndex + 1}** — ${format(userValue)}*`,
      ),
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# *Tu es **#${userRankIndex + 1}** — ${format(userValue)}*`,
      ),
    );
  }

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addActionRowComponents(buildNavRow(type));

  return container;
}

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche les classements du serveur'),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    await interaction.deferReply();
    const container = await buildLeaderboardContainer(interaction.user.id, client, 'messages');
    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async handleButtonInteraction(interaction: ButtonInteraction, client: BotClient) {
    const type = interaction.customId.replace('leaderboard_', '') as LeaderboardType;
    await interaction.deferUpdate();
    const container = await buildLeaderboardContainer(interaction.user.id, client, type);
    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};

function formatVoiceTime(seconds: number): string {
  if (seconds === 0) return '0h';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
