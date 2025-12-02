import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ChannelType,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import LFMService from '../services/lfm.service';
import GameDBService from '../services/game-db.service';

export const GAME_SELECT_ID = 'lfm-game-select';
export const MODE_SELECT_ID = 'lfm-mode-select';
export const CUSTOM_GAME_MODAL_ID = 'lfm-custom-game-modal';
export const CUSTOM_GAME_INPUT_ID = 'lfm-custom-game-input';
export const FINAL_MODAL_ID_PREFIX = 'lfm-final-modal';
export const MATES_INPUT_ID = 'lfm-mates';
export const RANK_INPUT_ID = 'lfm-rank';
export const TIME_INPUT_ID = 'lfm-time';
export const DESCRIPTION_INPUT_ID = 'lfm-description';

// Store selected games per user
const userGameSelections = new Map<string, string>();

export default {
  data: new SlashCommandBuilder()
    .setName('lfm')
    .setDescription('🎮 Looking For Mate - Créer une annonce pour trouver des coéquipiers'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    try {
      await this.showGameSelect(interaction);
    } catch (error) {
      console.error('Error in /lfm command:', error);
      const errorMessage = '❌ Une erreur est survenue lors de l\'exécution de la commande.';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
      }
    }
  },

  /**
   * Step 1: Show game select menu
   */
  async showGameSelect(interaction: ChatInputCommandInteraction) {
    // Check if user has too many active requests
    const hasLimit = await LFMService.hasReachedLimit(
      interaction.user.id,
      interaction.guildId!,
      3
    );

    if (hasLimit) {
      await interaction.reply({
        content: '❌ Vous avez atteint la limite de 3 annonces actives. Veuillez annuler ou compléter une annonce existante avant d\'en créer une nouvelle.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Get games from database
    const games = await GameDBService.getGames(interaction.guildId!);

    if (games.length === 0) {
      await interaction.reply({
        content: '❌ Aucun jeu n\'est configuré sur ce serveur. Contactez un administrateur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Create select menu with games + "Autre jeu" option
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(GAME_SELECT_ID)
      .setPlaceholder('Sélectionnez un jeu')
      .addOptions(
        [
          ...games.slice(0, 24).map((game) => {
            const option: any = {
              label: game.name,
              value: game.name,
            };

            if (game.description && game.description.trim().length > 0) {
              option.description = game.description.substring(0, 100);
            }

            return option;
          }),
          {
            label: '➕ Autre jeu',
            value: '__other__',
            description: 'Entrer un jeu personnalisé',
          },
        ]
      );

    const gameRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    // Add mode select menu
    const modeSelect = new StringSelectMenuBuilder()
      .setCustomId(MODE_SELECT_ID)
      .setPlaceholder('Sélectionnez le mode')
      .addOptions(
        {
          label: '🏆 Ranked',
          value: 'Ranked',
          description: 'Partie compétitive classée'
        },
        {
          label: '😎 Casual',
          value: 'Casual',
          description: 'Partie décontractée'
        },
        {
          label: '🔒 Privé',
          value: 'Privé',
          description: 'Partie privée entre amis'
        }
      );

    const modeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);

    await interaction.reply({
      content: '🎮 **Étape 1/2** : Sélectionnez le jeu et le mode :',
      components: [gameRow, modeRow],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * Handle game selection
   */
  async handleGameSelect(interaction: StringSelectMenuInteraction, _client: BotClient) {
    try {
      const selectedGame = interaction.values[0];

      // If "Autre jeu", show modal to enter custom game
      if (selectedGame === '__other__') {
        const modal = new ModalBuilder()
          .setCustomId(CUSTOM_GAME_MODAL_ID)
          .setTitle('🎮 Entrez le nom du jeu');

        const gameInput = new TextInputBuilder()
          .setCustomId(CUSTOM_GAME_INPUT_ID)
          .setLabel('Nom du jeu')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Minecraft, Fortnite, CS2...')
          .setRequired(true)
          .setMaxLength(100);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(gameInput));

        await interaction.showModal(modal);
        return;
      }

      // Store the selected game for this user
      userGameSelections.set(interaction.user.id, selectedGame);

      // Just acknowledge the selection
      await interaction.update({
        content: `🎮 **${selectedGame}** sélectionné ! Maintenant choisissez le mode :`,
      });
    } catch (error) {
      console.error('Error handling game select:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Handle mode selection - this is where we open the final modal
   */
  async handleModeSelect(interaction: StringSelectMenuInteraction, _client: BotClient) {
    try {
      const selectedGame = userGameSelections.get(interaction.user.id);

      if (!selectedGame) {
        await interaction.reply({
          content: '❌ Veuillez d\'abord sélectionner un jeu.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const selectedMode = interaction.values[0];

      // Clean up the stored selection
      userGameSelections.delete(interaction.user.id);

      // Open the final modal
      await this.showFinalModal(interaction as any, selectedGame, selectedMode);
    } catch (error) {
      console.error('Error handling mode select:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Handle custom game modal
   */
  async handleCustomGameModal(interaction: ModalSubmitInteraction, _client: BotClient) {
    try {
      const customGame = interaction.fields.getTextInputValue(CUSTOM_GAME_INPUT_ID).trim();

      // Store the custom game for this user
      userGameSelections.set(interaction.user.id, customGame);

      // Create the game and mode select menus
      const gameSelect = new StringSelectMenuBuilder()
        .setCustomId(GAME_SELECT_ID)
        .setPlaceholder(customGame)
        .addOptions({
          label: customGame,
          value: customGame,
          default: true
        });

      const gameRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gameSelect);

      const modeSelect = new StringSelectMenuBuilder()
        .setCustomId(MODE_SELECT_ID)
        .setPlaceholder('Sélectionnez le mode')
        .addOptions(
          {
            label: '🏆 Ranked',
            value: 'Ranked',
            description: 'Partie compétitive classée'
          },
          {
            label: '😎 Casual',
            value: 'Casual',
            description: 'Partie décontractée'
          },
          {
            label: '🔒 Privé',
            value: 'Privé',
            description: 'Partie privée entre amis'
          }
        );

      const modeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);

      await interaction.reply({
        content: `🎮 **${customGame}** sélectionné ! Maintenant choisissez le mode :`,
        components: [gameRow, modeRow],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error handling custom game modal:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  /**
   * Step 2: Show final modal (all info in one modal)
   */
  async showFinalModal(
    interaction: ButtonInteraction,
    gameName: string,
    mode: string
  ) {
    const isRanked = mode === 'Ranked';

    const modal = new ModalBuilder()
      .setCustomId(`${FINAL_MODAL_ID_PREFIX}_${gameName}_${mode}`)
      .setTitle(`🎮 ${gameName} - ${mode}`);

    const matesInput = new TextInputBuilder()
      .setCustomId(MATES_INPUT_ID)
      .setLabel('Nombre de joueurs recherchés')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 2 pour du 3v3')
      .setRequired(true)
      .setMaxLength(2);

    const timeInput = new TextInputBuilder()
      .setCustomId(TIME_INPUT_ID)
      .setLabel('Heure de la session')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 20h30, Maintenant, Dans 1h...')
      .setRequired(false)
      .setMaxLength(50);

    const components = [
      new ActionRowBuilder<TextInputBuilder>().addComponents(matesInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
    ];

    // Add rank field only for Ranked mode
    if (isRanked) {
      const rankInput = new TextInputBuilder()
        .setCustomId(RANK_INPUT_ID)
        .setLabel('Rank minimum requis')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Champ 3, GC 2, Tous niveaux...')
        .setRequired(false)
        .setMaxLength(50);

      components.push(new ActionRowBuilder<TextInputBuilder>().addComponents(rankInput));
    }

    modal.addComponents(...components);
    await interaction.showModal(modal);
  },

  /**
   * Step 2: Handle final modal and create LFM request
   */
  async handleFinalModal(interaction: ModalSubmitInteraction, _client: BotClient) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Extract game name and mode from modal customId
      const parts = interaction.customId.replace(`${FINAL_MODAL_ID_PREFIX}_`, '').split('_');
      const mode = parts.pop() || 'Casual';
      const game = parts.join('_');
      const isRanked = mode === 'Ranked';

      // Get input values
      const matesRaw = interaction.fields.getTextInputValue(MATES_INPUT_ID).trim();
      const time = interaction.fields.getTextInputValue(TIME_INPUT_ID)?.trim() || undefined;
      const rank = isRanked
        ? interaction.fields.getTextInputValue(RANK_INPUT_ID)?.trim() || 'Tous niveaux'
        : mode;

      // Validate number of mates
      const numberOfMates = parseInt(matesRaw, 10);
      if (isNaN(numberOfMates) || numberOfMates < 1 || numberOfMates > 10) {
        await interaction.editReply({
          content: '❌ Le nombre de places doit être un nombre entre 1 et 10.',
        });
        return;
      }

      // Add +1 to include the creator in the total
      const totalSlots = numberOfMates + 1;

      // Create LFM request
      const request = await LFMService.createRequest({
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId!,
        game,
        numberOfMates: totalSlots,
        rank,
        sessionTime: time,
      });

      // Get game color and banner
      const gameColor = await GameDBService.getGameColor(interaction.guildId!, game);
      const gameBanner = await GameDBService.getGameBanner(interaction.guildId!, game);

      // Create embed and buttons
      const embed = LFMService.createLFMEmbed(request, interaction.user, gameColor, gameBanner);
      const buttons = LFMService.createLFMButtons(request._id.toString(), true);

      // Try to find a LFM channel or use current channel
      const guild = interaction.guild;
      let targetChannel = interaction.channel;

      if (guild) {
        const lfmChannel = guild.channels.cache.find(
          (ch) =>
            ch.type === ChannelType.GuildText &&
            (ch.name.includes('lfm') || ch.name.includes('looking-for') || ch.name.includes('mate'))
        );
        if (lfmChannel && lfmChannel.isTextBased()) {
          targetChannel = lfmChannel;
        }
      }

      // Post the LFM request
      if (targetChannel && targetChannel.isTextBased()) {
        const message = await targetChannel.send({
          embeds: [embed],
          components: [buttons],
        });

        // Create a thread on the message
        const thread = await message.startThread({
          name: `${game} - ${interaction.user.username}`,
          autoArchiveDuration: 1440, // 24 hours
          reason: 'LFM lobby thread'
        });

        // Add the creator to the thread
        await thread.members.add(interaction.user.id);

        // Update request with message info
        await LFMService.updateMessageInfo(request._id.toString(), message.id, targetChannel.id, thread.id);

        await interaction.editReply({
          content: `✅ Votre annonce LFM a été créée avec succès dans <#${targetChannel.id}> !\nUn thread a été créé : ${thread.toString()}`,
        });
      } else {
        await interaction.editReply({
          content: '✅ Votre annonce LFM a été créée avec succès !',
        });
      }
    } catch (error) {
      console.error('Error handling final modal:', error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue lors de la création de votre annonce.',
      });
    }
  },
};
