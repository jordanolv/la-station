import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import type { DraftSession, DraftPlayer, PendingSetup } from '../types/draft.types';

export const pendingSetups = new Map<string, PendingSetup>();
const sessions = new Map<string, DraftSession>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getPickerTeam(pickIndex: number, firstPicker: 1 | 2): 1 | 2 {
  // Snake pattern: first → other → other → first → first → other...
  const pos = pickIndex % 4;
  const isFirstTurn = pos === 0 || pos === 3;
  return isFirstTurn ? firstPicker : firstPicker === 1 ? 2 : 1;
}

export class DraftService {
  static createSession(
    hostId: string,
    channelId: string,
    messageId: string,
    captain1: DraftPlayer,
    captain2: DraftPlayer,
    players: DraftPlayer[],
    coinflipWinner: 1 | 2,
  ): DraftSession {
    const session: DraftSession = {
      id: generateId(),
      hostId,
      channelId,
      messageId,
      captain1,
      captain2,
      remainingPlayers: players,
      team1: [captain1],
      team2: [captain2],
      pickIndex: 0,
      firstPicker: coinflipWinner,
      coinflipWinner,
      status: 'choosefirst',
    };
    sessions.set(session.id, session);
    return session;
  }

  static getSession(id: string): DraftSession | undefined {
    return sessions.get(id);
  }

  static deleteSession(id: string): void {
    sessions.delete(id);
  }

  static getCurrentPicker(session: DraftSession): DraftPlayer {
    const team = getPickerTeam(session.pickIndex, session.firstPicker);
    return team === 1 ? session.captain1 : session.captain2;
  }

  static applyPick(session: DraftSession, playerId: string): DraftSession | null {
    const player = session.remainingPlayers.find((p) => p.id === playerId);
    if (!player) return null;

    const team = getPickerTeam(session.pickIndex, session.firstPicker);
    session.remainingPlayers = session.remainingPlayers.filter((p) => p.id !== playerId);

    if (team === 1) session.team1.push(player);
    else session.team2.push(player);

    session.pickIndex++;

    if (session.remainingPlayers.length === 0) {
      session.status = 'done';
    }

    sessions.set(session.id, session);
    return session;
  }

  // ─── UI builders ────────────────────────────────────────────────────────────

  static buildSetupContainer(): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎯 Draft'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          'Sélectionnez les deux capitaines puis les joueurs à drafter.\nUn pile ou face désignera qui choisit en premier.\n\n> Ordre snake : **A · B · B · A · A · B...**',
        ),
      );
  }

  static buildSetupActionRows(setupId: string): ActionRowBuilder<any>[] {
    return [
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`draft:cap1:${setupId}`)
          .setPlaceholder('Capitaine A...')
          .setMinValues(1)
          .setMaxValues(1),
      ),
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`draft:cap2:${setupId}`)
          .setPlaceholder('Capitaine B...')
          .setMinValues(1)
          .setMaxValues(1),
      ),
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`draft:players:${setupId}`)
          .setPlaceholder('Joueurs à drafter (min. 2)...')
          .setMinValues(2)
          .setMaxValues(20),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`draft:launch:${setupId}`)
          .setLabel('Lancer le draft')
          .setEmoji('🚀')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`draft:cancel_setup:${setupId}`)
          .setLabel('Annuler')
          .setStyle(ButtonStyle.Danger),
      ),
    ];
  }

  static buildCoinflipContainer(session: DraftSession): ContainerBuilder {
    const winner = session.coinflipWinner === 1 ? session.captain1 : session.captain2;
    const other = session.coinflipWinner === 1 ? session.captain2 : session.captain1;

    return new ContainerBuilder()
      .setAccentColor(0xf1c40f)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🪙 Pile ou Face'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🎉 **${winner.name}** remporte le pile ou face !\n\n<@${winner.id}>, tu veux commencer à picker ou laisser commencer <@${other.id}> ?`,
        ),
      );
  }

  static buildChooseFirstButtons(sessionId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`draft:first:${sessionId}:yes`)
        .setLabel('Je commence')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`draft:first:${sessionId}:no`)
        .setLabel('Je laisse commencer')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  static buildPickingContainer(session: DraftSession): ContainerBuilder {
    const current = DraftService.getCurrentPicker(session);
    const totalPickable =
      session.team1.length + session.team2.length - 2 + session.remainingPlayers.length;
    const pickNum = session.pickIndex + 1;

    const formatTeam = (players: DraftPlayer[]) =>
      players.map((p, i) => `${i === 0 ? '👑' : '·'} <@${p.id}>`).join('\n');

    return new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 🎯 Draft — Pick ${pickNum}/${totalPickable}`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Équipe ${session.captain1.name}**\n${formatTeam(session.team1)}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Équipe ${session.captain2.name}**\n${formatTeam(session.team2)}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`⏳ Au tour de **${current.name}** de choisir...`),
      );
  }

  static buildPickSelect(session: DraftSession): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`draft:pick:${session.id}`)
        .setPlaceholder('Choisissez un joueur...')
        .addOptions(session.remainingPlayers.map((p) => ({ label: p.name, value: p.id }))),
    );
  }

  static buildDoneContainer(session: DraftSession): ContainerBuilder {
    const formatTeam = (players: DraftPlayer[]) =>
      players.map((p, i) => `${i === 0 ? '👑' : '·'} <@${p.id}>`).join('\n');

    return new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Draft terminé !'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**⚔️ Équipe ${session.captain1.name}**\n${formatTeam(session.team1)}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**🛡️ Équipe ${session.captain2.name}**\n${formatTeam(session.team2)}`,
        ),
      );
  }
}
