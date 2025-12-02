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

    // Filtrer les catégories publiques (sans Administration)
    const publicCategories = categories.filter(cat => cat.name !== 'Administration');

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

    // Ajouter un aperçu de chaque catégorie publique
    for (const category of publicCategories) {
      mainEmbed.addFields({
        name: `${category.emoji} ${category.name}`,
        value: `${category.description}\n*${category.commands.length} commande${category.commands.length > 1 ? 's' : ''}*`,
        inline: false
      });
    }

    mainEmbed.setFooter({ text: 'Sélectionnez une catégorie pour voir les détails' });

    // Créer le menu de sélection (seulement catégories publiques)
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Choisissez une catégorie')
      .addOptions(
        publicCategories.map(cat => ({
          label: cat.name,
          description: cat.description.substring(0, 100), // Max 100 caractères pour Discord
          emoji: cat.emoji,
          value: cat.name
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    // Envoyer le message principal (public)
    const response = await interaction.reply({
      embeds: [mainEmbed],
      components: [row]
    });

    // Si l'utilisateur est admin, envoyer les commandes admin en éphémère
    if (isAdmin) {
      const adminCategory = categories.find(cat => cat.name === 'Administration');

      if (adminCategory) {
        const adminEmbed = new EmbedBuilder()
          .setTitle(`${adminCategory.emoji} ${adminCategory.name}`)
          .setDescription(adminCategory.description)
          .setColor(0xff6b6b)
          .setTimestamp();

        // Ajouter chaque commande admin
        for (const cmd of adminCategory.commands) {
          let fieldValue = cmd.description;
          if (cmd.usage && cmd.usage.trim()) {
            fieldValue += `\n\`\`\`/${cmd.name} ${cmd.usage}\`\`\``;
          } else {
            fieldValue += `\n\`\`\`/${cmd.name}\`\`\``;
          }
          adminEmbed.addFields({
            name: '\u200B', // Caractère invisible pour pas de titre
            value: fieldValue,
            inline: false
          });
        }

        adminEmbed.setFooter({ text: '⚠️ Ces commandes sont réservées aux administrateurs' });

        await interaction.followUp({
          embeds: [adminEmbed],
          ephemeral: true
        });
      }
    }

    const message = await response.fetch();

    // Créer un collector pour le menu
    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
      const selectedCategory = publicCategories.find(cat => cat.name === selectInteraction.values[0]);

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
        if (cmd.usage && cmd.usage.trim()) {
          fieldValue += `\n\`\`\`/${cmd.name} ${cmd.usage}\`\`\``;
        } else {
          fieldValue += `\n\`\`\`/${cmd.name}\`\`\``;
        }
        categoryEmbed.addFields({
          name: '\u200B', // Caractère invisible pour pas de titre
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
