import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../../BotClient.js';
import { UserService } from '../../../../database/services/UserService.js';
import { IGuildUser } from '../../../../database/models/GuildUser.js';
import { formatDate, formatTime } from '../../../utils/DateFormat.js';
import { GuildService } from '../../../../database/services/GuildService.js';

async function createProgressBar(user: IGuildUser, current: number, total: number, size = 10): Promise<string> {
  const xpForCurrentLevel = await UserService.getXpToLevelUp(user.profil.lvl);
  const xpForPreviousLevel = user.profil.lvl > 1 ? await UserService.getXpToLevelUp(user.profil.lvl - 1) : 0;
  
  // Calculate XP relative to current level
  const currentLevelXp = user.profil.exp - xpForPreviousLevel;
  const xpNeededForThisLevel = xpForCurrentLevel - xpForPreviousLevel;
  
  const percentage = currentLevelXp / xpNeededForThisLevel;
  const progress = Math.round(size * percentage);
  const empty = size - progress;
  
  return `\`${'▰'.repeat(progress)}${'▱'.repeat(empty)}\` \`${currentLevelXp}/${xpNeededForThisLevel}\``;
}

export default {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Afficher vos informations personnelles'),
  async execute(client: BotClient, interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({
          content: '❌ Cette commande doit être utilisée dans un serveur.',
          ephemeral: true
        });
        return;
      }

      const user = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guild.id);
      const guild = await GuildService.getGuildById(interaction.guild.id);
      if (!guild) {
        await interaction.reply({
          content: '❌ Serveur non trouvé.',
          ephemeral: true
        });
        return;
      }

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé.',
          ephemeral: true
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(parseInt(guild.config.colors.primary.replace('#', ''), 16))
        .setTitle(`👤 Profil de ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 1024 }))
        .setDescription(user.bio || 'Aucune bio définie.')
        .addFields(
          {
            name: '💼 Statistiques Générales',
            value: [
              `Argent : \`${user.profil.money.toLocaleString('fr-FR')}\`  <:solar:1361687030626779166>`,
              `Niveau : \`${user.profil.lvl}\``,
              `XP : ${await createProgressBar(user, user.profil.exp, await UserService.getXpToLevelUp(user.profil.lvl))}`,
            ].join('\n'),
            inline: false
          },
          {
            name: '📊 Stats',
            value: [
              `Messages : \`${user.stats.totalMsg}\``,
              `Temps en vocal : \`${formatTime(user.stats.voiceTime || 0)}\` \n(\`${formatTime((await UserService.getVoiceStatsLast7Days(interaction.user.id, interaction.guild.id)).reduce((acc, curr) => acc + curr.time, 0))}\` 7 jours)`
            ].join('\n'),
            inline: true
          },
          {
            name: '📅 Informations',
            value: [
              `Anniversaire : \`${user.infos.birthDate ? formatDate(user.infos.birthDate) : 'Non défini'}\``,
              `Inscrit depuis : \`${formatDate(user.infos.registeredAt)}\``,
            ].join('\n'),
            inline: true
          }
        )
        .setFooter({ 
          text: '🛠️ Dernière mise à jour',
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp(user.infos.updatedAt);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur dans la commande /me:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true
        });
      }
    }
  }
};
