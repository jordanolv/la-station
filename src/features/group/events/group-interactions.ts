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
import { getGame, NONE } from '../data/games';
import GroupUIService, { GROUP_PREFIX, GROUP_DESC_MODAL_PREFIX, GROUP_TIME_MODAL_PREFIX } from '../services/group-ui.service';
import groupService from '../services/group.service';
import groupRepository from '../repositories/group.repository';

export const GROUP_BUTTON_PREFIX = GROUP_PREFIX;
export const GROUP_SELECT_PREFIX = GROUP_PREFIX;

interface GroupDraft {
  description?: string;
  sessionTime?: string;
}

export const groupDraftMap = new Map<string, GroupDraft>();

function getDraft(userId: string): GroupDraft {
  return groupDraftMap.get(userId) ?? {};
}

export async function handleGroupSelectMenu(
  interaction: StringSelectMenuInteraction,
  _client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const step = parts[1];

  if (step === 'game') {
    const gameId = interaction.values[0];
    const ui = GroupUIService.buildStep2(gameId);
    await interaction.update({ components: ui.components });
    return;
  }

  if (step === 'type') {
    const gameId = parts[2];
    const type = interaction.values[0];

    const game = getGame(gameId);
    if (!game) return;

    const needsMode = game.modes !== null && type !== 'Privé' && type !== 'Aram';
    const needsRank = type === 'Ranked' && game.rankOptions !== null;

    if (!needsMode && !needsRank) {
      await createGroup(interaction, gameId, type, NONE, NONE);
      return;
    }

    const draft = getDraft(interaction.user.id);
    const ui = GroupUIService.buildStep3(gameId, type, NONE, NONE, draft.description, draft.sessionTime);
    await interaction.update({ components: ui.components });
    return;
  }

  if (step === 'mode') {
    const gameId = parts[2];
    const type = parts[3];
    const modeId = interaction.values[0];

    const draft = getDraft(interaction.user.id);
    const ui = GroupUIService.buildStep3(gameId, type, modeId, NONE, draft.description, draft.sessionTime);
    await interaction.update({ components: ui.components });
    return;
  }

  if (step === 'rank') {
    const gameId = parts[2];
    const type = parts[3];
    const modeId = parts[4];
    const rankValue = interaction.values[0];

    const draft = getDraft(interaction.user.id);
    const ui = GroupUIService.buildStep3(gameId, type, modeId, rankValue, draft.description, draft.sessionTime);
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
    const [, , gameId, type, modeId, rankValue] = parts;
    const draft = getDraft(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId(`${GROUP_DESC_MODAL_PREFIX}:${gameId}:${type}:${modeId}:${rankValue}`)
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
    const [, , gameId, type, modeId, rankValue] = parts;
    const draft = getDraft(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId(`${GROUP_TIME_MODAL_PREFIX}:${gameId}:${type}:${modeId}:${rankValue}`)
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
    const [, , gameId, type, modeId, rankValue] = parts;
    await createGroup(interaction, gameId, type, modeId, rankValue);
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
  const [, , gameId, type, modeId, rankValue] = parts;

  const description = interaction.fields.getTextInputValue('group_description').trim() || undefined;

  const draft = getDraft(interaction.user.id);
  groupDraftMap.set(interaction.user.id, { ...draft, description });

  const ui = GroupUIService.buildStep3(gameId, type, modeId, rankValue, description, draft.sessionTime);
  await (interaction as any).update({ components: ui.components });
}

export async function handleGroupTimeModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parts = interaction.customId.split(':');
  const [, , gameId, type, modeId, rankValue] = parts;

  const sessionTime = interaction.fields.getTextInputValue('group_time').trim() || undefined;

  const draft = getDraft(interaction.user.id);
  groupDraftMap.set(interaction.user.id, { ...draft, sessionTime });

  const ui = GroupUIService.buildStep3(gameId, type, modeId, rankValue, draft.description, sessionTime);
  await (interaction as any).update({ components: ui.components });
}

async function createGroup(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  gameId: string,
  type: string,
  modeId: string,
  rankValue: string,
): Promise<void> {
  const game = getGame(gameId);
  if (!game) {
    await interaction.reply({ content: 'Jeu introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const draft = getDraft(interaction.user.id);
  groupDraftMap.delete(interaction.user.id);

  const resolvedModeId = modeId !== NONE ? modeId : undefined;
  const resolvedRank = rankValue !== NONE ? rankValue : undefined;

  let totalSlots: number;
  if (type === 'Privé') {
    totalSlots = 10;
  } else if (resolvedModeId && game.modes) {
    totalSlots = game.modes.find((m) => m.id === resolvedModeId)?.slots ?? 4;
  } else {
    totalSlots = 4;
  }

  await interaction.deferUpdate();

  const group = await groupService.createGroup({
    creatorId: interaction.user.id,
    gameId,
    type,
    mode: resolvedModeId,
    rankMin: resolvedRank,
    totalSlots,
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
