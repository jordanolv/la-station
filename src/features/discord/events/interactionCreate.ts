import {
  MessageFlags, ChannelSelectMenuInteraction, Events, Interaction, ModalSubmitInteraction, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserSelectMenuInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { AppConfigService } from '../services/app-config.service';
import {
  handleGroupButton,
  handleGroupSelectMenu,
  handleGroupDescModal,
  handleGroupTimeModal,
  GROUP_BUTTON_PREFIX,
} from '../../group/events/group-interactions';
import { GROUP_DESC_MODAL_PREFIX, GROUP_TIME_MODAL_PREFIX } from '../../group/services/group-ui.service';
import { GROUP_NOTIFS_SELECT_ID } from '../../group/slash/group-notifs';
import { handleLFMButtonInteraction, handleLFMAcceptReject } from '../../looking-for-mate/events/lfm-interactions';
import {
  GAME_SELECT_ID,
  TYPE_SELECT_ID,
  RANK_SELECT_ID,
  GAME_MODE_SELECT_ID,
  CUSTOM_GAME_MODAL_ID,
  FINAL_MODAL_ID_PREFIX,
} from '../../looking-for-mate/slash/lfm';
import { VOC_CONFIG_BUTTON_ID, VOC_INVITE_USER_SELECT_ID } from '../../voice/services/voice.service';
import {
  handleVocConfigButton,
  handleVocConfigModal,
  handleVocInviteUserSelect,
  VOC_CONFIG_MODAL_ID
} from '../../voice/interactions/vocConfigHandler';
import {
  PANEL_BUTTON_PREFIX,
  parsePanelCustomId,
  panelRegistry,
} from '../../config-panel/services/config-panel.registry';
import { MONEY_MODAL_PREFIX } from '../../admin/slash/money';
import { EMBED_EDIT_MODAL_PREFIX } from '../../admin/slash/embed';
import { handlePackButton } from '../../mountain/slash/subcommands/pack';
import { MountainSpawnService, SPAWN_BUTTON_PREFIX } from '../../mountain/services/mountain-spawn.service';
import { MountainPlugin, VOICE_CHECK_BUTTON_PREFIX } from '../../mountain/services/mountain.plugin';
import {
  INV_BUTTON_PREFIX,
  handleInventaireButton,
} from '../../mountain/slash/subcommands/inv';
import { HOME_BUTTON_PREFIX, handleHomeButton, MAP_BUTTON_PREFIX, handleMapButton } from '../../mountain/slash/subcommands/home';
import {
  handleImpostorButtonInteraction,
  handleImpostorSelectMenu,
  handleImpostorModalSubmit,
} from '../../impostor/events/impostor-interactions';
import {
  handleBetButton,
  handleBetSelectMenu,
  handleBetPlaceSelect,
  handleBetSetupModal,
  handleBetPlaceModal,
} from '../../bet/events/bet-interactions';
import {
  handleDraftButton,
  handleDraftUserSelect,
  handleDraftStringSelect,
} from '../../draft/events/draft-interactions';
import { QuizService, QUIZ_BUTTON_PREFIX } from '../../quiz/services/quiz.service';
const PROFILE_MODAL_ID = 'profile-config-modal';

async function routeToPanelSelectMenu(
  interaction: ChannelSelectMenuInteraction | RoleSelectMenuInteraction | StringSelectMenuInteraction | UserSelectMenuInteraction,
  client: BotClient,
): Promise<boolean> {
  const parsed = parsePanelCustomId(interaction.customId);
  if (!parsed) return false;
  const panel = panelRegistry.get(parsed.panelId);
  if (panel?.handleSelectMenu) await panel.handleSelectMenu(interaction as any, client);
  return true;
}

async function routeToPanelModal(
  interaction: ModalSubmitInteraction,
  client: BotClient,
): Promise<boolean> {
  const parsed = parsePanelCustomId(interaction.customId);
  if (!parsed) return false;
  const panel = panelRegistry.get(parsed.panelId);
  if (panel?.handleModal) await panel.handleModal(interaction, client);
  return true;
}

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(client: BotClient, interaction: Interaction) {
    try {
      if (interaction.isAutocomplete()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command?.autocomplete) return;
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error('Erreur lors de l\'autocomplétion:', error);
        }
      }

      else if (interaction.isCommand() || interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        const command = client.slashCommands.get(interaction.commandName.toLowerCase());
        if (!command) return;
        try {
          const commandChannels = await AppConfigService.getCommandChannels();
          const allowedChannelId = commandChannels[interaction.commandName.toLowerCase()];
          if (allowedChannelId && interaction.channelId !== allowedChannelId) {
            await interaction.reply({ content: `Cette commande est réservée au channel <#${allowedChannelId}>.`, flags: MessageFlags.Ephemeral });
            return;
          }
          await command.execute(interaction, client);
        } catch (error) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', flags: 64 }).catch(() => {});
          } else {
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', flags: 64 }).catch(() => {});
          }
        }
      }

      else if (interaction.isButton()) {
        if (interaction.customId.startsWith(GROUP_BUTTON_PREFIX + ':')) {
          await handleGroupButton(interaction, client);
        } else if (interaction.customId.startsWith(PANEL_BUTTON_PREFIX + ':')) {
          const parsed = parsePanelCustomId(interaction.customId);
          if (parsed) {
            const panel = panelRegistry.get(parsed.panelId);
            if (panel?.handleButton) await panel.handleButton(interaction, client);
          }
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
        } else if (interaction.customId.startsWith(MAP_BUTTON_PREFIX + ':')) {
          await handleMapButton(interaction);
        } else if (interaction.customId.startsWith(HOME_BUTTON_PREFIX + ':')) {
          await handleHomeButton(interaction, client);
        } else if (interaction.customId.startsWith('mountain:pack:')) {
          await handlePackButton(interaction, client);
        } else if (interaction.customId.startsWith(SPAWN_BUTTON_PREFIX + ':')) {
          await MountainSpawnService.handleClaim(interaction, client);
        } else if (interaction.customId.startsWith(VOICE_CHECK_BUTTON_PREFIX + ':')) {
          await MountainPlugin.handleVoiceCheck(interaction);
        } else if (interaction.customId.startsWith(INV_BUTTON_PREFIX + ':')) {
          await handleInventaireButton(interaction, client);
        } else if (interaction.customId.startsWith('impostor_')) {
          await handleImpostorButtonInteraction(interaction, client);
        } else if (interaction.customId.startsWith('bet:')) {
          await handleBetButton(interaction, client);
        } else if (interaction.customId.startsWith('draft:')) {
          await handleDraftButton(interaction, client);
        } else if (interaction.customId.startsWith(QUIZ_BUTTON_PREFIX + ':')) {
          await QuizService.handleAnswer(client, interaction);
        }
      }

      else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === GROUP_NOTIFS_SELECT_ID) {
          const groupNotifsCommand = client.slashCommands.get('group-notifs');
          if (groupNotifsCommand?.handleSelect) await groupNotifsCommand.handleSelect(interaction, client);
        } else if (interaction.customId.startsWith(GROUP_BUTTON_PREFIX + ':')) {
          await handleGroupSelectMenu(interaction, client);
        } else if (interaction.customId.startsWith(PANEL_BUTTON_PREFIX + ':')) {
          await routeToPanelSelectMenu(interaction, client);
        } else if (interaction.customId.startsWith('bet:winner:')) {
          await handleBetSelectMenu(interaction, client);
        } else if (interaction.customId.startsWith('bet:place:')) {
          await handleBetPlaceSelect(interaction, client);
        } else if (interaction.customId.startsWith('draft:pick:')) {
          await handleDraftStringSelect(interaction, client);
        } else if (interaction.customId.startsWith('impostor_')) {
          await handleImpostorSelectMenu(interaction, client);
        } else {
          const lfmCommand = client.slashCommands.get('lfm');
          if (!lfmCommand) return;
          const lfmSelects: Record<string, string> = {
            [GAME_SELECT_ID]: 'handleGameSelect',
            [TYPE_SELECT_ID]: 'handleTypeSelect',
            [RANK_SELECT_ID]: 'handleRankSelect',
            [GAME_MODE_SELECT_ID]: 'handleGameModeSelect',
          };
          const handler = lfmSelects[interaction.customId];
          if (handler && typeof lfmCommand[handler] === 'function') {
            await lfmCommand[handler](interaction, client);
          }
        }
      }

      else if (interaction.isChannelSelectMenu()) {
        await routeToPanelSelectMenu(interaction, client);
      }

      else if (interaction.isRoleSelectMenu()) {
        await routeToPanelSelectMenu(interaction, client);
      }

      else if (interaction.isUserSelectMenu()) {
        if (interaction.customId.startsWith(PANEL_BUTTON_PREFIX + ':')) {
          await routeToPanelSelectMenu(interaction, client);
        } else if (interaction.customId.startsWith(VOC_INVITE_USER_SELECT_ID)) {
          await handleVocInviteUserSelect(interaction, client);
        } else if (interaction.customId.startsWith('draft:')) {
          await handleDraftUserSelect(interaction, client);
        }
      }

      else if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith(GROUP_DESC_MODAL_PREFIX + ':')) {
          await handleGroupDescModal(interaction);
        } else if (interaction.customId.startsWith(GROUP_TIME_MODAL_PREFIX + ':')) {
          await handleGroupTimeModal(interaction);
        } else if (interaction.customId.startsWith(PANEL_BUTTON_PREFIX + ':')) {
          await routeToPanelModal(interaction, client);
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
        } else if (interaction.customId.startsWith(MONEY_MODAL_PREFIX)) {
          const moneyCommand = client.slashCommands.get('gérer l\'argent');
          if (moneyCommand?.handleModalSubmit) {
            await moneyCommand.handleModalSubmit(interaction, client);
          }
        } else if (interaction.customId.startsWith('impostor_createmodal_')) {
          await handleImpostorModalSubmit(interaction, client);
        } else if (interaction.customId.startsWith('bet:setup_modal:')) {
          await handleBetSetupModal(interaction, client);
        } else if (interaction.customId.startsWith('bet:place_modal:')) {
          await handleBetPlaceModal(interaction, client);
        } else if (interaction.customId.startsWith(EMBED_EDIT_MODAL_PREFIX)) {
          const embedCommand = client.slashCommands.get('embed');
          if (embedCommand?.handleEditModal) await embedCommand.handleEditModal(interaction, client);
        }
      }
    } catch (error) {
      console.error('[InteractionCreate] Erreur non gérée:', error);
    }
  }
};
