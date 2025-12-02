import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import commandsConfig from '../../../config/commands.json';

interface CommandInfo {
  name: string;
  description: string;
  usage: string;
}

interface Category {
  name: string;
  emoji: string;
  description: string;
  commands: CommandInfo[];
}

const categories: Category[] = commandsConfig.categories as Category[];

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles'),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    // Vérifier si l'utilisateur est admin
    const isAdmin = interaction.memberPermissions?.has('Administrator') || false;

    // Filtrer les catégories selon les permissions
    const filteredCategories = categories.filter(cat => {
      // Masquer la catégorie Admin si l'utilisateur n'est pas admin
      if (cat.name === 'Administration' && !isAdmin) {
        return false;
      }
      return true;
    });

    // Créer l'embed principal
    const mainEmbed = new EmbedBuilder()
      .setTitle('📖 Guide des commandes')
      .setDescription(
        'Bienvenue sur **La Station** ! Voici toutes les commandes disponibles.\n\n' +
        '**Sélectionnez une catégorie ci-dessous pour en savoir plus.**'
      )
      .setColor(0xdac1ff)
      .setThumbnail(client.user?.displayAvatarURL() || '')
      .setTimestamp();

    // Ajouter un aperçu de chaque catégorie
    for (const category of filteredCategories) {
      mainEmbed.addFields({
        name: `${category.emoji} ${category.name}`,
        value: `${category.description}\n*${category.commands.length} commande${category.commands.length > 1 ? 's' : ''}*`,
        inline: false
      });
    }

    mainEmbed.setFooter({ text: 'Sélectionnez une catégorie pour voir les détails' });

    // Créer le menu de sélection
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Choisissez une catégorie')
      .addOptions(
        filteredCategories.map(cat => ({
          label: cat.name,
          description: cat.description.substring(0, 100), // Max 100 caractères pour Discord
          emoji: cat.emoji,
          value: cat.name
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    // Utiliser withResponse au lieu de fetchReply
    const response = await interaction.reply({
      embeds: [mainEmbed],
      components: [row]
    });

    const message = await response.fetch();

    // Créer un collector pour le menu
    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
      const selectedCategory = filteredCategories.find(cat => cat.name === selectInteraction.values[0]);

      if (!selectedCategory) {
        await selectInteraction.reply({
          content: '❌ Catégorie introuvable.',
          ephemeral: true
        });
        return;
      }

      // Créer l'embed pour la catégorie sélectionnée
      const categoryEmbed = new EmbedBuilder()
        .setTitle(`${selectedCategory.emoji} ${selectedCategory.name}`)
        .setDescription(selectedCategory.description)
        .setColor(0xdac1ff)
        .setTimestamp();

      // Ajouter chaque commande de la catégorie
      for (const cmd of selectedCategory.commands) {
        let fieldValue = cmd.description;
        if (cmd.usage) {
          fieldValue += `\n\`\`\`${cmd.usage}\`\`\``;
        }
        categoryEmbed.addFields({
          name: `/${cmd.name}`,
          value: fieldValue,
          inline: false
        });
      }

      categoryEmbed.setFooter({ text: 'Utilisez le menu pour voir d\'autres catégories' });

      await selectInteraction.update({
        embeds: [categoryEmbed],
        components: [row]
      });
    });

    collector.on('end', async () => {
      // Désactiver le menu après expiration
      try {
        const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>()
          .addComponents(
            StringSelectMenuBuilder.from(selectMenu).setDisabled(true)
          );

        await interaction.editReply({
          components: [disabledRow]
        });
      } catch (error) {
        // Ignore si le message a été supprimé
      }
    });
  }
};
