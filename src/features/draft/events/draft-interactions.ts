import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { DraftService, pendingSetups } from '../services/draft.service';
import type { DraftPlayer } from '../types/draft.types';

// ─── Button interactions ──────────────────────────────────────────────────────

export async function handleDraftButton(
  interaction: ButtonInteraction,
  _client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];

  try {
    await interaction.deferUpdate();

    switch (action) {
      case 'launch':        await handleLaunch(interaction, parts[2]); break;
      case 'cancel_setup':  await handleCancelSetup(interaction, parts[2]); break;
      case 'first':         await handleChooseFirst(interaction, parts[2], parts[3] as 'yes' | 'no'); break;
    }
  } catch (error) {
    console.error('[DraftInteractions] Button error:', error);
    await interaction.followUp({ content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

// ─── UserSelectMenu interactions ──────────────────────────────────────────────

export async function handleDraftUserSelect(
  interaction: UserSelectMenuInteraction,
  _client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const setupId = parts[2];

  const pending = pendingSetups.get(setupId);
  if (!pending) {
    await interaction.deferUpdate();
    return;
  }

  if (interaction.user.id !== pending.hostId) {
    await interaction.reply({
      content: '❌ Seul l\'organisateur peut configurer le draft.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const resolvePlayer = (userId: string): DraftPlayer => {
    const member = interaction.members.get(userId);
    const displayName = member && 'displayName' in member ? member.displayName : undefined;
    return {
      id: userId,
      name: displayName ?? interaction.users.get(userId)?.username ?? userId,
    };
  };

  if (action === 'cap1') {
    pending.captain1 = resolvePlayer(interaction.values[0]);
  } else if (action === 'cap2') {
    pending.captain2 = resolvePlayer(interaction.values[0]);
  } else if (action === 'players') {
    pending.players = interaction.values.map(resolvePlayer);
  }

  pendingSetups.set(setupId, pending);
  await interaction.deferUpdate();
}

// ─── StringSelectMenu interactions ────────────────────────────────────────────

export async function handleDraftStringSelect(
  interaction: StringSelectMenuInteraction,
  _client: BotClient,
): Promise<void> {
  const sessionId = interaction.customId.split(':')[2];

  await interaction.deferUpdate();

  const session = DraftService.getSession(sessionId);
  if (!session || session.status !== 'picking') {
    await interaction.followUp({ content: '❌ Ce draft n\'existe plus ou n\'est pas en cours.', flags: MessageFlags.Ephemeral });
    return;
  }

  const current = DraftService.getCurrentPicker(session);
  if (interaction.user.id !== current.id) {
    await interaction.followUp({
      content: `❌ C'est au tour de **${current.name}** de choisir.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const updated = DraftService.applyPick(session, interaction.values[0]);
  if (!updated) {
    await interaction.followUp({ content: '❌ Joueur invalide.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (updated.status === 'done') {
    await interaction.message.edit({
      components: [DraftService.buildDoneContainer(updated)],
    });
    DraftService.deleteSession(sessionId);
  } else {
    await interaction.message.edit({
      components: [DraftService.buildPickingContainer(updated), DraftService.buildPickSelect(updated)],
    });
  }
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleLaunch(interaction: ButtonInteraction, setupId: string): Promise<void> {
  const pending = pendingSetups.get(setupId);

  if (!pending || interaction.user.id !== pending.hostId) {
    await interaction.followUp({ content: '❌ Tu n\'es pas l\'organisateur du draft.', flags: MessageFlags.Ephemeral });
    return;
  }

  const { captain1, captain2, players } = pending;

  if (!captain1 || !captain2) {
    await interaction.followUp({ content: '❌ Tu dois sélectionner les deux capitaines.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (captain1.id === captain2.id) {
    await interaction.followUp({ content: '❌ Les deux capitaines doivent être différents.', flags: MessageFlags.Ephemeral });
    return;
  }

  const filteredPlayers = (players ?? []).filter((p) => p.id !== captain1.id && p.id !== captain2.id);

  if (filteredPlayers.length < 2) {
    await interaction.followUp({ content: '❌ Il faut au moins 2 joueurs à drafter (hors capitaines).', flags: MessageFlags.Ephemeral });
    return;
  }

  const coinflipWinner: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
  const session = DraftService.createSession(
    interaction.user.id,
    interaction.channelId!,
    interaction.message.id,
    captain1,
    captain2,
    filteredPlayers,
    coinflipWinner,
  );

  pendingSetups.delete(setupId);

  await interaction.message.edit({
    components: [DraftService.buildCoinflipContainer(session), DraftService.buildChooseFirstButtons(session.id)],
  });
}

async function handleCancelSetup(interaction: ButtonInteraction, setupId: string): Promise<void> {
  const pending = pendingSetups.get(setupId);

  if (!pending || interaction.user.id !== pending.hostId) {
    await interaction.followUp({ content: '❌ Seul l\'organisateur peut annuler.', flags: MessageFlags.Ephemeral });
    return;
  }

  pendingSetups.delete(setupId);

  await interaction.message.edit({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ❌ Draft annulé')),
    ],
  });
}

async function handleChooseFirst(
  interaction: ButtonInteraction,
  sessionId: string,
  choice: 'yes' | 'no',
): Promise<void> {
  const session = DraftService.getSession(sessionId);

  if (!session) {
    await interaction.followUp({ content: '❌ Ce draft n\'existe plus.', flags: MessageFlags.Ephemeral });
    return;
  }

  const winner = session.coinflipWinner === 1 ? session.captain1 : session.captain2;

  if (interaction.user.id !== winner.id) {
    await interaction.followUp({
      content: `❌ C'est à **${winner.name}** de choisir.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  session.firstPicker = choice === 'yes' ? session.coinflipWinner : session.coinflipWinner === 1 ? 2 : 1;
  session.status = 'picking';

  await interaction.message.edit({
    components: [DraftService.buildPickingContainer(session), DraftService.buildPickSelect(session)],
  });
}
