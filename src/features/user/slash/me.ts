import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../../bot/client';
import GuildUserModel from '../models/guild-user.model';
import { UserService } from '../services/guildUser.service';
import { formatDate, formatTime } from '../../../shared/utils/date-format';

async function createProgressBar(user: any, current: number, total: number, size = 10): Promise<string> {
  // Calcul de l'XP nécessaire pour les niveaux
  const getXpToLevelUp = (lvl: number): number => {
    return 5 * (lvl * lvl) + 110 * lvl + 100;
  };

  const xpForCurrentLevel = getXpToLevelUp(user.profil.lvl);
  const xpForPreviousLevel = user.profil.lvl > 1 ? getXpToLevelUp(user.profil.lvl - 1) : 0;
  
  // Calcul de l'XP relative au niveau actuel
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
      if (!interaction.guildId) {
        await interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          ephemeral: true
        });
        return;
      }

      const user = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guildId);

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé dans la base de données.',
          ephemeral: true
        });
        return;
      }

      // Calcul du temps vocal des 7 derniers jours
      const voiceTimeLast7Days = await UserService.getVoiceStatsLast7Days(interaction.user.id, interaction.guildId)
        .then(stats => stats.reduce((acc, curr) => acc + curr.time, 0));

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`👤 Profil de ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 1024 }))
        .setDescription(user.bio || 'Aucune bio définie.')
        .addFields(
          {
            name: '💼 Statistiques Générales',
            value: [
              `Argent : \`${user.profil.money.toLocaleString('fr-FR')}\` <:solar:1361687030626779166>`,
              `Niveau : \`${user.profil.lvl}\``,
              `XP : ${await createProgressBar(user, user.profil.exp, 0)}`,
            ].join('\n'),
            inline: false
          },
          {
            name: '📊 Stats',
            value: [
              `Messages : \`${user.stats.totalMsg}\``,
              `Temps en vocal : \`${formatTime(user.stats.voiceTime || 0)}\` \n(\`${formatTime(voiceTimeLast7Days)}\` 7 jours)`
            ].join('\n'),
            inline: true
          },
          {
            name: '📅 Informations',
            value: [
              `Anniversaire : \`${user.infos.birthDate ? formatDate(user.infos.birthDate) : 'Non défini'}\``,
              `Inscrit depuis : \`${formatDate(user.infos.registeredAt || new Date())}\``,
            ].join('\n'),
            inline: true
          }
        )
        .setFooter({ 
          text: '🛠️ Dernière mise à jour',
          iconURL: interaction.client.user?.displayAvatarURL() || undefined
        })
        .setTimestamp(user.infos.updatedAt || new Date());

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