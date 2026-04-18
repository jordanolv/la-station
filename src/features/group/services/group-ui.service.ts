import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
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
import { Game, GameTypeOption, GAMES, getGame } from '../data/games';

export const GROUP_PREFIX = 'group';
export const GROUP_DESC_MODAL_PREFIX = 'group:modal_desc';
export const GROUP_TIME_MODAL_PREFIX = 'group:modal_time';

function cid(...parts: string[]): string {
  return parts.join(':');
}

function getTypeOption(game: Game, value: string): GameTypeOption | undefined {
  return game.typeOptions.find((type) => type.value === value);
}

function getTypeLabels(game: Game | undefined, values: string[]): string[] {
  return values.map((value) => game?.typeOptions.find((type) => type.value === value)?.label ?? value);
}

function getModeLabels(game: Game | undefined, values: string[]): string[] {
  return values.map((value) => game?.modes?.find((mode) => mode.id === value)?.label ?? value);
}

function getSelectedTypes(group: IGroup): string[] {
  return Array.isArray(group.types) && group.types.length > 0
    ? group.types
    : group.type
      ? [group.type]
      : [];
}

function getSelectedModes(group: IGroup): string[] {
  return Array.isArray(group.modes) && group.modes.length > 0
    ? group.modes
    : group.mode
      ? [group.mode]
      : [];
}

function needsMode(game: Game, selectedTypes: string[]): boolean {
  return selectedTypes.some((type) => getTypeOption(game, type)?.requiresMode);
}

function needsRank(game: Game, selectedTypes: string[]): boolean {
  return selectedTypes.some((type) => getTypeOption(game, type)?.requiresRank) && game.rankOptions !== null;
}

function getTotalSlots(game: Game, selectedTypes: string[], selectedModes: string[]): number {
  const typeSlots = selectedTypes
    .map((type) => getTypeOption(game, type)?.slots ?? 0);
  const modeSlots = selectedModes
    .map((modeId) => game.modes?.find((mode) => mode.id === modeId)?.slots ?? 0);

  return Math.max(0, ...typeSlots, ...modeSlots, selectedTypes.length > 0 ? 4 : 0);
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

function buildSettingsContainer(
  game: Game,
  selectedTypes: string[] = [],
  selectedModes: string[] = [],
  selectedRank?: string,
  description?: string,
  sessionTime?: string,
): ContainerBuilder {
  const shouldPickMode = game.modes !== null && needsMode(game, selectedTypes);
  const shouldPickRank = needsRank(game, selectedTypes);
  const previewSlots = getTotalSlots(game, selectedTypes, selectedModes);

  const summaryParts: string[] = [];
  if (selectedTypes.length > 0) {
    summaryParts.push(`Types : **${getTypeLabels(game, selectedTypes).join(' / ')}**`);
  }
  if (selectedModes.length > 0) {
    summaryParts.push(`Modes : **${getModeLabels(game, selectedModes).join(' / ')}**`);
  }
  if (shouldPickRank && selectedRank) summaryParts.push(`Rank min : **${selectedRank}**`);
  if (previewSlots > 0) summaryParts.push(`Slots : **${previewSlots}**`);
  if (sessionTime) summaryParts.push(`🕐 **${sessionTime}**`);
  if (description) summaryParts.push(`📝 *${description}*`);

  const headerText = summaryParts.length > 0
    ? `Paramètres :\n-# ${summaryParts.join('  ·  ')}`
    : 'Paramètres :';

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerText),
  );

  const typeOptions = game.typeOptions.map((type) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(type.label)
      .setValue(type.value)
      .setDescription(
        type.slots
          ? `${type.slots} joueurs`
          : type.requiresMode
            ? 'Choix du mode requis'
            : 'Sans mode spécifique',
      )
      .setDefault(selectedTypes.includes(type.value)),
  );

  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(cid(GROUP_PREFIX, 'type', game.id))
        .setPlaceholder('Choisis un ou plusieurs types...')
        .setMinValues(0)
        .setMaxValues(typeOptions.length)
        .addOptions(typeOptions),
    ),
  );

  if (shouldPickMode && game.modes) {
    const modeOptions = game.modes.map((m) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(m.label)
        .setValue(m.id)
        .setDescription(`${m.slots} joueurs`)
        .setDefault(selectedModes.includes(m.id)),
    );
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'mode', game.id))
          .setPlaceholder('Choisis un ou plusieurs modes...')
          .setMinValues(0)
          .setMaxValues(modeOptions.length)
          .addOptions(modeOptions),
      ),
    );
  }

  if (shouldPickRank && game.rankOptions) {
    const rankOptions = game.rankOptions.map((r) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(r.label)
        .setValue(r.value)
        .setDefault(r.value === selectedRank),
    );
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(cid(GROUP_PREFIX, 'rank', game.id))
          .setPlaceholder('Rank minimum...')
          .addOptions(rankOptions),
      ),
    );
  }

  const canCreate = selectedTypes.length > 0
    && (!shouldPickMode || selectedModes.length > 0)
    && (!shouldPickRank || Boolean(selectedRank));
  const descLabel = description ? '📝 Modifier la description' : '📝 Ajouter une description';
  const timeLabel = sessionTime ? '🕐 Modifier l\'heure' : '🕐 Définir l\'heure';

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(cid(GROUP_DESC_MODAL_PREFIX, game.id))
        .setLabel(descLabel)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(cid(GROUP_TIME_MODAL_PREFIX, game.id))
        .setLabel(timeLabel)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(cid(GROUP_PREFIX, 'create', game.id))
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

  buildConfigurator(
    gameId: string,
    selectedTypes: string[] = [],
    selectedModes: string[] = [],
    selectedRank?: string,
    description?: string,
    sessionTime?: string,
  ): { components: ContainerBuilder[]; flags: number } {
    const game = getGame(gameId)!;
    return {
      components: [
        buildGameHeader(game),
        buildSettingsContainer(game, selectedTypes, selectedModes, selectedRank, description, sessionTime),
      ],
      flags: MessageFlags.IsComponentsV2,
    };
  }

  buildGroupPost(group: IGroup, game: Game | undefined, roleId?: string): ContainerBuilder[] {
    const filled = group.joinedUserIds.length;
    const total = group.totalSlots;
    const spotsBar = '🟦'.repeat(filled) + '⬜'.repeat(Math.max(0, total - filled));
    const types = getSelectedTypes(group);
    const modes = getSelectedModes(group);

    const labels: string[] = [];
    if (types.length > 0) labels.push(getTypeLabels(game, types).join(' / '));
    if (modes.length > 0) labels.push(getModeLabels(game, modes).join(' / '));
    if (group.rankMin) labels.push(`${group.rankMin}+`);
    const subtitle = labels.join('  ·  ');
    const subtitleWithRole = [subtitle, roleId ? `<@&${roleId}>` : undefined].filter(Boolean).join('  ·  ');

    const lines: string[] = [
      `## ${game?.emoji ?? '🎮'} ${game?.name ?? group.gameId}`,
    ];

    if (subtitleWithRole) lines.push(`-# ${subtitleWithRole}`);

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
    const types = getSelectedTypes(group);
    const modes = getSelectedModes(group);
    const labels: string[] = [];
    if (types.length > 0) labels.push(getTypeLabels(game, types).join(' / '));
    if (modes.length > 0) labels.push(getModeLabels(game, modes).join(' / '));
    if (group.rankMin) labels.push(`${group.rankMin}+`);
    const subtitle = labels.join('  ·  ');

    const lines = [
      `## ~~${game?.emoji ?? '🎮'} ${game?.name ?? group.gameId}~~`,
    ];

    if (subtitle) lines.push(`-# ${subtitle}`);
    lines.push('', '*Groupe fermé.*');

    return [
      new ContainerBuilder()
        .setAccentColor(0x4f545c)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n'))),
    ];
  }
}

export default new GroupUIService();
