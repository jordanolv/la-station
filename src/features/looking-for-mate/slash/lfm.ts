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
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import LFMService from '../services/lfm.service';
import LFMGamesConfigService, { GameConfig } from '../services/lfm-games-config.service';

export const GAME_SELECT_ID = 'lfm-game-select';
export const TYPE_SELECT_ID = 'lfm-type-select';
export const RANK_SELECT_ID = 'lfm-rank-select';
export const GAME_MODE_SELECT_ID = 'lfm-gamemode-select';
export const CUSTOM_GAME_MODAL_ID = 'lfm-custom-game-modal';
export const CUSTOM_GAME_INPUT_ID = 'lfm-custom-game-input';
export const FINAL_MODAL_ID_PREFIX = 'lfm-final-modal';
export const MATES_INPUT_ID = 'lfm-mates';
export const TIME_INPUT_ID = 'lfm-time';

// Store user selections
interface UserSelection {
  game: string;
  gameConfig: Partial<GameConfig>;
  type?: string;
  gameMode?: string;
  rank?: string;
}

const userSelections = new Map<string, UserSelection>();

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

    // Get games from config
    const games = LFMGamesConfigService.getGames();

    // Create select menu with games
    const options = games.slice(0, 24).map((game) => ({
      label: game.name,
      value: game.id,
      emoji: game.emoji,
    }));

    // Add custom game option if enabled
    if (LFMGamesConfigService.isCustomGameEnabled()) {
      const customConfig = LFMGamesConfigService.getCustomGameConfig();
      options.push({
        label: customConfig.label,
        value: customConfig.value,
        emoji: '🎮',
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(GAME_SELECT_ID)
      .setPlaceholder('Sélectionnez un jeu')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      content: '🎮 **Étape 1/3** : Sélectionnez le jeu :',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * Handle game selection
   */
  async handleGameSelect(interaction: StringSelectMenuInteraction, _client: BotClient) {
    try {
      const selectedGameId = interaction.values[0];

      // If "custom", show modal to enter custom game name
      if (selectedGameId === 'custom') {
        const modal = new ModalBuilder()
          .setCustomId(CUSTOM_GAME_MODAL_ID)
          .setTitle('🎮 Entrez le nom du jeu');

        const gameInput = new TextInputBuilder()
          .setCustomId(CUSTOM_GAME_INPUT_ID)
          .setLabel('Nom du jeu')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Minecraft, Fortnite, Palworld...')
          .setRequired(true)
          .setMaxLength(100);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(gameInput));

        await interaction.showModal(modal);
        return;
      }

      // Get game config
      const gameConfig = LFMGamesConfigService.getGameConfig(selectedGameId);

      if (!gameConfig) {
        await interaction.reply({
          content: '❌ Configuration du jeu introuvable.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Store selection
      userSelections.set(interaction.user.id, {
        game: gameConfig.name,
        gameConfig: gameConfig,
      });

      // Show type select menu
      await this.showTypeSelect(interaction, gameConfig);
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
      const customGameName = interaction.fields.getTextInputValue(CUSTOM_GAME_INPUT_ID).trim();

      // Get custom game config
      const gameConfig = LFMGamesConfigService.getConfigForCustomGame(customGameName);

      // Store selection
      userSelections.set(interaction.user.id, {
        game: customGameName,
        gameConfig: gameConfig as GameConfig,
      });

      // Show type select menu
      await this.showTypeSelectAfterModal(interaction, gameConfig as GameConfig);
    } catch (error) {
      console.error('Error handling custom game modal:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },

  /**
   * Step 2: Show type select menu (after game selection via button)
   */
  async showTypeSelect(interaction: StringSelectMenuInteraction, gameConfig: GameConfig) {
    const typeOptions = gameConfig.typeOptions.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(TYPE_SELECT_ID)
      .setPlaceholder('Sélectionnez le type')
      .addOptions(typeOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
      content: `${gameConfig.emoji} **${gameConfig.name}** sélectionné !\n\n**Étape 2/3** : Sélectionnez le type :`,
      components: [row],
    });
  },

  /**
   * Step 2: Show type select menu (after custom game modal)
   */
  async showTypeSelectAfterModal(interaction: ModalSubmitInteraction, gameConfig: GameConfig) {
    const typeOptions = gameConfig.typeOptions.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(TYPE_SELECT_ID)
      .setPlaceholder('Sélectionnez le type')
      .addOptions(typeOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      content: `${gameConfig.emoji} **${gameConfig.name}** sélectionné !\n\n**Étape 2/3** : Sélectionnez le type :`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * Handle type selection
   */
  async handleTypeSelect(interaction: StringSelectMenuInteraction, _client: BotClient) {
    try {
      const selection = userSelections.get(interaction.user.id);

      if (!selection) {
        await interaction.reply({
          content: '❌ Veuillez recommencer la commande /lfm.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const selectedType = interaction.values[0];
      selection.type = selectedType;

      // If type is Privé or Aram, skip to final modal (no need for mode or player count)
      if (selectedType === 'Privé' || selectedType === 'Aram') {
        await this.showFinalModal(interaction, selection);
        return;
      }

      // Check if this game uses mode_select for party mode (before rank selection)
      const partyModeField = selection.gameConfig.partyModeField;

      if (partyModeField && partyModeField.type === 'mode_select') {
        // Show game mode select menu first
        await this.showGameModeSelect(interaction, selection);
      } else if (partyModeField && partyModeField.type === 'fixed_slots') {
        // For fixed_slots games (like TFT), show rank select if Ranked, or go to modal
        if (selectedType === 'Ranked') {
          await this.showRankSelect(interaction, selection);
        } else {
          await this.showFinalModal(interaction, selection);
        }
      } else {
        // For player_count games, show rank select if Ranked, or go to modal
        if (selectedType === 'Ranked') {
          await this.showRankSelect(interaction, selection);
        } else {
          await this.showFinalModal(interaction, selection);
        }
      }
    } catch (error) {
      console.error('Error handling type select:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Step 3 (optional): Show rank select menu (for Ranked type)
   */
  async showRankSelect(interaction: StringSelectMenuInteraction, selection: UserSelection) {
    const rankOptions = selection.gameConfig.rankOptions;

    if (!rankOptions || rankOptions.length === 0) {
      // If no rank options, go to next step
      const partyModeField = selection.gameConfig.partyModeField;
      if (partyModeField && partyModeField.type === 'mode_select') {
        await this.showGameModeSelect(interaction, selection);
      } else {
        await this.showFinalModal(interaction, selection);
      }
      return;
    }

    const options = rankOptions.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(RANK_SELECT_ID)
      .setPlaceholder('Sélectionnez le rank minimum')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
      content: `**Étape 3** : Sélectionnez le rank minimum requis :`,
      components: [row],
    });
  },

  /**
   * Handle rank selection
   */
  async handleRankSelect(interaction: StringSelectMenuInteraction, _client: BotClient) {
    try {
      const selection = userSelections.get(interaction.user.id);

      if (!selection) {
        await interaction.reply({
          content: '❌ Veuillez recommencer la commande /lfm.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const selectedRank = interaction.values[0];
      selection.rank = selectedRank;

      // Check if this is from a dual select menu (mode_select games)
      const partyModeField = selection.gameConfig.partyModeField;

      if (partyModeField && partyModeField.type === 'mode_select') {
        // Dual select menu: check if mode already selected
        if (selection.gameMode) {
          // Both mode and rank selected, proceed to modal
          await this.showFinalModal(interaction, selection);
        } else {
          // Just acknowledge, waiting for mode selection
          await interaction.deferUpdate();
        }
      } else {
        // Single select menu (player_count games), go directly to modal
        await this.showFinalModal(interaction, selection);
      }
    } catch (error) {
      console.error('Error handling rank select:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Step 4 (optional): Show game mode select menu (for games like Rocket League)
   * If Ranked, also show rank select in the same message
   */
  async showGameModeSelect(interaction: StringSelectMenuInteraction, selection: UserSelection) {
    const partyModeField = selection.gameConfig.partyModeField;

    if (!partyModeField || !partyModeField.options) {
      await interaction.reply({
        content: '❌ Configuration invalide.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modeOptions = partyModeField.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
      description: `${opt.slots} joueurs`,
    }));

    const gameModeSelect = new StringSelectMenuBuilder()
      .setCustomId(GAME_MODE_SELECT_ID)
      .setPlaceholder(partyModeField.label)
      .addOptions(modeOptions);

    const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gameModeSelect)
    ];

    let content = `**Étape 3** : Sélectionnez le mode de jeu`;

    // If Ranked, add rank select menu in the same message
    if (selection.type === 'Ranked') {
      const rankOptions = selection.gameConfig.rankOptions;

      if (rankOptions && rankOptions.length > 0) {
        const rankSelect = new StringSelectMenuBuilder()
          .setCustomId(RANK_SELECT_ID)
          .setPlaceholder('Sélectionnez le rank minimum')
          .addOptions(rankOptions.map((opt) => ({
            label: opt.label,
            value: opt.value,
          })));

        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rankSelect));
        content = `**Étape 3** : Sélectionnez le mode de jeu et le rank minimum`;
      }
    }

    await interaction.update({
      content: content,
      components: rows,
    });
  },

  /**
   * Handle game mode selection
   */
  async handleGameModeSelect(interaction: StringSelectMenuInteraction, _client: BotClient) {
    try {
      const selection = userSelections.get(interaction.user.id);

      if (!selection) {
        await interaction.reply({
          content: '❌ Veuillez recommencer la commande /lfm.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const selectedGameMode = interaction.values[0];
      selection.gameMode = selectedGameMode;

      // If Ranked and rank already selected (from dual select menu), go to modal
      // Otherwise if Ranked without rank yet, just acknowledge and wait for rank selection
      if (selection.type === 'Ranked') {
        if (selection.rank) {
          // Both mode and rank selected, proceed to modal
          await this.showFinalModal(interaction, selection);
        } else {
          // Just acknowledge, waiting for rank selection
          await interaction.deferUpdate();
        }
      } else {
        // Not Ranked, go directly to modal
        await this.showFinalModal(interaction, selection);
      }
    } catch (error) {
      console.error('Error handling game mode select:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },

  /**
   * Show final modal for additional details
   */
  async showFinalModal(interaction: StringSelectMenuInteraction, selection: UserSelection) {
    const modal = new ModalBuilder()
      .setCustomId(`${FINAL_MODAL_ID_PREFIX}_${interaction.user.id}_${Date.now()}`)
      .setTitle(`🎮 ${selection.game} - ${selection.type}`);

    const components: ActionRowBuilder<TextInputBuilder>[] = [];

    const partyModeField = selection.gameConfig.partyModeField;

    // Add party mode field if it's player_count type AND not Privé or Aram
    if (partyModeField && partyModeField.type === 'player_count' && selection.type !== 'Privé' && selection.type !== 'Aram') {
      const matesInput = new TextInputBuilder()
        .setCustomId(MATES_INPUT_ID)
        .setLabel(partyModeField.label)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Entre ${partyModeField.min} et ${partyModeField.max}`)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

      components.push(new ActionRowBuilder<TextInputBuilder>().addComponents(matesInput));
    }

    // Add time input
    const timeInput = new TextInputBuilder()
      .setCustomId(TIME_INPUT_ID)
      .setLabel('Heure de la session (optionnel)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 20h30, Maintenant, Dans 1h...')
      .setRequired(false)
      .setMaxLength(50);

    components.push(new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput));

    modal.addComponents(...components);
    await interaction.showModal(modal);
  },

  /**
   * Handle final modal submission and create LFM request
   */
  async handleFinalModal(interaction: ModalSubmitInteraction, _client: BotClient) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const selection = userSelections.get(interaction.user.id);

      if (!selection) {
        await interaction.editReply({
          content: '❌ Session expirée. Veuillez recommencer la commande /lfm.',
        });
        return;
      }

      // Clean up selection
      userSelections.delete(interaction.user.id);

      const time = interaction.fields.getTextInputValue(TIME_INPUT_ID)?.trim() || undefined;
      const rank = selection.rank; // Already selected from rank select menu if Ranked

      const partyModeField = selection.gameConfig.partyModeField;
      let totalSlots: number;

      // If type is Privé, use default slots for the game
      if (selection.type === 'Privé') {
        totalSlots = selection.gameConfig.privateDefaultSlots || 10;
      } else if (selection.type === 'Aram') {
        // Aram is always 5v5
        totalSlots = 5;
      } else if (partyModeField?.type === 'fixed_slots') {
        // For fixed_slots games (like TFT), use the slots from config
        totalSlots = partyModeField.slots || 8;
      } else if (partyModeField?.type === 'mode_select') {
        // Get slots from selected game mode (e.g., RL 2v2 = 2, 3v3 = 3)
        const gameModeOption = partyModeField.options?.find((opt) => opt.value === selection.gameMode);
        if (!gameModeOption) {
          await interaction.editReply({
            content: '❌ Mode de jeu invalide.',
          });
          return;
        }
        // Use slots directly (creator is already counted in the team size)
        totalSlots = gameModeOption.slots;
      } else if (partyModeField?.type === 'player_count') {
        // Get from user input (player_count type)
        const matesRaw = interaction.fields.getTextInputValue(MATES_INPUT_ID).trim();
        const numberOfMates = parseInt(matesRaw, 10);

        if (isNaN(numberOfMates) || numberOfMates < (partyModeField?.min || 1) || numberOfMates > (partyModeField?.max || 10)) {
          await interaction.editReply({
            content: `❌ Le nombre de places doit être entre ${partyModeField?.min || 1} et ${partyModeField?.max || 10}.`,
          });
          return;
        }

        // Add +1 to include the creator
        totalSlots = numberOfMates + 1;
      } else {
        // Fallback (should not happen)
        totalSlots = 10;
      }

      // Get game role ID from config
      const gameRoleId = selection.gameConfig.roleId || undefined;

      // Create LFM request
      const request = await LFMService.createRequest({
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId!,
        game: selection.game,
        numberOfMates: totalSlots,
        rank: rank,
        sessionTime: time,
        gameMode: selection.gameMode,
        type: selection.type,
        gameRoleId: gameRoleId,
      });

      // Get game color and banner
      const gameColor = selection.gameConfig.color;
      const gameBanner = selection.gameConfig.banner;

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
        // Prepare message content with role mention if available
        const messageContent = gameRoleId ? `<@&${gameRoleId}>` : undefined;

        const message = await targetChannel.send({
          content: messageContent,
          embeds: [embed],
          components: [buttons],
        });

        // Create a thread on the message
        const thread = await message.startThread({
          name: `${selection.game} - ${interaction.user.username}`,
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
