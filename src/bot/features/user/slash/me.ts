import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../../BotClient';
import UserModel from '../../../../database/models/User';
import { UserService } from '@database/services/UserService';

function formatDate(date: Date): string { 
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function createProgressBar(current: number, total: number, size = 20): string {
  const percentage = current / total;
  const progress = Math.round(size * percentage);
  const empty = size - progress;
  return `[\`${'█'.repeat(progress)}${'░'.repeat(empty)}\`] \`${current}/${total}\``;
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
        const user = await UserService.getUserByDiscordId(interaction.user.id);

        if (!user) {
          await interaction.reply({
            content: '❌ Utilisateur non trouvé.',
            ephemeral: true
          });
          return;
        }

const embed = new EmbedBuilder()
  .setColor('#00ffe1') // turquoise flashy
  .setTitle(`👤 Profil de ${interaction.user.username}`)
  .setThumbnail(interaction.user.displayAvatarURL({ size: 1024 }))
  .setDescription(`✨ Voici les infos de ton compte, mises à jour avec style !`)
  .addFields(
    {
      name: '💼 Statistiques Générales',
      value: [
        `💰 **Argent** : \`${user.profil.money.toLocaleString('fr-FR')} 💸\``,
        `📊 **Niveau** : \`${user.profil.lvl}\``,
        `⭐ **XP** : \`${user.profil.exp} XP\``,
        `🔋 **Progression XP** : ${createProgressBar(user.profil.exp % 100, 100)}`
      ].join('\n'),
      inline: false
    },
    {
      name: '🧠 Bio',
      value: user.bio || '_Aucune bio définie._',
      inline: false
    },
    {
      name: '📅 Informations',
      value: [
        `🗓️ **Anniversaire** : \`${user.infos.birthDate ? formatDate(user.infos.birthDate) : 'Non défini'}\``,
        `📆 **Inscription** : \`${formatDate(user.infos.registeredAt)}\``,
        `💬 **Messages** : \`${user.stats.totalMsg}\``
      ].join('\n'),
      inline: false
    }
  )
  .setFooter({ text: '🛠️ Dernière mise à jour' })
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

        const updatedUser = await UserService.updateUser(interaction.user.id, updateData);

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
