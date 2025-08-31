import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, TextChannel, AutocompleteInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ButtonData {
  label: string;
  url: string;
  emoji?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
}

interface EmbedData {
  banniere: string;
  titre: string;
  description: string;
  color?: string;
  image?: string | null;
  imageColor?: string; // couleur pour l'embed image séparé
  separateImage?: boolean; // true = image dans un embed séparé, false = image dans le même embed
  buttons?: ButtonData[];
}

interface EmbedsConfig {
  embeds: EmbedData[];
}

export default {
  data: new SlashCommandBuilder()
    .setName('send-embeds')
    .setDescription('Envoie tous les embeds configurés dans le JSON')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option.setName('json')
        .setDescription('Le fichier JSON à utiliser')
        .setRequired(false)
        .setAutocomplete(true)),

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const srcDataDir = path.resolve(process.cwd(), 'src', 'features', 'admin', 'data');
      const distDataDir = path.resolve(process.cwd(), 'dist', 'features', 'admin', 'data');
      
      let dataDir = '';
      
      try {
        await fs.access(srcDataDir);
        dataDir = srcDataDir;
      } catch {
        try {
          await fs.access(distDataDir);
          dataDir = distDataDir;
        } catch {
          await interaction.respond([{ name: 'Infos (défaut)', value: 'infos.json' }]);
          return;
        }
      }

      const files = await fs.readdir(dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        await interaction.respond([{ name: 'Aucun fichier JSON trouvé', value: 'infos.json' }]);
        return;
      }

      const focusedValue = interaction.options.getFocused();
      const filtered = jsonFiles.filter(file => 
        file.toLowerCase().includes(focusedValue.toLowerCase())
      );

      await interaction.respond(
        filtered.slice(0, 25).map(file => ({
          name: file.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          value: file
        }))
      );
    } catch (error) {
      await interaction.respond([{ name: 'Erreur - Utiliser par défaut', value: 'infos.json' }]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          flags: [64] 
        });
      }

      const targetChannel = interaction.channel as TextChannel;
      
      if (!targetChannel || !targetChannel.isTextBased()) {
        return interaction.reply({
          content: '❌ Cette commande doit être utilisée dans un channel textuel.',
          flags: [64] 
        });
      }

      // Charger les données JSON
      const selectedJson = interaction.options.getString('json') || 'infos.json';
      const srcPath = path.resolve(process.cwd(), 'src', 'features', 'admin', 'data', selectedJson);
      const distPath = path.resolve(process.cwd(), 'dist', 'features', 'admin', 'data', selectedJson);
      
      let embedsData: EmbedsConfig;

      try {
        const jsonContent = await fs.readFile(srcPath, 'utf-8');
        embedsData = JSON.parse(jsonContent);
      } catch (error) {
        try {
          const jsonContent = await fs.readFile(distPath, 'utf-8');
          embedsData = JSON.parse(jsonContent);
        } catch (distError) {
          return interaction.reply({
            content: `❌ Impossible de charger le fichier: ${selectedJson}`,
            flags: [64] 
          });
        }
      }

      // Validation des données
      if (!embedsData.embeds || !Array.isArray(embedsData.embeds) || embedsData.embeds.length === 0) {
        return interaction.reply({
          content: '❌ Aucun embed trouvé dans le fichier de configuration.',
          flags: [64] 
        });
      }

      // Répondre immédiatement pour éviter le timeout
      await interaction.reply({
        content: `📨 Envoi en cours de ${embedsData.embeds.length} embed(s) dans ${targetChannel}...`,
        flags: [64] 
      });

      // Envoyer chaque embed
      let sentCount = 0;
      for (const embedData of embedsData.embeds) {
        try {
          // Vérifier si l'image doit être séparée (par défaut: true)
          const shouldSeparateImage = embedData.separateImage !== false;

          // Si il y a une image ET qu'elle doit être séparée
          if (embedData.image && shouldSeparateImage) {
            const imageEmbed = new EmbedBuilder()
              .setImage(embedData.image);

            // Ajouter la couleur de l'image si spécifiée
            if (embedData.imageColor) {
              imageEmbed.setColor(embedData.imageColor as any);
            }

            await targetChannel.send({ embeds: [imageEmbed] });
            
            // Petite pause entre l'image et le texte
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Créer l'embed principal avec le contenu
          const contentEmbed = new EmbedBuilder();

          // Ajouter le titre seulement s'il existe
          if (embedData.titre && embedData.titre.trim() !== '') {
            contentEmbed.setTitle(embedData.titre);
          }

          // Ajouter la description seulement si elle existe
          if (embedData.description && embedData.description.trim() !== '') {
            contentEmbed.setDescription(embedData.description);
          }

          // Si l'image ne doit PAS être séparée, l'ajouter à cet embed
          if (embedData.image && !shouldSeparateImage) {
            contentEmbed.setImage(embedData.image);
          } else {
            // Ajouter l'image transparente par défaut
            contentEmbed.setImage('https://cdn.discordapp.com/attachments/793461443668344852/1411718552507121825/barre-transparent.png?ex=68b5acdb&is=68b45b5b&hm=a02b1b4219c8ff3fcc755f66cf472558d129c00e67b51c52ad55c75b6331756f&');
          }

          if (embedData.color) {
            contentEmbed.setColor(embedData.color as any);
          }

          // Créer les boutons si spécifiés
          const components = [];
          if (embedData.buttons && embedData.buttons.length > 0) {
            const buttons = embedData.buttons.slice(0, 5).map(buttonData => {
              const button = new ButtonBuilder()
                .setURL(buttonData.url)
                .setStyle(ButtonStyle.Link);

              if (buttonData.emoji) {
                button.setEmoji(buttonData.emoji);
              }

              return button;
            });

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(...buttons);
            
            components.push(actionRow);
          }

          await targetChannel.send({ 
            embeds: [contentEmbed],
            components: components
          });
          sentCount++;

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (embedError) {
          console.error(`Erreur lors de l'envoi de l'embed "${embedData.titre}":`, embedError);
          continue;
        }
      }

      await interaction.followUp({
        content: `✅ ${sentCount}/${embedsData.embeds.length} embed(s) envoyé(s) avec succès dans ${targetChannel} !`,
        flags: [64] 
      });

    } catch (error) {
      console.error('Erreur dans la commande send-embeds:', error);
      
      if (interaction.replied) {
        await interaction.followUp({
          content: '❌ Une erreur est survenue lors de l\'envoi des embeds.',
          flags: [64] 
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'envoi des embeds.',
          flags: [64] 
        });
      }
    }
  }
};