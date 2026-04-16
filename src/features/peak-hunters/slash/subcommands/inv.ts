import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  User,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import { UserMountainsRepository } from '../../repositories/user-mountains.repository';
import { MountainService } from '../../services/mountain.service';
import { RARITY_CONFIG, FRAGMENTS_PER_EXPEDITION } from '../../constants/peak-hunters.constants';
import { formatExpeditionsLine } from '../../services/expedition.service';
import type { MountainRarity } from '../../types/peak-hunters.types';

export const INV_BUTTON_PREFIX = 'mountain:inv';

const MOUNTAINS_PER_PAGE = 8;

function buildFragmentBar(fragments: number): string {
  const filled = Math.round((fragments / FRAGMENTS_PER_EXPEDITION) * 10);
  return '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);
}

export function buildInventoryContainer(
  user: User,
  unlocked: Awaited<ReturnType<typeof UserMountainsRepository.getUnlocked>>,
  sentierTickets: number,
  fragments: number,
  page: number,
  falaiseTickets = 0,
  sommetTickets = 0,
): ContainerBuilder[] {
  const totalMountains = MountainService.count;
  const rarityOrder: MountainRarity[] = ['legendary', 'epic', 'rare', 'common'];

  const userId = user.id;

  const sorted = [...unlocked]
    .filter(e => MountainService.getById(e.mountainId))
    .sort((a, b) => {
      const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
      const ra = order[a.rarity ?? 'common'];
      const rb = order[b.rarity ?? 'common'];
      if (ra !== rb) return ra - rb;
      return (MountainService.getById(a.mountainId)?.mountainLabel ?? '').localeCompare(
        MountainService.getById(b.mountainId)?.mountainLabel ?? '',
      );
    });

  const totalPages = Math.max(1, Math.ceil(sorted.length / MOUNTAINS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = sorted.slice(safePage * MOUNTAINS_PER_PAGE, (safePage + 1) * MOUNTAINS_PER_PAGE);

  const countByRarity = rarityOrder.reduce((acc, r) => {
    acc[r] = sorted.filter(m => (m.rarity ?? 'common') === r).length;
    return acc;
  }, {} as Record<MountainRarity, number>);

  const fragBar = buildFragmentBar(fragments);

  const summaryContainer = new ContainerBuilder()
    .setAccentColor(0x1e8d73)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ⛰️ Ma collection\n-# par **${user.displayName}**`),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 64 }))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**${sorted.length}/${totalMountains}** montagnes débloquées`,
          '',
          rarityOrder.map(r => {
            const { emoji, label } = RARITY_CONFIG[r];
            const totalForRarity = MountainService.getAll().filter(m => MountainService.getRarity(m) === r).length;
            return `${emoji} ${label} : **${countByRarity[r]}/${totalForRarity}**`;
          }).join('  ·  '),
          '',
          `${formatExpeditionsLine(sentierTickets, falaiseTickets, sommetTickets)}  ·  🧩 ${fragBar} \`${fragments}/${FRAGMENTS_PER_EXPEDITION}\``,
        ].join('\n'),
      ),
    );

  if (sorted.length === 0) {
    summaryContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
    summaryContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# *Aucune montagne débloquée pour l\'instant. Passe du temps en vocal !*'),
    );
    return [summaryContainer];
  }

  const listContainer = new ContainerBuilder()
    .setAccentColor(0x1e8d73)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Montagnes (page ${safePage + 1}/${totalPages})`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  for (const entry of slice) {
    const mountain = MountainService.getById(entry.mountainId);
    if (!mountain) continue;
    const rarity = entry.rarity ?? MountainService.getRarity(mountain);
    const { emoji } = RARITY_CONFIG[rarity];
    const date = entry.unlockedAt.toLocaleDateString('fr-FR');

    listContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${emoji} **${mountain.mountainLabel}**\n-# 📏 ${MountainService.getAltitude(mountain)}  ·  ${MountainService.getCountryDisplay(mountain)}  ·  🗓️ ${date}`,
      ),
    );
  }

  if (totalPages > 1) {
    listContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${INV_BUTTON_PREFIX}:page:${userId}:${safePage - 1}`)
        .setLabel('◀ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage === 0),
      new ButtonBuilder()
        .setCustomId(`${INV_BUTTON_PREFIX}:page:${userId}:${safePage + 1}`)
        .setLabel('Suivant ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage >= totalPages - 1),
    );
    listContainer.addActionRowComponents(row);
  }

  return [summaryContainer, listContainer];
}

export async function handleInventaireButton(
  interaction: ButtonInteraction,
  _client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[2];

  if (action === 'page') {
    const ownerId = parts[3];
    const page = parseInt(parts[4], 10);

    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: '❌ Ce n\'est pas ton inventaire.', flags: MessageFlags.Ephemeral });
      return;
    }

    const doc = await UserMountainsRepository.getOrCreate(ownerId);
    const unlocked = await UserMountainsRepository.getUnlocked(ownerId);
    const containers = buildInventoryContainer(interaction.user, unlocked, doc.sentierTickets, doc.fragments, page, doc.falaiseTickets, doc.sommetTickets);

    await interaction.update({ components: containers });
    return;
  }
}

export async function executeInv(interaction: ChatInputCommandInteraction | ButtonInteraction, _client: BotClient): Promise<void> {
  const { user } = interaction;
  const [doc, unlocked] = await Promise.all([
    UserMountainsRepository.getOrCreate(user.id),
    UserMountainsRepository.getUnlocked(user.id),
  ]);

  const containers = buildInventoryContainer(user, unlocked, doc.sentierTickets, doc.fragments, 0, doc.falaiseTickets, doc.sommetTickets);

  await interaction.reply({
    components: containers,
    flags: MessageFlags.IsComponentsV2,
  });
}
