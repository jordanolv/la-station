import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from 'discord.js';
import { IGroup } from '../models/group.model';
import { Game, GAMES, getGame, NONE } from '../data/games';

export const GROUP_PREFIX = 'group';
export const GROUP_DESC_MODAL_PREFIX = 'group:modal_desc';
export const GROUP_TIME_MODAL_PREFIX = 'group:modal_time';

function cid(...parts: string[]): string {
  return parts.join(':');
}

function buildGameSelect(): ContainerBuilder {
  const options = GAMES.map((g) =>
    new StringSelectMenuOptionBuilder().setLabel(g.name).setValue(g.id).setEmoji(g.emoji),
  );

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🎮 Créer un groupe\nChoisis ton jeu :'))
    .addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'game'))
          .setPlaceholder('Sélectionne un jeu...')
          .addOptions(options),
      ),
    );
}

function buildGameHeader(game: Game): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(game.color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${game.emoji} **${game.name}**`));
}

function buildTypeSelect(game: Game): ContainerBuilder {
  const options = game.typeOptions.map((t) =>
    new StringSelectMenuOptionBuilder().setLabel(t.label).setValue(t.value),
  );

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Type de partie :'))
    .addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'type', game.id))
          .setPlaceholder('Casual, Ranked...')
          .addOptions(options),
      ),
    );
}

function buildTypeHeader(game: Game, type: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(game.color)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${game.emoji} **${game.name}**  ·  ${type}`),
    );
}

function buildSettingsContainer(
  game: Game,
  type: string,
  selectedModeId: string = NONE,
  selectedRank: string = NONE,
  description?: string,
  sessionTime?: string,
): ContainerBuilder {
  const needsMode = game.modes !== null && type !== 'Privé' && type !== 'Aram';
  const needsRank = type === 'Ranked' && game.rankOptions !== null;

  const summaryParts: string[] = [];
  if (needsMode && selectedModeId !== NONE) {
    const modeLabel = game.modes?.find((m) => m.id === selectedModeId)?.label ?? selectedModeId;
    summaryParts.push(`Mode : **${modeLabel}**`);
  }
  if (needsRank && selectedRank !== NONE) summaryParts.push(`Rank min : **${selectedRank}**`);
  if (sessionTime) summaryParts.push(`🕐 **${sessionTime}**`);
  if (description) summaryParts.push(`📝 *${description}*`);

  const headerText = summaryParts.length > 0
    ? `Paramètres :\n-# ${summaryParts.join('  ·  ')}`
    : 'Paramètres :';

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerText),
  );

  if (needsMode && game.modes) {
    const modeOptions = game.modes.map((m) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(m.label)
        .setValue(m.id)
        .setDescription(`${m.slots} joueurs`)
        .setDefault(m.id === selectedModeId),
    );
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'mode', game.id, type))
          .setPlaceholder('Mode de jeu...')
          .addOptions(modeOptions),
      ),
    );
  }

  if (needsRank && game.rankOptions) {
    const rankOptions = game.rankOptions.map((r) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(r.label)
        .setValue(r.value)
        .setDefault(r.value === selectedRank),
    );
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'rank', game.id, type, selectedModeId))
          .setPlaceholder('Rank minimum...')
          .addOptions(rankOptions),
      ),
    );
  }

  const canCreate = (!needsMode || selectedModeId !== NONE) && (!needsRank || selectedRank !== NONE);
  const descLabel = description ? '📝 Modifier la description' : '📝 Ajouter une description';
  const timeLabel = sessionTime ? '🕐 Modifier l\'heure' : '🕐 Définir l\'heure';

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(cid(GROUP_DESC_MODAL_PREFIX, game.id, type, selectedModeId, selectedRank))
        .setLabel(descLabel)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(cid(GROUP_TIME_MODAL_PREFIX, game.id, type, selectedModeId, selectedRank))
        .setLabel(timeLabel)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(cid(GROUP_PREFIX, 'create', game.id, type, selectedModeId, selectedRank))
        .setLabel('Créer le groupe')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canCreate),
    ),
  );

  return container;
}

export class GroupUIService {
  buildStep1(): { components: ContainerBuilder[]; flags: number } {
    return {
      components: [buildGameSelect()],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  buildStep2(gameId: string): { components: ContainerBuilder[]; flags: number } {
    const game = getGame(gameId)!;
    return {
      components: [buildGameHeader(game), buildTypeSelect(game)],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  buildStep3(
    gameId: string,
    type: string,
    selectedModeId: string = NONE,
    selectedRank: string = NONE,
    description?: string,
    sessionTime?: string,
  ): { components: ContainerBuilder[]; flags: number } {
    const game = getGame(gameId)!;
    return {
      components: [
        buildGameHeader(game),
        buildTypeHeader(game, type),
        buildSettingsContainer(game, type, selectedModeId, selectedRank, description, sessionTime),
      ],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  buildGroupPost(group: IGroup, game: Game | undefined, roleId?: string): ContainerBuilder[] {
    const filled = group.joinedUserIds.length;
    const total = group.totalSlots;
    const spotsBar = '🟦'.repeat(filled) + '⬜'.repeat(Math.max(0, total - filled));

    const labels: string[] = [];
    if (group.mode) {
      const modeLabel = game?.modes?.find((m) => m.id === group.mode)?.label ?? group.mode;
      labels.push(modeLabel);
    }
    if (group.rankMin) labels.push(`${group.rankMin}+`);
    const subtitle = [group.type, ...labels].filter(Boolean).join('  ·  ');

    const subtitleWithRole = roleId ? `${subtitle}  ·  <@&${roleId}>` : subtitle;

    const lines: string[] = [
      `## ${game?.emoji ?? '🎮'} ${game?.name ?? group.gameId}`,
      `-# ${subtitleWithRole}`,
    ];

    if (group.description) lines.push('', group.description);
    if (group.sessionTime) lines.push(`\n🕐 ${group.sessionTime}`);

    lines.push('', `${spotsBar}  **${filled}/${total}**`);

    if (group.joinedUserIds.length > 0) {
      lines.push(group.joinedUserIds.map((id) => `<@${id}>`).join('  '));
    }

    const container = new ContainerBuilder()
      .setAccentColor(game?.color ?? 0x5865f2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    if (game?.banner) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(game.banner)),
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const groupId = (group as any)._id.toString();
    const isOpen = group.status === 'open';

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'join', groupId))
          .setLabel('Rejoindre')
          .setStyle(ButtonStyle.Success)
          .setDisabled(!isOpen || filled >= total),
        new ButtonBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'leave', groupId))
          .setLabel('Quitter')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'close', groupId))
          .setLabel('Fermer')
          .setStyle(ButtonStyle.Danger),
      ),
    );

    return [container];
  }

  buildClosedPost(group: IGroup, game: Game | undefined): ContainerBuilder[] {
    const labels: string[] = [];
    if (group.mode) {
      const modeLabel = game?.modes?.find((m) => m.id === group.mode)?.label ?? group.mode;
      labels.push(modeLabel);
    }
    if (group.rankMin) labels.push(`${group.rankMin}+`);
    const subtitle = [group.type, ...labels].filter(Boolean).join('  ·  ');

    const lines = [
      `## ~~${game?.emoji ?? '🎮'} ${game?.name ?? group.gameId}~~`,
      `-# ${subtitle}`,
      '',
      '*Groupe fermé.*',
    ];

    return [
      new ContainerBuilder()
        .setAccentColor(0x4f545c)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n'))),
    ];
  }
}

export default new GroupUIService();
