import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  MessageFlags,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  TextChannel,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { CdmService, CdmWinner } from '../services/cdm.service';
import { buildMain, buildPickView, buildAdminMain, buildAdminPickView, buildAdminResetConfirm } from '../utils/cdm-renderer';
import { CDM_TITLE, Confederation, teamLabel } from '../constants/cdm.constants';
import { ICdmEvent } from '../models/cdm-event.model';

type PickKind = 'winner' | 'outsider';

const CV2 = MessageFlags.IsComponentsV2;

function kindToField(kind: PickKind): 'team' | 'outsider' {
  return kind === 'winner' ? 'team' : 'outsider';
}

function isAdmin(interaction: ButtonInteraction | StringSelectMenuInteraction | ChannelSelectMenuInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

async function denyAdmin(interaction: ButtonInteraction | StringSelectMenuInteraction | ChannelSelectMenuInteraction): Promise<void> {
  await interaction.reply({ content: '⛔ Réservé aux admins.', flags: MessageFlags.Ephemeral });
}

// ─── Boutons ────────────────────────────────────────────────────────────────────

export async function handleCdmButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];

  // ─── Utilisateur ───
  if (action === 'back') {
    const event = await CdmService.getEvent();
    await interaction.update({ components: buildMain(event, interaction.user.id), flags: CV2 });
    return;
  }

  if (action === 'open') {
    const event = await CdmService.getEvent();
    if (event.status !== 'open') {
      await interaction.update({ components: buildMain(event, interaction.user.id), flags: CV2 });
      return;
    }
    const kind = parts[2] as PickKind;
    await interaction.update({ components: buildPickView(event, interaction.user.id, kind), flags: CV2 });
    return;
  }

  // ─── Admin (/cdm-admin) ───
  if (!action.startsWith('a_')) return;
  if (!isAdmin(interaction)) return denyAdmin(interaction);

  if (action === 'a_back') {
    const event = await CdmService.getEvent();
    await interaction.update({ components: buildAdminMain(event), flags: CV2 });
    return;
  }

  if (action === 'a_lock' || action === 'a_unlock') {
    const event = await CdmService.getEvent();
    if (event.status === 'closed') {
      await interaction.update({ components: buildAdminMain(event), flags: CV2 });
      return;
    }
    const updated = await CdmService.setLocked(action === 'a_lock');
    await interaction.update({ components: buildAdminMain(updated), flags: CV2 });
    return;
  }

  if (action === 'a_res') {
    const kind = parts[2] as PickKind;
    const event = await CdmService.getEvent();
    await interaction.update({ components: buildAdminPickView(event, kind), flags: CV2 });
    return;
  }

  if (action === 'a_reset') {
    await interaction.update({ components: buildAdminResetConfirm(), flags: CV2 });
    return;
  }

  if (action === 'a_reset_confirm') {
    const event = await CdmService.reset();
    await interaction.update({ components: buildAdminMain(event), flags: CV2 });
    return;
  }

  if (action === 'a_pay') {
    const result = await CdmService.payWinners();
    if (!result.success || !result.event) {
      await interaction.reply({ content: `❌ ${result.message}`, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.update({ components: buildAdminMain(result.event), flags: CV2 });
    await announceResults(client, result.event, result.winners ?? []);
  }
}

// ─── Menus déroulants (string) ─────────────────────────────────────────────────

export async function handleCdmSelect(interaction: StringSelectMenuInteraction, _client: BotClient): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const value = interaction.values[0];

  // ─── Utilisateur ───
  if (action === 'conf') {
    const event = await CdmService.getEvent();
    if (event.status !== 'open') {
      await interaction.update({ components: buildMain(event, interaction.user.id), flags: CV2 });
      return;
    }
    const kind = parts[2] as PickKind;
    await interaction.update({ components: buildPickView(event, interaction.user.id, kind, value as Confederation), flags: CV2 });
    return;
  }

  if (action === 'pick') {
    const kind = parts[2] as PickKind;
    const event = await CdmService.getEvent();
    if (event.status !== 'open') {
      await interaction.update({ components: buildMain(event, interaction.user.id), flags: CV2 });
      return;
    }
    await CdmService.setPrediction(interaction.user.id, kindToField(kind), value);
    const updated = await CdmService.getEvent();
    await interaction.update({ components: buildMain(updated, interaction.user.id), flags: CV2 });
    return;
  }

  // ─── Admin ───
  if (!action.startsWith('a_')) return;
  if (!isAdmin(interaction)) return denyAdmin(interaction);

  if (action === 'a_conf') {
    const event = await CdmService.getEvent();
    const kind = parts[2] as PickKind;
    await interaction.update({ components: buildAdminPickView(event, kind, value as Confederation), flags: CV2 });
    return;
  }

  if (action === 'a_pick') {
    const kind = parts[2] as PickKind;
    const conf = parts[3] as Confederation;
    const event = await CdmService.setResult(kindToField(kind), value);
    await interaction.update({ components: buildAdminPickView(event, kind, conf), flags: CV2 });
  }
}

// ─── Menu de sélection de channel (admin) ──────────────────────────────────────

export async function handleCdmChannelSelect(interaction: ChannelSelectMenuInteraction, _client: BotClient): Promise<void> {
  if (!isAdmin(interaction)) return denyAdmin(interaction);
  const value = interaction.values[0];
  const event = await CdmService.setAnnounceChannel(value);
  await interaction.update({ components: buildAdminMain(event), flags: CV2 });
}

// ─── Annonce publique des résultats ─────────────────────────────────────────────

async function announceResults(client: BotClient, event: ICdmEvent, winners: CdmWinner[]): Promise<void> {
  if (!event.announceChannelId) return;
  const channel = client.channels.cache.get(event.announceChannelId) as TextChannel | undefined;
  if (!channel?.isTextBased()) return;

  const lines = [
    `# 🏆 Résultats des pronostics — ${CDM_TITLE}`,
    `🥇 Vainqueur : **${teamLabel(event.resultTeam)}**`,
    `🐎 Outsider allé le plus loin : **${teamLabel(event.resultOutsider)}**`,
  ];

  const container = new ContainerBuilder()
    .setAccentColor(0xf1c40f)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  if (winners.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('😢 Aucun gagnant cette fois-ci.'));
  } else {
    const winnerLines = winners
      .sort((a, b) => b.money - a.money)
      .map(w => {
        const tags = [w.team ? '🥇' : '', w.outsider ? '🐎' : ''].filter(Boolean).join('');
        return `${tags} <@${w.userId}> — **${w.money.toLocaleString('fr-FR')}** coins · **${w.expeditions}** packs`;
      });
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([`**${winners.length} gagnant${winners.length !== 1 ? 's' : ''} !**`, ...winnerLines].join('\n')),
    );
  }

  await channel.send({ components: [container], flags: CV2 }).catch(() => {});
}
