import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  TextChannel,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import ImpostorService from '../services/impostor.service';
import ImpostorGamesConfigService from '../services/impostor-games-config.service';
import { IImpostorSession } from '../models/impostor-session.model';

/**
 * Pending challenge validations per team.
 * Key: `${sessionId}_${gameNum}_${team}` → Map<playerId → boolean[]>
 */
const pendingValidations = new Map<string, Map<string, boolean[]>>();

/**
 * Tracks which teams have confirmed validation.
 * Key: `${sessionId}_${gameNum}` → Set<'A' | 'B'>
 */
const confirmedTeams = new Map<string, Set<'A' | 'B'>>();

function pendingKey(sid: string, gn: number, team: 'A' | 'B') {
  return `${sid}_${gn}_${team}`;
}

function confirmedKey(sid: string, gn: number) {
  return `${sid}_${gn}`;
}

function getTeamPending(sid: string, gn: number, team: 'A' | 'B'): Map<string, boolean[]> {
  const key = pendingKey(sid, gn, team);
  if (!pendingValidations.has(key)) pendingValidations.set(key, new Map());
  return pendingValidations.get(key)!;
}

function getConfirmed(sid: string, gn: number): Set<'A' | 'B'> {
  const key = confirmedKey(sid, gn);
  if (!confirmedTeams.has(key)) confirmedTeams.set(key, new Set());
  return confirmedTeams.get(key)!;
}

// ─── Main button router ───────────────────────────────────────────────────────

export async function handleImpostorButtonInteraction(
  interaction: ButtonInteraction,
  client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split('_');
  if (parts.length < 3 || parts[0] !== 'impostor') return;

  const action = parts[1];

  try {
    // These actions reply ephemerally — must NOT deferUpdate first
    if (action === 'tc') {
      await handleToggleChallenge(interaction, parts);
      return;
    }
    if (action === 'myrole') {
      await handleMyRole(interaction, parts);
      return;
    }

    await interaction.deferUpdate();

    const sessionId = parts[2];
    const session = await ImpostorService.getSession(sessionId);

    if (!session) {
      await interaction.followUp({ content: '❌ Ce lobby n\'existe plus.', flags: MessageFlags.Ephemeral });
      return;
    }

    switch (action) {
      case 'joinA':      await handleJoinTeam(interaction, session, sessionId, 'A'); break;
      case 'joinB':      await handleJoinTeam(interaction, session, sessionId, 'B'); break;
      case 'start':      await handleStart(interaction, client, session, sessionId); break;
      case 'endgame':    await handleEndGame(interaction, session, sessionId); break;
      case 'valteam':    await handleValidateTeam(interaction, session, parts); break;
      case 'valnav':     await handleValNav(interaction, session, parts); break;
      case 'confirmval': await handleConfirmVal(interaction, client, session, parts); break;
      case 'votemenu':   await handleVoteMenu(interaction, session); break;
      case 'reveal':     await handleReveal(interaction, client, session, sessionId); break;
      case 'cancel':     await handleCancel(interaction, session, sessionId); break;
    }
  } catch (error) {
    console.error('[ImpostorInteractions] Error:', error);
    await interaction.followUp({ content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

// ─── Select menus ─────────────────────────────────────────────────────────────

export async function handleImpostorSelectMenu(
  interaction: StringSelectMenuInteraction,
  _client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split('_');

  if (parts[1] === 'gameselect') {
    await handleGameSelect(interaction);
    return;
  }

  if (parts[1] !== 'voteselect') return;

  const sessionId = parts[2];
  try {
    await interaction.deferUpdate();

    const targetId = interaction.values[0];
    const updated = await ImpostorService.submitVote(sessionId, interaction.user.id, targetId);
    if (!updated) {
      await interaction.followUp({ content: '❌ Impossible de soumettre le vote.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.followUp({
      content: `✅ Vote enregistré pour **<@${targetId}>** !`,
      flags: MessageFlags.Ephemeral,
    });
    await _updateMainMessage(interaction.client, updated, sessionId);
  } catch (error) {
    console.error('[ImpostorInteractions] Vote error:', error);
  }
}

async function handleGameSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const gameId = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`impostor_createmodal_${gameId}`)
    .setTitle('Configurer la partie')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('modal_parties')
          .setLabel('Nombre de parties (1–10)')
          .setStyle(TextInputStyle.Short)
          .setValue('3')
          .setMinLength(1)
          .setMaxLength(2)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('modal_defis')
          .setLabel('Défis par partie par joueur (1–5)')
          .setStyle(TextInputStyle.Short)
          .setValue('2')
          .setMinLength(1)
          .setMaxLength(1)
          .setRequired(true),
      ),
    );

  await interaction.showModal(modal);
}

// ─── Modal submit ─────────────────────────────────────────────────────────────

export async function handleImpostorModalSubmit(
  interaction: ModalSubmitInteraction,
  _client: BotClient,
): Promise<void> {
  // customId: impostor_createmodal_{gameId}
  const gameId = interaction.customId.replace('impostor_createmodal_', '');

  const numberOfGames = Math.min(10, Math.max(1, parseInt(interaction.fields.getTextInputValue('modal_parties'), 10) || 3));
  const challengesPerGame = Math.min(5, Math.max(1, parseInt(interaction.fields.getTextInputValue('modal_defis'), 10) || 2));

  const gameConfig = ImpostorGamesConfigService.getGame(gameId);
  if (!gameConfig) {
    await interaction.reply({ content: '❌ Jeu non reconnu.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  try {
    const session = await ImpostorService.createSession(
      interaction.user.id,
      interaction.user.username,
      gameId,
      numberOfGames,
      challengesPerGame,
    );

    const sessionId = (session as any)._id.toString();
    const container = ImpostorService.buildLobbyContainer(session);
    const buttons = ImpostorService.buildLobbyButtons(sessionId);

    const message = await interaction.editReply({
      components: [container, buttons],
      flags: MessageFlags.IsComponentsV2,
    });

    await ImpostorService.updateMessageInfo(sessionId, message.id, interaction.channelId!);
  } catch (error) {
    console.error('[Impostor] Error creating session:', error);
    await interaction.editReply({ content: '❌ Une erreur est survenue lors de la création.' });
  }
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleJoinTeam(
  interaction: ButtonInteraction,
  session: IImpostorSession,
  sessionId: string,
  team: 'A' | 'B',
): Promise<void> {
  if (session.status !== 'lobby') {
    await interaction.followUp({ content: '❌ Le lobby n\'accepte plus de joueurs.', flags: MessageFlags.Ephemeral });
    return;
  }

  const updated = await ImpostorService.joinTeam(sessionId, interaction.user.id, interaction.user.username, team);
  if (!updated) return;

  await interaction.message.edit({
    components: [ImpostorService.buildLobbyContainer(updated), ImpostorService.buildLobbyButtons(sessionId)],
  });
}

async function handleStart(
  interaction: ButtonInteraction,
  client: BotClient,
  session: IImpostorSession,
  sessionId: string,
): Promise<void> {
  if (interaction.user.id !== session.hostId) {
    await interaction.followUp({ content: '❌ Seul le créateur peut démarrer.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!ImpostorService.canStart(session)) {
    await interaction.followUp({ content: '❌ Il faut au moins **2 joueurs par équipe**.', flags: MessageFlags.Ephemeral });
    return;
  }

  const updated = await ImpostorService.startGame(sessionId);
  if (!updated) return;

  await interaction.message.edit({
    components: [ImpostorService.buildInProgressContainer(updated), ImpostorService.buildInProgressButtons(sessionId)],
  });
}

async function handleEndGame(
  interaction: ButtonInteraction,
  session: IImpostorSession,
  sessionId: string,
): Promise<void> {
  if (interaction.user.id !== session.hostId) {
    await interaction.followUp({ content: '❌ Seul le créateur peut terminer la partie.', flags: MessageFlags.Ephemeral });
    return;
  }

  const updated = await ImpostorService.endGame(sessionId);
  if (!updated) return;

  const gameNumber = updated.currentGame;
  const confirmed = getConfirmed(sessionId, gameNumber);

  await interaction.message.edit({
    components: [
      ImpostorService.buildValidatingStatusContainer(updated, [...confirmed]),
      ImpostorService.buildValidatingButtons(sessionId, gameNumber),
    ],
  });
}

// ─── Validation handlers ──────────────────────────────────────────────────────

async function handleValidateTeam(
  interaction: ButtonInteraction,
  session: IImpostorSession,
  parts: string[],
): Promise<void> {
  // impostor_valteam_{sid}_{gameNum}_{team}
  const sessionId = parts[2];
  const gameNumber = parseInt(parts[3], 10);
  const team = parts[4] as 'A' | 'B';

  // Only the captain of that team can validate
  const captain = ImpostorService.getCaptain(session, team);
  if (interaction.user.id !== captain) {
    await interaction.followUp({
      content: `❌ Seul le capitaine de l'Équipe ${team} peut valider les défis de son équipe.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const confirmed = getConfirmed(sessionId, gameNumber);
  if (confirmed.has(team)) {
    await interaction.followUp({
      content: `✅ Tu as déjà validé l'Équipe ${team} pour cette partie.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Init pending for all players of this team
  const pending = getTeamPending(sessionId, gameNumber, team);
  const teamPlayers = session.players.filter((p) => p.teamId === team);
  for (const player of teamPlayers) {
    if (!pending.has(player.userId)) {
      const gameEntry = player.gameData.find((d) => d.gameNumber === gameNumber);
      pending.set(player.userId, new Array((gameEntry?.challenges ?? []).length).fill(false));
    }
  }

  // Send ephemeral starting at player 0
  const container = ImpostorService.buildValidationContainer(session, gameNumber, team, 0, pending);
  const navRow = ImpostorService.buildValidationNavRow(sessionId, gameNumber, team, 0, teamPlayers.length);

  await interaction.followUp({
    components: [container, navRow],
    flags: (MessageFlags.Ephemeral | (1 << 15)) as any,
  });
}

async function handleToggleChallenge(
  interaction: ButtonInteraction,
  parts: string[],
): Promise<void> {
  // impostor_tc_{sid}_{gameNum}_{playerId}_{idx}
  const sessionId = parts[2];
  const gameNumber = parseInt(parts[3], 10);
  const playerId = parts[4];
  const challengeIdx = parseInt(parts[5], 10);

  const session = await ImpostorService.getSession(sessionId);
  if (!session) {
    await interaction.reply({ content: '❌ Session introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const player = session.players.find((p) => p.userId === playerId);
  if (!player) {
    await interaction.reply({ content: '❌ Joueur introuvable.', flags: MessageFlags.Ephemeral });
    return;
  }

  const team = player.teamId as 'A' | 'B';
  const pending = getTeamPending(sessionId, gameNumber, team);

  if (!pending.has(playerId)) {
    const gameEntry = player.gameData.find((d) => d.gameNumber === gameNumber);
    pending.set(playerId, new Array((gameEntry?.challenges ?? []).length).fill(false));
  }

  pending.get(playerId)![challengeIdx] = !pending.get(playerId)![challengeIdx];

  const teamPlayers = session.players.filter((p) => p.teamId === team);
  const teamPlayerIdx = teamPlayers.findIndex((p) => p.userId === playerId);

  const container = ImpostorService.buildValidationContainer(session, gameNumber, team, teamPlayerIdx, pending);
  const navRow = ImpostorService.buildValidationNavRow(sessionId, gameNumber, team, teamPlayerIdx, teamPlayers.length);

  await interaction.update({ components: [container, navRow] });
}

async function handleMyRole(
  interaction: ButtonInteraction,
  parts: string[],
): Promise<void> {
  const sessionId = parts[2];
  const session = await ImpostorService.getSession(sessionId);

  if (!session || session.status !== 'in_progress') {
    await interaction.reply({ content: '❌ La partie n\'est pas en cours.', flags: MessageFlags.Ephemeral });
    return;
  }

  const container = ImpostorService.buildMyRoleContent(session, interaction.user.id);
  if (!container) {
    await interaction.reply({ content: '❌ Tu ne fais pas partie de cette session.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    components: [container],
    flags: (MessageFlags.Ephemeral | (1 << 15)) as any,
  });
}

async function handleValNav(
  interaction: ButtonInteraction,
  session: IImpostorSession,
  parts: string[],
): Promise<void> {
  // impostor_valnav_{sid}_{gameNum}_{team}_{teamPlayerIdx}
  const sessionId = parts[2];
  const gameNumber = parseInt(parts[3], 10);
  const team = parts[4] as 'A' | 'B';
  const teamPlayerIdx = parseInt(parts[5], 10);

  const teamPlayers = session.players.filter((p) => p.teamId === team);
  if (teamPlayerIdx < 0 || teamPlayerIdx >= teamPlayers.length) return;

  const pending = getTeamPending(sessionId, gameNumber, team);
  const player = teamPlayers[teamPlayerIdx];
  if (!pending.has(player.userId)) {
    const gameEntry = player.gameData.find((d) => d.gameNumber === gameNumber);
    pending.set(player.userId, new Array((gameEntry?.challenges ?? []).length).fill(false));
  }

  const container = ImpostorService.buildValidationContainer(session, gameNumber, team, teamPlayerIdx, pending);
  const navRow = ImpostorService.buildValidationNavRow(sessionId, gameNumber, team, teamPlayerIdx, teamPlayers.length);

  await interaction.editReply({ components: [container, navRow] });
}

async function handleConfirmVal(
  interaction: ButtonInteraction,
  client: BotClient,
  session: IImpostorSession,
  parts: string[],
): Promise<void> {
  // impostor_confirmval_{sid}_{gameNum}_{team}
  const sessionId = parts[2];
  const gameNumber = parseInt(parts[3], 10);
  const team = parts[4] as 'A' | 'B';

  const captain = ImpostorService.getCaptain(session, team);
  if (interaction.user.id !== captain) {
    await interaction.followUp({ content: '❌ Seul le capitaine peut confirmer.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Mark this team as confirmed
  const confirmed = getConfirmed(sessionId, gameNumber);
  confirmed.add(team);

  // Close the ephemeral
  await interaction.editReply({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x2ecc71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `✅ **Équipe ${team}** validée ! En attente de l'autre équipe...`,
          ),
        ),
    ],
  });

  // Update main message status
  await _refreshValidatingMessage(client, session, sessionId, gameNumber, [...confirmed]);

  // If both teams confirmed → proceed
  if (confirmed.has('A') && confirmed.has('B')) {
    const allValidations = new Map<string, boolean[]>();
    for (const t of ['A', 'B'] as const) {
      const teamPending = getTeamPending(sessionId, gameNumber, t);
      teamPending.forEach((state, playerId) => allValidations.set(playerId, state));
    }

    const updated = await ImpostorService.confirmValidation(sessionId, gameNumber, allValidations);
    if (!updated) return;

    // Cleanup memory
    confirmedTeams.delete(confirmedKey(sessionId, gameNumber));
    pendingValidations.delete(pendingKey(sessionId, gameNumber, 'A'));
    pendingValidations.delete(pendingKey(sessionId, gameNumber, 'B'));

    // Update main message
    const channel = await client.channels.fetch(session.channelId!);
    if (!channel?.isTextBased()) return;

    const msg = await (channel as TextChannel).messages.fetch(session.messageId!);

    if (updated.status === 'voting') {
      await msg.edit({
        components: [
          ImpostorService.buildVotingContainer(updated),
          ImpostorService.buildVotingButtons(sessionId),
        ],
      });
    } else {
      await msg.edit({
        components: [
          ImpostorService.buildInProgressContainer(updated),
          ImpostorService.buildInProgressButtons(sessionId),
        ],
      });
    }
  }
}

// ─── Vote & reveal ────────────────────────────────────────────────────────────

async function handleVoteMenu(
  interaction: ButtonInteraction,
  session: IImpostorSession,
): Promise<void> {
  if (session.status !== 'voting') {
    await interaction.followUp({ content: '❌ La phase de vote n\'est pas encore commencée.', flags: MessageFlags.Ephemeral });
    return;
  }

  const voter = session.players.find((p) => p.userId === interaction.user.id);
  if (!voter) {
    await interaction.followUp({ content: '❌ Vous ne faites pas partie de cette session.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (voter.vote) {
    await interaction.followUp({ content: '⚠️ Vous avez déjà voté !', flags: MessageFlags.Ephemeral });
    return;
  }

  const voteSelect = ImpostorService.buildVoteSelect(session, interaction.user.id);
  if (!voteSelect) {
    await interaction.followUp({ content: '❌ Impossible de charger le menu de vote.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.followUp({
    embeds: [
      new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🗳️ Qui est le saboteur ?')
        .setDescription(`Désigne le **saboteur de ton Équipe ${voter.teamId}**.\nTon vote est secret.`),
    ],
    components: [voteSelect],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleReveal(
  interaction: ButtonInteraction,
  client: BotClient,
  session: IImpostorSession,
  sessionId: string,
): Promise<void> {
  if (interaction.user.id !== session.hostId) {
    await interaction.followUp({ content: '❌ Seul le créateur peut révéler les résultats.', flags: MessageFlags.Ephemeral });
    return;
  }

  const updated = await ImpostorService.revealSession(sessionId);
  if (!updated) return;

  await interaction.message.edit({
    components: [ImpostorService.buildRevealContainer(updated)],
  });

  const channel = interaction.channel;
  if (!channel?.isTextBased()) return;

  await (channel as TextChannel).send({
    components: [ImpostorService.buildRankingContainer(updated)],
    flags: 1 << 15,
  });

  await (channel as TextChannel).send({
    components: [ImpostorService.buildChallengesRecapContainer(updated)],
    flags: 1 << 15,
  });
}


async function handleCancel(
  interaction: ButtonInteraction,
  session: IImpostorSession,
  sessionId: string,
): Promise<void> {
  if (interaction.user.id !== session.hostId) {
    await interaction.followUp({ content: '❌ Seul le créateur peut annuler.', flags: MessageFlags.Ephemeral });
    return;
  }

  await ImpostorService.cancelSession(sessionId);

  await interaction.message.edit({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# 🚫 Lobby annulé\nLe créateur a annulé ce lobby.'),
        ),
    ],
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _refreshValidatingMessage(
  client: import('discord.js').Client,
  session: IImpostorSession,
  sessionId: string,
  gameNumber: number,
  confirmed: ('A' | 'B')[],
): Promise<void> {
  try {
    if (!session.channelId || !session.messageId) return;
    const channel = await client.channels.fetch(session.channelId);
    if (!channel?.isTextBased()) return;

    const msg = await (channel as TextChannel).messages.fetch(session.messageId);
    await msg.edit({
      components: [
        ImpostorService.buildValidatingStatusContainer(session, confirmed),
        ImpostorService.buildValidatingButtons(sessionId, gameNumber),
      ],
    });
  } catch {
    // Silent fail
  }
}

async function _updateMainMessage(
  client: import('discord.js').Client,
  session: IImpostorSession,
  sessionId: string,
): Promise<void> {
  try {
    if (!session.channelId || !session.messageId) return;
    const channel = await client.channels.fetch(session.channelId);
    if (!channel?.isTextBased()) return;

    const msg = await (channel as TextChannel).messages.fetch(session.messageId);

    if (session.status === 'voting') {
      await msg.edit({
        components: [
          ImpostorService.buildVotingContainer(session),
          ImpostorService.buildVotingButtons(sessionId),
        ],
      });
    }
  } catch {
    // Silent fail
  }
}
