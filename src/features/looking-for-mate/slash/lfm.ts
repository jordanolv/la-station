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
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import LFMService from '../services/lfm.service';
import GameDBService from '../services/game-db.service';

export const GAME_SELECT_ID = 'lfm-game-select';
export const CUSTOM_GAME_MODAL_ID = 'lfm-custom-game-modal';
export const CUSTOM_GAME_INPUT_ID = 'lfm-custom-game-input';
export const RANKED_BUTTON_ID = 'lfm-ranked-btn';
export const CASUAL_BUTTON_ID = 'lfm-casual-btn';
export const PRIVATE_BUTTON_ID = 'lfm-private-btn';
export const RANK_MODAL_ID_PREFIX = 'lfm-rank-modal';
export const RANK_MIN_INPUT_ID = 'lfm-rank-min';
export const RANK_MAX_INPUT_ID = 'lfm-rank-max';
export const CONTINUE_BUTTON_ID = 'lfm-continue-btn';
export const FINAL_MODAL_ID_PREFIX = 'lfm-final-modal';
export const MATES_INPUT_ID = 'lfm-mates';
export const DESCRIPTION_INPUT_ID = 'lfm-description';

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

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      content: '🎮 **Étape 1/4** : Sélectionnez le jeu pour lequel vous cherchez des coéquipiers :',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * Step 2: Handle game selection
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

      // Show ranked/casual buttons
      await this.showRankedButtons(interaction, selectedGame);
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
   * Handle custom game modal
   */
  async handleCustomGameModal(interaction: ModalSubmitInteraction, _client: BotClient) {
    try {
      const customGame = interaction.fields.getTextInputValue(CUSTOM_GAME_INPUT_ID).trim();

      // Show ranked/casual buttons
      await this.showRankedButtons(interaction, customGame);
    } catch (error) {
      console.error('Error handling custom game modal:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  /**
   * Step 3: Show ranked/casual/private buttons
   */
  async showRankedButtons(interaction: StringSelectMenuInteraction | ModalSubmitInteraction, gameName: string) {
    const rankedButton = new ButtonBuilder()
      .setCustomId(`${RANKED_BUTTON_ID}_${gameName}`)
      .setLabel('🏆 Ranked')
      .setStyle(ButtonStyle.Primary);

    const casualButton = new ButtonBuilder()
      .setCustomId(`${CASUAL_BUTTON_ID}_${gameName}`)
      .setLabel('😎 Casual')
      .setStyle(ButtonStyle.Secondary);

    const privateButton = new ButtonBuilder()
      .setCustomId(`${PRIVATE_BUTTON_ID}_${gameName}`)
      .setLabel('🔒 Privé')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(rankedButton, casualButton, privateButton);

    const updateMethod = interaction.isStringSelectMenu() ? 'update' : 'reply';

    await (interaction as any)[updateMethod]({
      content: `🎮 **${gameName}**\n\n**Étape 2/4** : Quel type de partie recherchez-vous ?`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * Step 4a: Handle ranked button - Show rank modal
   */
  async handleRankedButton(interaction: ButtonInteraction, _client: BotClient) {
    try {
      const gameName = interaction.customId.replace(`${RANKED_BUTTON_ID}_`, '');

      const modal = new ModalBuilder()
        .setCustomId(`${RANK_MODAL_ID_PREFIX}_${gameName}`)
        .setTitle(`🏆 ${gameName} - Ranked`);

      const rankMinInput = new TextInputBuilder()
        .setCustomId(RANK_MIN_INPUT_ID)
        .setLabel('Rank minimum recherché')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Gold, Platine, Diamant... (ou "Peu importe")')
        .setRequired(false)
        .setMaxLength(50);

      const rankMaxInput = new TextInputBuilder()
        .setCustomId(RANK_MAX_INPUT_ID)
        .setLabel('Rank maximum recherché')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Platine, Diamant, Master... (ou "Peu importe")')
        .setRequired(false)
        .setMaxLength(50);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(rankMinInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(rankMaxInput)
      );

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error handling ranked button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Step 4b: Handle casual button - Show final modal directly
   */
  async handleCasualButton(interaction: ButtonInteraction, _client: BotClient) {
    try {
      const gameName = interaction.customId.replace(`${CASUAL_BUTTON_ID}_`, '');

      await this.showFinalModal(interaction, gameName, 'Casual');
    } catch (error) {
      console.error('Error handling casual button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Step 4c: Handle private button - Show final modal directly without rank
   */
  async handlePrivateButton(interaction: ButtonInteraction, _client: BotClient) {
    try {
      const gameName = interaction.customId.replace(`${PRIVATE_BUTTON_ID}_`, '');

      await this.showFinalModal(interaction, gameName, 'Privé');
    } catch (error) {
      console.error('Error handling private button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Handle rank modal submission
   */
  async handleRankModal(interaction: ModalSubmitInteraction, _client: BotClient) {
    try {
      const gameName = interaction.customId.replace(`${RANK_MODAL_ID_PREFIX}_`, '');
      const rankMin = interaction.fields.getTextInputValue(RANK_MIN_INPUT_ID)?.trim() || 'Peu importe';
      const rankMax = interaction.fields.getTextInputValue(RANK_MAX_INPUT_ID)?.trim() || 'Peu importe';

      const rankDisplay = rankMin === 'Peu importe' && rankMax === 'Peu importe'
        ? 'Peu importe'
        : `${rankMin} - ${rankMax}`;

      // Show a button to continue (can't show modal directly after modal submission)
      const continueButton = new ButtonBuilder()
        .setCustomId(`${CONTINUE_BUTTON_ID}_${gameName}_${rankDisplay}`)
        .setLabel('Continuer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➡️');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(continueButton);

      await interaction.reply({
        content: `✅ Rank: **${rankDisplay}**\nCliquez sur le bouton pour continuer.`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error handling rank modal:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Handle continue button after rank modal
   */
  async handleContinueButton(interaction: ButtonInteraction, _client: BotClient) {
    try {
      // Extract game name and rank from customId: lfm-continue-btn_GameName_Rank
      const parts = interaction.customId.replace(`${CONTINUE_BUTTON_ID}_`, '').split('_');
      const gameName = parts[0];
      const rank = parts.slice(1).join('_'); // In case rank contains underscores

      await this.showFinalModal(interaction, gameName, rank);
    } catch (error) {
      console.error('Error handling continue button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Step 5: Show final modal for mates + description
   */
  async showFinalModal(
    interaction: ButtonInteraction,
    gameName: string,
    rank: string
  ) {
    const modal = new ModalBuilder()
      .setCustomId(`${FINAL_MODAL_ID_PREFIX}_${gameName}_${rank}`)
      .setTitle(`🎮 ${gameName}`);

    const matesInput = new TextInputBuilder()
      .setCustomId(MATES_INPUT_ID)
      .setLabel('Nombre de coéquipiers recherchés')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 1, 2, 3, 4...')
      .setRequired(true)
      .setMaxLength(2);

    const descriptionInput = new TextInputBuilder()
      .setCustomId(DESCRIPTION_INPUT_ID)
      .setLabel('Description (optionnel)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ex: Cherche joueurs chill pour s\'amuser, micro souhaité...')
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(matesInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
    );

    // Both ButtonInteraction and ModalSubmitInteraction support showModal
    await (interaction as any).showModal(modal);
  },

  /**
   * Step 6: Handle final modal and create LFM request
   */
  async handleFinalModal(interaction: ModalSubmitInteraction, _client: BotClient) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Extract game name and rank from modal customId
      const parts = interaction.customId.replace(`${FINAL_MODAL_ID_PREFIX}_`, '').split('_');
      const rank = parts.pop() || 'Casual';
      const game = parts.join('_');

      // Get input values
      const matesRaw = interaction.fields.getTextInputValue(MATES_INPUT_ID).trim();
      const description = interaction.fields.getTextInputValue(DESCRIPTION_INPUT_ID)?.trim() || undefined;

      // Validate number of mates
      const numberOfMates = parseInt(matesRaw, 10);
      if (isNaN(numberOfMates) || numberOfMates < 1 || numberOfMates > 10) {
        await interaction.editReply({
          content: '❌ Le nombre de coéquipiers doit être un nombre entre 1 et 10.',
        });
        return;
      }

      // Create LFM request
      const request = await LFMService.createRequest({
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId!,
        game,
        numberOfMates,
        rank,
        description,
      });

      // Get game color and banner
      const gameColor = await GameDBService.getGameColor(interaction.guildId!, game);
      const gameBanner = await GameDBService.getGameBanner(interaction.guildId!, game);

      // Create embed and buttons
      const embed = LFMService.createLFMEmbed(request, interaction.user, gameColor, gameBanner);
      const buttons = LFMService.createLFMButtons(request._id.toString(), false);

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

        // Update request with message info
        await LFMService.updateMessageInfo(request._id.toString(), message.id, targetChannel.id);

        await interaction.editReply({
          content: `✅ Votre annonce LFM a été créée avec succès dans <#${targetChannel.id}> !`,
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
