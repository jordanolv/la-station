import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
} from 'discord.js';
import { ImpostorSessionRepository } from '../repositories/impostor-session.repository';
import ImpostorGamesConfigService from './impostor-games-config.service';
import { IImpostorSession, ImpostorPlayerData, PlayerChallenge } from '../models/impostor-session.model';
import { impostorId, IMPOSTOR_MIN_PER_TEAM } from '../constants/impostor.constants';
import type { TeamId } from '../types/impostor.types';

// DEV: fake players auto-added when a real user joins a team
const DEV_FAKES: Record<'A' | 'B', Array<{ userId: string; username: string }>> = {
  A: [
    { userId: '111111111111111111', username: 'FakePlayer_A1' },
    { userId: '222222222222222222', username: 'FakePlayer_A2' },
  ],
  B: [
    { userId: '333333333333333333', username: 'FakePlayer_B1' },
    { userId: '444444444444444444', username: 'FakePlayer_B2' },
  ],
};

const DIFFICULTY_ICON: Record<string, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

class ImpostorService {
  // ─── Session lifecycle ───────────────────────────────────────────────────────

  async createSession(
    hostId: string,
    hostUsername: string,
    gameId: string,
    numberOfGames: number,
    challengesPerGame: number,
  ): Promise<IImpostorSession> {
    const game = ImpostorGamesConfigService.getGame(gameId);
    if (!game) throw new Error(`Game config not found: ${gameId}`);

    return ImpostorSessionRepository.create({
      hostId,
      hostUsername,
      gameId,
      gameName: game.name,
      numberOfGames,
      challengesPerGame,
    });
  }

  async getSession(sessionId: string): Promise<IImpostorSession | null> {
    return ImpostorSessionRepository.findById(sessionId);
  }

  async updateMessageInfo(sessionId: string, messageId: string, channelId: string): Promise<void> {
    await ImpostorSessionRepository.updateMessageInfo(sessionId, messageId, channelId);
  }

  async joinTeam(
    sessionId: string,
    userId: string,
    username: string,
    teamId: TeamId,
  ): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session || session.status !== 'lobby') return null;

    const existing = session.players.find((p) => p.userId === userId);
    if (existing) {
      if (existing.teamId === teamId) return session;
      const oldTeam = existing.teamId as TeamId;
      if (oldTeam === 'A' && session.captainA === userId) {
        const nextA = session.players.find((p) => p.userId !== userId && p.teamId === 'A');
        session.captainA = nextA?.userId;
      } else if (oldTeam === 'B' && session.captainB === userId) {
        const nextB = session.players.find((p) => p.userId !== userId && p.teamId === 'B');
        session.captainB = nextB?.userId;
      }
      existing.teamId = teamId;
    } else {
      session.players.push({ userId, username, teamId, gameData: [] } as ImpostorPlayerData);
    }

    if (teamId === 'A' && !session.captainA) session.captainA = userId;
    if (teamId === 'B' && !session.captainB) session.captainB = userId;

    const alreadyHasFakes = session.players.some(
      (p) => p.teamId === teamId && DEV_FAKES[teamId].some((f) => f.userId === p.userId),
    );
    if (!alreadyHasFakes) {
      for (const fake of DEV_FAKES[teamId]) {
        session.players.push({ ...fake, teamId, gameData: [] } as ImpostorPlayerData);
      }
    }

    session.markModified('players');
    return ImpostorSessionRepository.save(session);
  }

  getCaptain(session: IImpostorSession, team: TeamId): string | undefined {
    return team === 'A' ? session.captainA : session.captainB;
  }

  async startGame(sessionId: string): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session || session.status !== 'lobby') return null;

    const teamA = session.players.filter((p) => p.teamId === 'A');
    const teamB = session.players.filter((p) => p.teamId === 'B');
    if (teamA.length < IMPOSTOR_MIN_PER_TEAM || teamB.length < IMPOSTOR_MIN_PER_TEAM) return null;

    const game = ImpostorGamesConfigService.getGame(session.gameId)!;
    const rolesA = ImpostorGamesConfigService.assignTeamRoles(teamA.length, game.roles);
    const rolesB = ImpostorGamesConfigService.assignTeamRoles(teamB.length, game.roles);
    const diffTemplate = this._randomDifficultyTemplate(session.challengesPerGame);

    for (const [idx, player] of teamA.entries()) {
      const role = game.roles.find((r) => r.id === rolesA[idx]) ?? game.roles[0];
      player.roleId = role.id;
      player.roleName = role.name;
      player.roleEmoji = role.emoji;
      player.roleGoal = role.goal;
      const challenges = ImpostorGamesConfigService.getRandomChallenges(game, diffTemplate);
      player.gameData = [{ gameNumber: 1, challenges, validated: challenges.map(() => false) }];
    }

    for (const [idx, player] of teamB.entries()) {
      const role = game.roles.find((r) => r.id === rolesB[idx]) ?? game.roles[0];
      player.roleId = role.id;
      player.roleName = role.name;
      player.roleEmoji = role.emoji;
      player.roleGoal = role.goal;
      const challenges = ImpostorGamesConfigService.getRandomChallenges(game, diffTemplate);
      player.gameData = [{ gameNumber: 1, challenges, validated: challenges.map(() => false) }];
    }

    session.currentGame = 1;
    session.status = 'in_progress';
    session.markModified('players');
    return ImpostorSessionRepository.save(session);
  }

  async endGame(sessionId: string): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session || session.status !== 'in_progress') return null;

    session.status = 'validating';
    return ImpostorSessionRepository.save(session);
  }

  async confirmValidation(
    sessionId: string,
    gameNumber: number,
    validations: Map<string, boolean[]>,
  ): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session) return null;

    for (const player of session.players) {
      const state = validations.get(player.userId);
      if (!state) continue;
      const gameEntry = player.gameData.find((d) => d.gameNumber === gameNumber);
      if (gameEntry) gameEntry.validated = state;
    }
    session.markModified('players');

    if (gameNumber >= session.numberOfGames) {
      session.status = 'voting';
      return ImpostorSessionRepository.save(session);
    }

    const nextGame = gameNumber + 1;
    session.currentGame = nextGame;
    session.status = 'in_progress';

    const game = ImpostorGamesConfigService.getGame(session.gameId)!;
    const diffTemplate = this._randomDifficultyTemplate(session.challengesPerGame);
    for (const player of session.players) {
      const challenges = this._pickNextChallenges(player, game, diffTemplate);
      player.gameData.push({
        gameNumber: nextGame,
        challenges,
        validated: challenges.map(() => false),
      });
    }

    session.markModified('players');
    return ImpostorSessionRepository.save(session);
  }

  async submitVote(sessionId: string, voterId: string, targetId: string): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session || session.status !== 'voting') return null;

    const player = session.players.find((p) => p.userId === voterId);
    if (!player) return null;

    player.vote = targetId;
    session.markModified('players');
    return ImpostorSessionRepository.save(session);
  }

  async revealSession(sessionId: string): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session) return null;

    session.status = 'finished';
    return ImpostorSessionRepository.save(session);
  }

  async cancelSession(sessionId: string): Promise<IImpostorSession | null> {
    const session = await ImpostorSessionRepository.findById(sessionId);
    if (!session) return null;

    session.status = 'cancelled';
    return ImpostorSessionRepository.save(session);
  }

  canStart(session: IImpostorSession): boolean {
    const teamA = session.players.filter((p) => p.teamId === 'A');
    const teamB = session.players.filter((p) => p.teamId === 'B');
    return teamA.length >= IMPOSTOR_MIN_PER_TEAM && teamB.length >= IMPOSTOR_MIN_PER_TEAM;
  }

  // ─── Containers ───────────────────────────────────────────────────────────────

  buildLobbyContainer(session: IImpostorSession): ContainerBuilder {
    const emoji = ImpostorGamesConfigService.getEmoji(session.gameId);
    const teamA = session.players.filter((p) => p.teamId === 'A');
    const teamB = session.players.filter((p) => p.teamId === 'B');

    const teamAText = teamA.length
      ? teamA.map((p) => `${session.captainA === p.userId ? '👑 ' : '• '}<@${p.userId}>`).join('\n')
      : '*Aucun joueur*';
    const teamBText = teamB.length
      ? teamB.map((p) => `${session.captainB === p.userId ? '👑 ' : '• '}<@${p.userId}>`).join('\n')
      : '*Aucun joueur*';

    const readyIcon = this.canStart(session) ? '✅' : '⏳';

    return new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emoji} Lobby Imposteur — ${session.gameName}`),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `<@${session.hostId}> a créé un lobby · **${session.numberOfGames}** partie(s) · **${session.challengesPerGame}** défi(s)/partie/joueur`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🔵 Équipe A (${teamA.length})\n${teamAText}`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🔴 Équipe B (${teamB.length})\n${teamBText}`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${readyIcon} Minimum **${IMPOSTOR_MIN_PER_TEAM}** joueurs par équipe pour démarrer`,
        ),
      );
  }

  buildInProgressContainer(session: IImpostorSession): ContainerBuilder {
    const emoji = ImpostorGamesConfigService.getEmoji(session.gameId);
    const teamA = session.players.filter((p) => p.teamId === 'A');
    const teamB = session.players.filter((p) => p.teamId === 'B');

    return new ContainerBuilder()
      .setAccentColor(0x00aa55)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${emoji} ${session.gameName} — Partie **${session.currentGame}/${session.numberOfGames}**`,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🎮 Partie en cours · Chaque joueur a reçu ses défis secrets en DM`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🔵 Équipe A\n${teamA.map((p) => `• <@${p.userId}>`).join('\n')}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🔴 Équipe B\n${teamB.map((p) => `• <@${p.userId}>`).join('\n')}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `*Cliquez sur **Fin de la partie** lorsque le match est terminé*`,
        ),
      );
  }

  buildValidatingStatusContainer(session: IImpostorSession, confirmedTeams: ('A' | 'B')[]): ContainerBuilder {
    const emoji = ImpostorGamesConfigService.getEmoji(session.gameId);
    const statusA = confirmedTeams.includes('A') ? '✅ Validée' : '⏳ En attente';
    const statusB = confirmedTeams.includes('B') ? '✅ Validée' : '⏳ En attente';

    return new ContainerBuilder()
      .setAccentColor(0xffa500)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${emoji} ${session.gameName} — Validation partie ${session.currentGame}/${session.numberOfGames}`,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Chaque capitaine valide les défis de son équipe en cliquant son bouton.`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🔵 **Équipe A** — ${statusA}\n🔴 **Équipe B** — ${statusB}`,
        ),
      );
  }

  buildValidationContainer(
    session: IImpostorSession,
    gameNumber: number,
    team: 'A' | 'B',
    teamPlayerIdx: number,
    pendingState: Map<string, boolean[]>,
  ): ContainerBuilder {
    const sessionId = (session as any)._id.toString();
    const teamPlayers = session.players.filter((p) => p.teamId === team);
    const player = teamPlayers[teamPlayerIdx];
    const total = teamPlayers.length;
    const teamEmoji = team === 'A' ? '🔵' : '🔴';
    const gameEntry = player.gameData.find((d) => d.gameNumber === gameNumber);
    const challenges = gameEntry?.challenges ?? [];
    const state = pendingState.get(player.userId) ?? new Array(challenges.length).fill(false);

    const earnedPoints = challenges.reduce((sum, c, i) => sum + (state[i] ? c.points : 0), 0);
    const totalPoints = challenges.reduce((sum, c) => sum + c.points, 0);

    const container = new ContainerBuilder()
      .setAccentColor(team === 'A' ? 0x3498db : 0xe74c3c)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ✅ Validation ${teamEmoji} Équipe ${team} — Partie ${gameNumber}/${session.numberOfGames}`,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${player.username}** · Joueur ${teamPlayerIdx + 1}/${total} · **${earnedPoints}/${totalPoints} pts**`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (challenges.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('*Aucun défi pour ce joueur*'),
      );
    } else {
      for (let idx = 0; idx < challenges.length; idx++) {
        const challenge = challenges[idx];
        const done = state[idx] ?? false;
        const diffIcon = DIFFICULTY_ICON[challenge.difficulty] ?? '⚪';

        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${done ? '✅' : '☐'} ${diffIcon} **Défi ${idx + 1}** (+${challenge.points}pt${challenge.points > 1 ? 's' : ''}) · ${challenge.text}`,
              ),
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(impostorId.toggleChallenge(sessionId, gameNumber, player.userId, idx))
                .setLabel(done ? '✗ Annuler' : '✓ Valider')
                .setStyle(done ? ButtonStyle.Secondary : ButtonStyle.Success),
            ),
        );
      }
    }

    return container;
  }

  buildValidatingButtons(sessionId: string, gameNumber: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(impostorId.validateTeam(sessionId, gameNumber, 'A'))
        .setLabel('Valider Équipe A')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔵'),
      new ButtonBuilder()
        .setCustomId(impostorId.validateTeam(sessionId, gameNumber, 'B'))
        .setLabel('Valider Équipe B')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴'),
    );
  }

  buildValidationNavRow(
    sessionId: string,
    gameNumber: number,
    team: 'A' | 'B',
    teamPlayerIdx: number,
    teamTotal: number,
  ): ActionRowBuilder<ButtonBuilder> {
    const isLast = teamPlayerIdx === teamTotal - 1;

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(impostorId.valNav(sessionId, gameNumber, team, teamPlayerIdx - 1))
        .setLabel('◀ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(teamPlayerIdx === 0),
      ...(isLast
        ? [
            new ButtonBuilder()
              .setCustomId(impostorId.confirmVal(sessionId, gameNumber, team))
              .setLabel('Confirmer ✓')
              .setStyle(ButtonStyle.Success),
          ]
        : [
            new ButtonBuilder()
              .setCustomId(impostorId.valNav(sessionId, gameNumber, team, teamPlayerIdx + 1))
              .setLabel('Joueur suivant ▶')
              .setStyle(ButtonStyle.Primary),
          ]),
    );
  }

  buildVotingContainer(session: IImpostorSession): ContainerBuilder {
    const emoji = ImpostorGamesConfigService.getEmoji(session.gameId);
    const votedCount = session.players.filter((p) => p.vote).length;

    return new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emoji} Phase de vote — ${session.gameName}`),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Toutes les parties sont terminées !\nVotez pour désigner l'**imposteur dans votre équipe**.\nCliquez sur **Voter** pour soumettre en privé.`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🗳️ **${votedCount}/${session.players.length}** joueur(s) ont voté`,
        ),
      );
  }

  buildRevealContainer(session: IImpostorSession): ContainerBuilder {
    const emoji = ImpostorGamesConfigService.getEmoji(session.gameId);
    const imposteurs = session.players.filter((p) => p.roleGoal === 'sabotage');
    const decoys = session.players.filter((p) => p.roleGoal === 'get_voted');

    const correctVoters = session.players.filter((voter) => {
      const ownImposteur = imposteurs.find((s) => s.teamId === voter.teamId);
      return voter.vote === ownImposteur?.userId;
    });

    const decoyVoted = decoys.filter((decoy) => {
      const votesReceived = session.players.filter((v) => v.vote === decoy.userId).length;
      return votesReceived > 0;
    });

    const formatTeamLines = (players: typeof session.players) =>
      players
        .map((p) => {
          const votes = session.players.filter((v) => v.vote === p.userId).length;
          return `${p.roleEmoji ?? '❓'} <@${p.userId}> **${p.roleName ?? '?'}** · ${votes} vote(s)`;
        })
        .join('\n');

    const imposteurLines = imposteurs.length
      ? imposteurs.map((p) => `• <@${p.userId}> — Équipe **${p.teamId}**`).join('\n')
      : '*Inconnu*';

    const correctLines = correctVoters.length
      ? correctVoters.map((p) => `• <@${p.userId}>`).join('\n')
      : '*Personne n\'a deviné juste*';

    const container = new ContainerBuilder()
      .setAccentColor(0xff4500)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emoji} Révélation — ${session.gameName}`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🔴 Les imposteurs étaient\n${imposteurLines}`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🔵 Équipe A\n${formatTeamLines(session.players.filter((p) => p.teamId === 'A')) || '*Vide*'}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🔴 Équipe B\n${formatTeamLines(session.players.filter((p) => p.teamId === 'B')) || '*Vide*'}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ✅ Ont deviné l'imposteur\n${correctLines}`),
      );

    if (decoyVoted.length) {
      const decoyLines = decoyVoted.map((p) => {
        const votes = session.players.filter((v) => v.vote === p.userId).length;
        return `• <@${p.userId}> — **${votes}** vote(s) reçu(s) 🎭`;
      }).join('\n');
      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### 🎭 Boucs émissaires victorieux\n${decoyLines}`),
        );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `*Les défis de chaque joueur sont affichés ci-dessous ↓*`,
        ),
      );

    return container;
  }

  buildRankingContainer(session: IImpostorSession): ContainerBuilder {
    const emoji = ImpostorGamesConfigService.getEmoji(session.gameId);
    const ranked = this._rankPlayers(session);
    const medals = ['🥇', '🥈', '🥉'];

    const rankingLines = ranked
      .map((r, i) => {
        const medal = medals[i] ?? `**${i + 1}.**`;
        const teamEmoji = r.player.teamId === 'A' ? '🔵' : '🔴';
        const roleTag = r.player.roleGoal === 'sabotage' ? ' 🔴' : r.player.roleGoal === 'get_voted' ? ' 🎭' : '';
        return `${medal} ${r.player.username}${roleTag} ${teamEmoji} — **${r.earnedPoints}/${r.totalPoints} pts**`;
      })
      .join('\n');

    return new ContainerBuilder()
      .setAccentColor(0xf1c40f)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emoji} Classement — ${session.gameName}`),
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(rankingLines));
  }

  buildChallengesRecapContainer(session: IImpostorSession): ContainerBuilder {
    const ranked = this._rankPlayers(session);

    const container = new ContainerBuilder()
      .setAccentColor(0x2c3e50)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📋 Récap des défis`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    for (const { player } of ranked) {
      const teamEmoji = player.teamId === 'A' ? '🔵' : '🔴';
      const roleEmoji = player.roleEmoji ?? '❓';
      const goalLabel = player.roleGoal === 'sabotage'
        ? '*Imposteur*'
        : player.roleGoal === 'get_voted'
          ? '*Bouc Émissaire*'
          : '*Équipier*';

      let lines = `### ${roleEmoji} ${player.username} ${teamEmoji} — ${goalLabel}\n`;

      for (const gameEntry of player.gameData) {
        lines += `**Partie ${gameEntry.gameNumber}**\n`;
        lines += gameEntry.challenges
          .map((c, i) => {
            const diffIcon = DIFFICULTY_ICON[c.difficulty] ?? '⚪';
            const status = (gameEntry.validated[i] ?? false) ? '✅' : '❌';
            return `${status} ${diffIcon} ${c.text} (+${c.points}pt${c.points > 1 ? 's' : ''})`;
          })
          .join('\n');
        lines += '\n';
      }

      container
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.trim()))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false));
    }

    return container;
  }

  buildMyRoleContent(session: IImpostorSession, userId: string): ContainerBuilder | null {
    const player = session.players.find((p) => p.userId === userId);
    if (!player) return null;

    const gameEntry = player.gameData.find((d) => d.gameNumber === session.currentGame);
    const teamEmoji = player.teamId === 'A' ? '🔵' : '🔴';
    const roleEmoji = player.roleEmoji ?? '❓';
    const accentColor = player.roleGoal === 'sabotage' ? 0xe74c3c : player.roleGoal === 'get_voted' ? 0x9b59b6 : 0x2ecc71;
    const challenges = gameEntry?.challenges ?? [];

    const challengeLines = challenges
      .map((c, i) => {
        const diffIcon = DIFFICULTY_ICON[c.difficulty] ?? '⚪';
        return `**${i + 1}.** ${diffIcon} ${c.text} (+${c.points}pt${c.points > 1 ? 's' : ''})`;
      })
      .join('\n') || '*Aucun défi*';

    const container = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${roleEmoji} ${player.roleName ?? 'Inconnu'} — ${teamEmoji} Équipe ${player.teamId}`,
        ),
      );

    if (session.currentGame === 1) {
      const role = ImpostorGamesConfigService.getRole(session.gameId, player.roleId ?? '');
      if (role?.description) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`*${role.description}*`),
        );
      }
    }

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 📋 Tes défis — Partie ${session.currentGame}/${session.numberOfGames}\n${challengeLines}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          player.roleGoal === 'sabotage'
            ? '🤫 *Ne dis ça à personne !*'
            : player.roleGoal === 'get_voted'
              ? '🎭 *Fais en sorte qu\'on te soupçonne !*'
              : '👀 *Observe bien tes coéquipiers !*',
        ),
      );

    return container;
  }

  // ─── Button rows ─────────────────────────────────────────────────────────────

  buildLobbyButtons(sessionId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(impostorId.joinA(sessionId))
        .setLabel('Rejoindre Équipe A')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔵'),
      new ButtonBuilder()
        .setCustomId(impostorId.joinB(sessionId))
        .setLabel('Rejoindre Équipe B')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴'),
      new ButtonBuilder()
        .setCustomId(impostorId.start(sessionId))
        .setLabel('Démarrer')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️'),
      new ButtonBuilder()
        .setCustomId(impostorId.cancel(sessionId))
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✖️'),
    );
  }

  buildInProgressButtons(sessionId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(impostorId.myRole(sessionId))
        .setLabel('Tirer mon rôle')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎲'),
      new ButtonBuilder()
        .setCustomId(impostorId.endGame(sessionId))
        .setLabel('Fin de la partie')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🏁'),
    );
  }

  buildVotingButtons(sessionId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(impostorId.voteMenu(sessionId))
        .setLabel('Voter')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🗳️'),
      new ButtonBuilder()
        .setCustomId(impostorId.reveal(sessionId))
        .setLabel('Révéler les résultats')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🎭'),
    );
  }

  buildVoteSelect(session: IImpostorSession, voterId: string): ActionRowBuilder<StringSelectMenuBuilder> | null {
    const sessionId = (session as any)._id.toString();
    const voter = session.players.find((p) => p.userId === voterId);
    if (!voter) return null;

    const teammates = session.players.filter(
      (p) => p.teamId === voter.teamId && p.userId !== voterId,
    );
    if (!teammates.length) return null;

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(impostorId.voteSelect(sessionId))
        .setPlaceholder('Qui est l\'imposteur de ton équipe ?')
        .addOptions(
          teammates.map((p) => ({
            label: p.username,
            value: p.userId,
            description: `Équipe ${voter.teamId}`,
          })),
        ),
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private _pickNextChallenges(
    player: ImpostorPlayerData,
    game: NonNullable<ReturnType<typeof ImpostorGamesConfigService.getGame>>,
    diffTemplate: string[],
  ): PlayerChallenge[] {
    const usedTexts = new Set(player.gameData.flatMap((d) => d.challenges.map((c) => c.text)));
    return ImpostorGamesConfigService.getRandomChallenges(game, diffTemplate, usedTexts);
  }

  private _randomDifficultyTemplate(count: number): string[] {
    const difficulties = ['easy', 'medium', 'hard'];
    return Array.from({ length: count }, () => difficulties[Math.floor(Math.random() * difficulties.length)]);
  }

  private _rankPlayers(session: IImpostorSession) {
    return [...session.players]
      .map((p) => ({
        player: p,
        earnedPoints: p.gameData.reduce(
          (sum, g) => sum + g.challenges.reduce((s, c, i) => s + (g.validated[i] ? c.points : 0), 0),
          0,
        ),
        totalPoints: p.gameData.reduce(
          (sum, g) => sum + g.challenges.reduce((s, c) => s + c.points, 0),
          0,
        ),
      }))
      .sort((a, b) => b.earnedPoints - a.earnedPoints);
  }
}

export default new ImpostorService();
