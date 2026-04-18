import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGame } from '../data/games';
import GroupUIService, { GROUP_PREFIX, GROUP_DESC_MODAL_PREFIX, GROUP_TIME_MODAL_PREFIX } from '../services/group-ui.service';
import groupService from '../services/group.service';
import groupRepository from '../repositories/group.repository';

export const GROUP_BUTTON_PREFIX = GROUP_PREFIX;
export const GROUP_SELECT_PREFIX = GROUP_PREFIX;

interface GroupDraft {
  gameId?: string;
  selectedTypes: string[];
  selectedModes: string[];
  selectedRank?: string;
  description?: string;
  sessionTime?: string;
}

export const groupDraftMap = new Map<string, GroupDraft>();

function getDraft(userId: string): GroupDraft {
  return groupDraftMap.get(userId) ?? {
    selectedTypes: [],
    selectedModes: [],
  };
}

function setDraft(userId: string, draft: GroupDraft): GroupDraft {
  groupDraftMap.set(userId, draft);
  return draft;
}

function needsMode(gameId: string, selectedTypes: string[]): boolean {
  const game = getGame(gameId);
  if (!game) return false;

  return selectedTypes.some((type) => game.typeOptions.find((option) => option.value === type)?.requiresMode);
}

function needsRank(gameId: string, selectedTypes: string[]): boolean {
  const game = getGame(gameId);
  if (!game || game.rankOptions === null) return false;

  return selectedTypes.some((type) => game.typeOptions.find((option) => option.value === type)?.requiresRank);
}

function getTotalSlots(gameId: string, selectedTypes: string[], selectedModes: string[]): number {
  const game = getGame(gameId);
  if (!game) return 0;

  const typeSlots = selectedTypes.map((type) => game.typeOptions.find((option) => option.value === type)?.slots ?? 0);
  const modeSlots = selectedModes.map((modeId) => game.modes?.find((mode) => mode.id === modeId)?.slots ?? 0);

  return Math.max(0, ...typeSlots, ...modeSlots, selectedTypes.length > 0 ? 4 : 0);
}

function sanitizeDraft(draft: GroupDraft): GroupDraft {
  if (!draft.gameId) {
    return {
      selectedTypes: [],
      selectedModes: [],
      description: draft.description,
      sessionTime: draft.sessionTime,
    };
  }

  const game = getGame(draft.gameId);
  if (!game) {
    return {
      selectedTypes: [],
      selectedModes: [],
      description: draft.description,
      sessionTime: draft.sessionTime,
    };
  }

  const selectedTypes = draft.selectedTypes.filter((type) =>
    game.typeOptions.some((option) => option.value === type),
  );

  const selectedModes = needsMode(game.id, selectedTypes)
    ? draft.selectedModes.filter((modeId) => game.modes?.some((mode) => mode.id === modeId))
    : [];

  const selectedRank = needsRank(game.id, selectedTypes)
    && game.rankOptions?.some((rank) => rank.value === draft.selectedRank)
      ? draft.selectedRank
      : undefined;

  return {
    ...draft,
    gameId: game.id,
    selectedTypes,
    selectedModes,
    selectedRank,
  };
}

function renderDraft(draft: GroupDraft) {
  return GroupUIService.buildConfigurator(
    draft.gameId!,
    draft.selectedTypes,
    draft.selectedModes,
    draft.selectedRank,
    draft.description,
    draft.sessionTime,
  );
}

export async function handleGroupSelectMenu(
  interaction: StringSelectMenuInteraction,
  _client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const step = parts[1];

  if (step === 'game') {
    const gameId = interaction.values[0];
    const previousDraft = getDraft(interaction.user.id);
    const draft = setDraft(interaction.user.id, {
      gameId,
      selectedTypes: [],
      selectedModes: [],
      description: previousDraft.description,
      sessionTime: previousDraft.sessionTime,
    });
    const ui = renderDraft(draft);
    await interaction.update({ components: ui.components });
    return;
  }

  if (step === 'type') {
    const gameId = parts[2];
    const draft = getDraft(interaction.user.id);
    const updatedDraft = setDraft(interaction.user.id, sanitizeDraft({
      ...draft,
      gameId,
      selectedTypes: interaction.values,
    }));
    const ui = renderDraft(updatedDraft);
    await interaction.update({ components: ui.components });
    return;
  }

  if (step === 'mode') {
    const gameId = parts[2];
    const draft = getDraft(interaction.user.id);
    const updatedDraft = setDraft(interaction.user.id, sanitizeDraft({
      ...draft,
      gameId,
      selectedModes: interaction.values,
    }));
    const ui = renderDraft(updatedDraft);
    await interaction.update({ components: ui.components });
    return;
  }

  if (step === 'rank') {
    const gameId = parts[2];
    const rankValue = interaction.values[0];
    const draft = getDraft(interaction.user.id);
    const updatedDraft = setDraft(interaction.user.id, sanitizeDraft({
      ...draft,
      gameId,
      selectedRank: rankValue,
    }));
    const ui = renderDraft(updatedDraft);
    await interaction.update({ components: ui.components });
    return;
  }
}

export async function handleGroupButton(
  interaction: ButtonInteraction,
  client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const prefix = parts[0] + ':' + parts[1];

  if (prefix === GROUP_DESC_MODAL_PREFIX) {
    const [, , gameId] = parts;
    const draft = getDraft(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId(`${GROUP_DESC_MODAL_PREFIX}:${gameId}`)
      .setTitle('Description du groupe');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('group_description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Infos supplémentaires, niveau requis...')
          .setValue(draft.description ?? '')
          .setRequired(false)
          .setMaxLength(300),
      ),
    );

    await interaction.showModal(modal);
    return;
  }

  if (prefix === GROUP_TIME_MODAL_PREFIX) {
    const [, , gameId] = parts;
    const draft = getDraft(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId(`${GROUP_TIME_MODAL_PREFIX}:${gameId}`)
      .setTitle('Heure de la session');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('group_time')
          .setLabel('Heure')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex : Maintenant, 20h30, Dans 1h...')
          .setValue(draft.sessionTime ?? '')
          .setRequired(false)
          .setMaxLength(50),
      ),
    );

    await interaction.showModal(modal);
    return;
  }

  const action = parts[1];

  if (action === 'create') {
    const [, , gameId] = parts;
    await createGroup(interaction, gameId);
    return;
  }

  if (action === 'join') {
    const groupId = parts[2];
    const { group, alreadyIn, isFull } = await groupService.join(groupId, interaction.user.id);

    if (!group) {
      await interaction.reply({ content: 'Ce groupe n\'existe plus.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (alreadyIn) {
      await interaction.reply({ content: 'Tu es déjà dans ce groupe.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (isFull) {
      await interaction.reply({ content: 'Ce groupe est complet.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferUpdate();
    await groupService.updatePostMessage(client, group);
    return;
  }

  if (action === 'leave') {
    const groupId = parts[2];
    const group = await groupRepository.findById(groupId);

    if (!group) {
      await interaction.reply({ content: 'Ce groupe n\'existe plus.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (!group.joinedUserIds.includes(interaction.user.id)) {
      await interaction.reply({ content: 'Tu n\'es pas dans ce groupe.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (group.creatorId === interaction.user.id) {
      await interaction.reply({ content: 'Tu es le créateur, utilise "Fermer" pour clôturer le groupe.', flags: MessageFlags.Ephemeral });
      return;
    }

    const { group: updated } = await groupService.leave(groupId, interaction.user.id);
    await interaction.deferUpdate();
    if (updated) await groupService.updatePostMessage(client, updated);
    return;
  }

  if (action === 'close') {
    const groupId = parts[2];
    const group = await groupRepository.findById(groupId);

    if (!group) {
      await interaction.reply({ content: 'Ce groupe n\'existe plus.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (group.creatorId !== interaction.user.id) {
      await interaction.reply({ content: 'Seul le créateur peut fermer le groupe.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferUpdate();
    await groupService.closeGroup(groupId, client);
    return;
  }
}

export async function handleGroupDescModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parts = interaction.customId.split(':');
  const [, , gameId] = parts;

  const description = interaction.fields.getTextInputValue('group_description').trim() || undefined;

  const draft = getDraft(interaction.user.id);
  const updatedDraft = setDraft(interaction.user.id, sanitizeDraft({ ...draft, gameId, description }));

  const ui = renderDraft(updatedDraft);
  await (interaction as any).update({ components: ui.components });
}

export async function handleGroupTimeModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parts = interaction.customId.split(':');
  const [, , gameId] = parts;

  const sessionTime = interaction.fields.getTextInputValue('group_time').trim() || undefined;

  const draft = getDraft(interaction.user.id);
  const updatedDraft = setDraft(interaction.user.id, sanitizeDraft({ ...draft, gameId, sessionTime }));

  const ui = renderDraft(updatedDraft);
  await (interaction as any).update({ components: ui.components });
}

async function createGroup(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  gameId: string,
): Promise<void> {
  const game = getGame(gameId);
  if (!game) {
    await interaction.reply({ content: 'Jeu introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const draft = sanitizeDraft({ ...getDraft(interaction.user.id), gameId });

  if (draft.selectedTypes.length === 0) {
    await interaction.reply({ content: 'Choisis au moins un type de partie.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (needsMode(gameId, draft.selectedTypes) && draft.selectedModes.length === 0) {
    await interaction.reply({ content: 'Choisis au moins un mode de jeu.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (needsRank(gameId, draft.selectedTypes) && !draft.selectedRank) {
    await interaction.reply({ content: 'Choisis un rank minimum.', flags: MessageFlags.Ephemeral });
    return;
  }

  groupDraftMap.delete(interaction.user.id);

  await interaction.deferUpdate();

  const group = await groupService.createGroup({
    creatorId: interaction.user.id,
    gameId,
    types: draft.selectedTypes,
    modes: draft.selectedModes.length > 0 ? draft.selectedModes : undefined,
    rankMin: draft.selectedRank,
    totalSlots: getTotalSlots(gameId, draft.selectedTypes, draft.selectedModes),
    description: draft.description,
    sessionTime: draft.sessionTime,
  });

  const post = GroupUIService.buildGroupPost(group, game, game.roleId || undefined);

  const message = await interaction.channel!.send({
    components: post,
    flags: MessageFlags.IsComponentsV2,
  });

  await groupRepository.setMessageInfo(group._id.toString(), message.id, message.channelId);
}
