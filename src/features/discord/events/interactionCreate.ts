import { Events, Interaction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { GuildService } from '../services/guild.service';
import { SuggestionsService } from '../../suggestions/services/suggestions.service';
import { handleLFMButtonInteraction, handleLFMAcceptReject } from '../../looking-for-mate/events/lfm-interactions';
import {
  GAME_SELECT_ID,
  TYPE_SELECT_ID,
  RANK_SELECT_ID,
  GAME_MODE_SELECT_ID,
  CUSTOM_GAME_MODAL_ID,
  FINAL_MODAL_ID_PREFIX,
} from '../../looking-for-mate/slash/lfm';
import { VOC_CONFIG_BUTTON_ID, VOC_INVITE_USER_SELECT_ID } from '../../voc-manager/services/vocManager.service';
import {
  handleVocConfigButton,
  handleVocConfigModal,
  handleVocInviteUserSelect,
  VOC_CONFIG_MODAL_ID
} from '../../voc-manager/interactions/vocConfigHandler';

const PROFILE_MODAL_ID = 'profile-config-modal';

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(client: BotClient, interaction: Interaction) {
    try {
      if (interaction.guild) {
        await GuildService.getOrCreateGuild(interaction.guild.id, interaction.guild.name);
      }

      // Gestion de l'autocomplétion
      if (interaction.isAutocomplete()) {
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command || !command.autocomplete) {
          return;
        }
        
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error('Erreur lors de l\'autocomplétion:', error);
        }
      }
      
      // Gestion des commandes slash
      else if (interaction.isCommand && interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command) {
          return;
        }
        
        try {
          await command.execute(interaction, client);
        } catch (error) {
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
              content: 'Une erreur est survenue lors de l\'exécution de cette commande.', 
              ephemeral: true 
            });
          } else {
            await interaction.reply({ 
              content: 'Une erreur est survenue lors de l\'exécution de cette commande.', 
              ephemeral: true 
            });
          }
        }
      }
      
      // Gestion des boutons
      else if (interaction.isButton && interaction.isButton()) {
        if (interaction.customId === 'create_suggestion') {
          await SuggestionsService.handleButtonInteraction(interaction);
        } else if (interaction.customId.startsWith('lfm_accept_') || interaction.customId.startsWith('lfm_reject_')) {
          await handleLFMAcceptReject(interaction, client);
        } else if (interaction.customId.startsWith('lfm_')) {
          await handleLFMButtonInteraction(interaction, client);
        } else if (interaction.customId.startsWith('leaderboard_')) {
          const leaderboardCommand = client.slashCommands.get('leaderboard');
          if (leaderboardCommand && typeof leaderboardCommand.handleButtonInteraction === 'function') {
            await leaderboardCommand.handleButtonInteraction(interaction, client);
          }
        } else if (interaction.customId.startsWith(VOC_CONFIG_BUTTON_ID)) {
          await handleVocConfigButton(interaction, client);
        }
      }

      // Gestion des menus de sélection
      else if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
        if (interaction.customId === GAME_SELECT_ID) {
          const lfmCommand = client.slashCommands.get('lfm');
          if (lfmCommand && typeof lfmCommand.handleGameSelect === 'function') {
            await lfmCommand.handleGameSelect(interaction, client);
          }
        } else if (interaction.customId === TYPE_SELECT_ID) {
          const lfmCommand = client.slashCommands.get('lfm');
          if (lfmCommand && typeof lfmCommand.handleTypeSelect === 'function') {
            await lfmCommand.handleTypeSelect(interaction, client);
          }
        } else if (interaction.customId === RANK_SELECT_ID) {
          const lfmCommand = client.slashCommands.get('lfm');
          if (lfmCommand && typeof lfmCommand.handleRankSelect === 'function') {
            await lfmCommand.handleRankSelect(interaction, client);
          }
        } else if (interaction.customId === GAME_MODE_SELECT_ID) {
          const lfmCommand = client.slashCommands.get('lfm');
          if (lfmCommand && typeof lfmCommand.handleGameModeSelect === 'function') {
            await lfmCommand.handleGameModeSelect(interaction, client);
          }
        }
      }

      // Gestion des user select menus
      else if (interaction.isUserSelectMenu && interaction.isUserSelectMenu()) {
        if (interaction.customId.startsWith(VOC_INVITE_USER_SELECT_ID)) {
          await handleVocInviteUserSelect(interaction, client);
        }
      }

      // Gestion des modals
      else if (interaction.isModalSubmit && interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('suggestion_modal_')) {
          await SuggestionsService.handleModalSubmit(interaction);
        } else if (interaction.customId === PROFILE_MODAL_ID) {
          const profileCommand = client.slashCommands.get('profil');
          if (profileCommand && typeof profileCommand.handleModal === 'function') {
            await profileCommand.handleModal(interaction);
          }
        } else if (interaction.customId === CUSTOM_GAME_MODAL_ID) {
          const lfmCommand = client.slashCommands.get('lfm');
          if (lfmCommand && typeof lfmCommand.handleCustomGameModal === 'function') {
            await lfmCommand.handleCustomGameModal(interaction, client);
          }
        } else if (interaction.customId.startsWith(FINAL_MODAL_ID_PREFIX)) {
          const lfmCommand = client.slashCommands.get('lfm');
          if (lfmCommand && typeof lfmCommand.handleFinalModal === 'function') {
            await lfmCommand.handleFinalModal(interaction, client);
          }
        } else if (interaction.customId.startsWith(VOC_CONFIG_MODAL_ID)) {
          await handleVocConfigModal(interaction, client);
        } else {
        }
      }
    } catch (error) {
    }
  }
};
