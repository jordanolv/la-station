import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../../../BotClient';
import { UserService } from '@database/services/UserService';
import { IGuildUser } from '@/database/models/GuildUser';
import { formatDate, formatTime } from '../../../../utils/DateFormat';

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
    .setDescription('Afficher ou mettre à jour vos informations personnelles')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Afficher vos informations personnelles'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Mettre à jour une de vos informations')
        .addStringOption(option =>
          option.setName('field')
            .setDescription('Le champ à mettre à jour')
            .setRequired(true)
            .addChoices(
              { name: 'Bio', value: 'bio' },
              { name: 'Date de naissance', value: 'birthdate' }
            ))
        .addStringOption(option =>
          option.setName('value')
            .setDescription('La nouvelle valeur (format date: JJ/MM/AAAA)')
            .setRequired(true))),

  async execute(client: BotClient, interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      // ──────── /me view ────────
      if (subcommand === 'view') {
        const user = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guild.id);

        if (!user) {
          await interaction.reply({
            content: '❌ Utilisateur non trouvé.',
            ephemeral: true
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#00ffe1')
          .setTitle(`👤 Profil de ${interaction.user.username}`)
          .setThumbnail(interaction.user.displayAvatarURL({ size: 1024 }))
          .setDescription(user.bio || 'Aucune bio définie.')
          .addFields(
            {
              name: '💼 Statistiques Générales',
              value: [
                `Argent : \`${user.profil.money.toLocaleString('fr-FR')}\`  <:solar:1360719775197822976>`,
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
        return;
      }

      // ──────── /me update ────────
      if (subcommand === 'update') {
        const field = interaction.options.getString('field', true);
        const value = interaction.options.getString('value', true);
        const updateData: any = {};

        if (field === 'bio') {
          updateData.bio = value;
        } else if (field === 'birthdate') {
          const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          const match = value.match(dateRegex);

          if (!match) {
            await interaction.reply({
              content: '❌ Format de date invalide. Utilisez le format JJ/MM/AAAA (ex: 21/12/1996)',
              ephemeral: true
            });
            return;
          }

          const [_, day, month, year] = match;
          const date = new Date(`${year}-${month}-${day}`);

          if (isNaN(date.getTime())) {
            await interaction.reply({
              content: '❌ Date invalide. Vérifiez que le jour et le mois sont corrects.',
              ephemeral: true
            });
            return;
          }

          updateData['infos.birthDate'] = date;
        }

        const updatedUser = await UserService.updateGuildUser(interaction.user.id, interaction.guild.id, updateData);

        if (!updatedUser) {
          await interaction.reply({
            content: '❌ Utilisateur non trouvé.',
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: '✅ Votre information a été mise à jour avec succès!',
          ephemeral: true
        });
      }
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
