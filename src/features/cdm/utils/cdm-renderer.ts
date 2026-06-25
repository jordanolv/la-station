import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import { ICdmEvent } from '../models/cdm-event.model';
import {
  CDM_TITLE,
  CDM_REWARD,
  CONFEDERATIONS,
  Confederation,
  teamsByConf,
  teamLabel,
} from '../constants/cdm.constants';

const COLOR_OPEN = 0x2ecc71;
const COLOR_LOCKED = 0xe67e22;
const COLOR_CLOSED = 0xf1c40f;

export const STATUS_LINE: Record<string, string> = {
  open: '🟢 **Pronostics ouverts** — modifiable à tout moment',
  locked: '🔒 **Pronostics verrouillés** — plus aucune modification possible',
  closed: '🏁 **Pronostics clôturés**',
};

export const STATUS_COLOR: Record<string, number> = {
  open: COLOR_OPEN,
  locked: COLOR_LOCKED,
  closed: COLOR_CLOSED,
};

type PickKind = 'winner' | 'outsider';

function rewardLine(): string {
  return (
    `🥇 Bon vainqueur : **${CDM_REWARD.team.money.toLocaleString('fr-FR')}** coins · **${CDM_REWARD.team.expeditions}** packs\n` +
    `🐎 Bon outsider : **${CDM_REWARD.outsider.money.toLocaleString('fr-FR')}** coins · **${CDM_REWARD.outsider.expeditions}** packs`
  );
}

export function confSelect(customId: string, active?: Confederation): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('🌍 Choisir un continent...')
    .addOptions(
      CONFEDERATIONS.map(c =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${c.emoji} ${c.label}`)
          .setValue(c.id)
          .setDefault(c.id === active),
      ),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function teamSelect(
  customId: string,
  conf: Confederation,
  excludeBig: boolean,
  current?: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const teams = teamsByConf(conf, { excludeBig });
  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('⚽ Choisir l\'équipe...')
    .addOptions(
      teams.map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${t.flag} ${t.name}`)
          .setValue(t.name)
          .setDefault(t.name === current),
      ),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function backButton(customId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('← Retour').setStyle(ButtonStyle.Secondary),
  );
}

// ─── Vue principale (identique pour tous) ──────────────────────────────────────

export function buildMain(event: ICdmEvent, userId: string): ContainerBuilder[] {
  const mine = event.predictions.find(p => p.userId === userId);
  const isClosed = event.status === 'closed';
  const canPick = event.status === 'open';

  const header = [`# 🏆 Pronostics — ${CDM_TITLE}`, STATUS_LINE[event.status] ?? STATUS_LINE.open];

  const myLines = [
    '**Tes pronostics**',
    `🥇 Vainqueur : ${teamLabel(mine?.team)}`,
    `🐎 Outsider qui ira le plus loin : ${teamLabel(mine?.outsider)}`,
  ];

  const container = new ContainerBuilder()
    .setAccentColor(STATUS_COLOR[event.status] ?? COLOR_OPEN)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(rewardLine()))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(myLines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# 👥 ${event.predictions.length} participant${event.predictions.length !== 1 ? 's' : ''}`),
    );

  if (isClosed) {
    const teamWon = !!mine?.team && mine.team === event.resultTeam;
    const outsiderWon = !!mine?.outsider && mine.outsider === event.resultOutsider;
    const resultLines = [
      '**🏁 Résultats officiels**',
      `🥇 Vainqueur : ${teamLabel(event.resultTeam)} ${teamWon ? '✅' : ''}`,
      `🐎 Outsider : ${teamLabel(event.resultOutsider)} ${outsiderWon ? '✅' : ''}`,
    ];
    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(resultLines.join('\n')));
    return [container];
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  if (canPick) {
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('cdm:open:winner').setLabel('🥇 Choisir mon vainqueur').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cdm:open:outsider').setLabel('🐎 Choisir mon outsider').setStyle(ButtonStyle.Primary),
      ),
    );
  }

  return [container];
}

// ─── Vue sélection (utilisateur) ───────────────────────────────────────────────

export function buildPickView(
  event: ICdmEvent,
  userId: string,
  kind: PickKind,
  conf?: Confederation,
): ContainerBuilder[] {
  const mine = event.predictions.find(p => p.userId === userId);
  const isWinner = kind === 'winner';
  const current = isWinner ? mine?.team : mine?.outsider;

  const title = isWinner
    ? '# 🥇 Ton vainqueur de la Coupe du Monde'
    : '# 🐎 Ton outsider qui ira le plus loin';
  const help = isWinner
    ? 'Choisis le continent, puis l\'équipe que tu vois championne.'
    : 'Choisis le continent, puis l\'outsider (hors favoris) que tu vois aller le plus loin.';

  const container = new ContainerBuilder()
    .setAccentColor(COLOR_OPEN)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent([title, help].join('\n')))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Sélection actuelle : ${teamLabel(current)}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(confSelect(`cdm:conf:${kind}`, conf));

  if (conf) {
    container.addActionRowComponents(teamSelect(`cdm:pick:${kind}:${conf}`, conf, !isWinner, current));
  }

  container.addActionRowComponents(backButton('cdm:back'));
  return [container];
}

// ─── Vues admin (commande /cdm-admin, éphémère) ────────────────────────────────

const COLOR_ADMIN = 0xe74c3c;

export function buildAdminMain(event: ICdmEvent): ContainerBuilder[] {
  const closed = event.status === 'closed';
  const ready = !!event.resultTeam && !!event.resultOutsider && !!event.announceChannelId && !closed;

  const lines = [
    '# ⚙️ Gestion des pronostics — CDM 2026',
    STATUS_LINE[event.status] ?? STATUS_LINE.open,
    `👥 **${event.predictions.length}** participant${event.predictions.length !== 1 ? 's' : ''}`,
    '',
    `🥇 Vainqueur retenu : ${teamLabel(event.resultTeam)}`,
    `🐎 Outsider retenu : ${teamLabel(event.resultOutsider)}`,
    `📢 Channel d'annonce : ${event.announceChannelId ? `<#${event.announceChannelId}>` : '*non défini*'}`,
  ];
  if (closed) lines.push('', '✅ *Pronostics clôturés et payés.*');

  const container = new ContainerBuilder()
    .setAccentColor(COLOR_ADMIN)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  if (!closed) {
    container.addActionRowComponents(
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('cdm:a_channel')
          .setPlaceholder('📢 Channel d\'annonce des résultats')
          .setChannelTypes(ChannelType.GuildText),
      ),
    );

    const lockButton = event.status === 'locked'
      ? new ButtonBuilder().setCustomId('cdm:a_unlock').setLabel('🔓 Déverrouiller').setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId('cdm:a_lock').setLabel('🔒 Verrouiller les pronos').setStyle(ButtonStyle.Primary);

    container
      .addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(lockButton))
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('cdm:a_res:winner').setLabel('🥇 Désigner le vainqueur').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('cdm:a_res:outsider').setLabel('🐎 Désigner l\'outsider').setStyle(ButtonStyle.Secondary),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('cdm:a_pay').setLabel('💰 Payer les gagnants').setStyle(ButtonStyle.Success).setDisabled(!ready),
        ),
      );
  }

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('cdm:a_reset').setLabel('🔄 Réinitialiser l\'event').setStyle(ButtonStyle.Danger),
    ),
  );

  return [container];
}

export function buildAdminResetConfirm(): ContainerBuilder[] {
  const container = new ContainerBuilder()
    .setAccentColor(COLOR_ADMIN)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# 🔄 Réinitialiser l\'event ?\n⚠️ Tous les pronostics et résultats seront **effacés** et l\'event rouvrira.\n*Les coins/packs déjà versés ne sont pas repris.*',
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('cdm:a_reset_confirm').setLabel('✅ Tout réinitialiser').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cdm:a_back').setLabel('← Annuler').setStyle(ButtonStyle.Secondary),
      ),
    );
  return [container];
}

export function buildAdminPickView(event: ICdmEvent, kind: PickKind, conf?: Confederation): ContainerBuilder[] {
  const isWinner = kind === 'winner';
  const current = isWinner ? event.resultTeam : event.resultOutsider;
  const title = isWinner ? '# 🥇 Désigner le vainqueur' : '# 🐎 Désigner l\'outsider allé le plus loin';

  const container = new ContainerBuilder()
    .setAccentColor(COLOR_ADMIN)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Sélection actuelle : ${teamLabel(current)}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(confSelect(`cdm:a_conf:${kind}`, conf));

  if (conf) {
    container.addActionRowComponents(teamSelect(`cdm:a_pick:${kind}:${conf}`, conf, !isWinner, current));
  }

  container.addActionRowComponents(backButton('cdm:a_back'));
  return [container];
}
