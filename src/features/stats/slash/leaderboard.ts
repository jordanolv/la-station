import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import GuildUserModel from '../../user/models/guild-user.model';

export const LEADERBOARD_TYPE = {
  MESSAGES: 'messages',
  VOCAL: 'vocal',
  ARCADE: 'arcade',
  STREAK: 'streak',
  PARTIES: 'parties',
} as const;

type LeaderboardType = typeof LEADERBOARD_TYPE[keyof typeof LEADERBOARD_TYPE];

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche les classements du serveur'),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    await interaction.deferReply();

    // Afficher le classement messages par défaut
    await showLeaderboard(interaction, client, LEADERBOARD_TYPE.MESSAGES);
  },

  async handleButtonInteraction(interaction: ButtonInteraction, client: BotClient) {
    const type = interaction.customId.replace('leaderboard_', '') as LeaderboardType;
    await interaction.deferUpdate();
    await showLeaderboard(interaction, client, type, true);
  },
};

async function showLeaderboard(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  client: BotClient,
  type: LeaderboardType,
  isUpdate: boolean = false
) {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  let title = '';
  let emoji = '';
  let users: any[] = [];
  let sortField = '';
  let formatValue: (value: number) => string;

  switch (type) {
    case LEADERBOARD_TYPE.MESSAGES:
      title = 'Messages';
      emoji = '💬';
      sortField = 'stats.totalMsg';
      formatValue = (val) => `${val.toLocaleString()} msg`;
      users = await GuildUserModel.find({ guildId })
        .sort({ 'stats.totalMsg': -1 })
        .limit(10)
        .lean();
      break;

    case LEADERBOARD_TYPE.VOCAL:
      title = 'Temps Vocal';
      emoji = '🎤';
      sortField = 'stats.voiceTime';
      formatValue = (val) => formatVoiceTime(val);
      users = await GuildUserModel.find({ guildId })
        .sort({ 'stats.voiceTime': -1 })
        .limit(10)
        .lean();
      break;

    case LEADERBOARD_TYPE.ARCADE:
      title = 'Jeux d\'Arcade';
      emoji = '🎮';
      sortField = 'stats.arcade';
      formatValue = (val) => `${val} victoires`;
      // On va calculer le total des victoires arcade
      users = await GuildUserModel.find({ guildId }).lean();
      users = users
        .map((user: any) => ({
          ...user,
          totalArcadeWins: (user.stats?.arcade?.shifumi?.wins || 0) +
                           (user.stats?.arcade?.puissance4?.wins || 0) +
                           (user.stats?.arcade?.morpion?.wins || 0) +
                           (user.stats?.arcade?.battle?.wins || 0)
        }))
        .sort((a: any, b: any) => b.totalArcadeWins - a.totalArcadeWins)
        .slice(0, 10);
      break;

    case LEADERBOARD_TYPE.STREAK:
      title = 'Streak';
      emoji = '🔥';
      sortField = 'stats.dailyStreak';
      formatValue = (val) => `${val} jours`;
      users = await GuildUserModel.find({ guildId })
        .sort({ 'stats.dailyStreak': -1 })
        .limit(10)
        .lean();
      break;

    case LEADERBOARD_TYPE.PARTIES:
      title = 'Soirées';
      emoji = '🎉';
      sortField = 'stats.partyParticipated';
      formatValue = (val) => `${val} soirées`;
      users = await GuildUserModel.find({ guildId })
        .sort({ 'stats.partyParticipated': -1 })
        .limit(10)
        .lean();
      break;
  }

  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Classement ${title}`)
    .setColor(0xdac1ff)
    .setTimestamp();

  // Trouver la position de l'utilisateur
  let userPosition = -1;
  let userValue = 0;

  const userDoc = await GuildUserModel.findOne({ discordId: userId, guildId });

  if (type === LEADERBOARD_TYPE.ARCADE) {
    const allUsers = await GuildUserModel.find({ guildId }).lean();
    const sortedUsers = allUsers
      .map((user: any) => ({
        ...user,
        totalArcadeWins: (user.stats?.arcade?.shifumi?.wins || 0) +
                         (user.stats?.arcade?.puissance4?.wins || 0) +
                         (user.stats?.arcade?.morpion?.wins || 0) +
                         (user.stats?.arcade?.battle?.wins || 0)
      }))
      .sort((a: any, b: any) => b.totalArcadeWins - a.totalArcadeWins);

    userPosition = sortedUsers.findIndex((u: any) => u.discordId === userId) + 1;
    userValue = (userDoc?.stats?.arcade?.shifumi?.wins || 0) +
                (userDoc?.stats?.arcade?.puissance4?.wins || 0) +
                (userDoc?.stats?.arcade?.morpion?.wins || 0) +
                (userDoc?.stats?.arcade?.battle?.wins || 0);
  } else {
    const allUsers = await GuildUserModel.find({ guildId })
      .sort({ [sortField]: -1 })
      .lean();
    userPosition = allUsers.findIndex((u: any) => u.discordId === userId) + 1;

    if (sortField === 'stats.totalMsg') {
      userValue = userDoc?.stats?.totalMsg || 0;
    } else if (sortField === 'stats.voiceTime') {
      userValue = userDoc?.stats?.voiceTime || 0;
    } else if (sortField === 'stats.dailyStreak') {
      userValue = userDoc?.stats?.dailyStreak || 0;
    } else if (sortField === 'stats.partyParticipated') {
      userValue = userDoc?.stats?.partyParticipated || 0;
    }
  }

  // Générer le top 10
  let description = '';
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const position = i + 1;
    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;

    let value = 0;
    const userIdToFetch = user.discordId;

    if (type === LEADERBOARD_TYPE.ARCADE) {
      value = user.totalArcadeWins || 0;
    } else if (sortField === 'stats.totalMsg') {
      value = user.stats?.totalMsg || 0;
    } else if (sortField === 'stats.voiceTime') {
      value = user.stats?.voiceTime || 0;
    } else if (sortField === 'stats.dailyStreak') {
      value = user.stats?.dailyStreak || 0;
    } else if (sortField === 'stats.partyParticipated') {
      value = user.stats?.partyParticipated || 0;
    }

    try {
      const discordUser = await client.users.fetch(userIdToFetch);
      const highlight = userIdToFetch === userId ? '**' : '';
      description += `${medal} ${highlight}${discordUser.username}${highlight} • ${formatValue(value)}\n`;
    } catch (error) {
      // User not found, skip
    }
  }

  embed.setDescription(description || 'Aucune donnée disponible');

  // Ajouter la position de l'utilisateur
  if (userPosition > 0) {
    embed.setFooter({
      text: `Votre position : #${userPosition} • ${formatValue(userValue)}`,
      iconURL: interaction.user.displayAvatarURL(),
    });
  }

  // Créer les boutons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('leaderboard_messages')
      .setLabel('Messages')
      .setEmoji('💬')
      .setStyle(type === LEADERBOARD_TYPE.MESSAGES ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('leaderboard_vocal')
      .setLabel('Vocal')
      .setEmoji('🎤')
      .setStyle(type === LEADERBOARD_TYPE.VOCAL ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('leaderboard_arcade')
      .setLabel('Arcade')
      .setEmoji('🎮')
      .setStyle(type === LEADERBOARD_TYPE.ARCADE ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('leaderboard_streak')
      .setLabel('Streak')
      .setEmoji('🔥')
      .setStyle(type === LEADERBOARD_TYPE.STREAK ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('leaderboard_parties')
      .setLabel('Soirées')
      .setEmoji('🎉')
      .setStyle(type === LEADERBOARD_TYPE.PARTIES ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  if (isUpdate) {
    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } else {
    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  }
}

/**
 * Formate le temps vocal en heures et minutes
 */
function formatVoiceTime(seconds: number): string {
  if (seconds === 0) return '0h';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}
