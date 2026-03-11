import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import { UserMountainsRepository } from '../../repositories/user-mountains.repository';
import { MountainService } from '../../services/mountain.service';
import { RARITY_CONFIG, FRAGMENTS_PER_TICKET } from '../../constants/mountain.constants';
import type { MountainRarity } from '../../types/mountain.types';

export const INV_BUTTON_PREFIX = 'mountain:inv';

const MOUNTAINS_PER_PAGE = 8;

function buildFragmentBar(fragments: number): string {
  const filled = Math.round((fragments / FRAGMENTS_PER_TICKET) * 10);
  return '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);
}

function buildInventoryContainer(
  userId: string,
  unlocked: Awaited<ReturnType<typeof UserMountainsRepository.getUnlocked>>,
  tickets: number,
  fragments: number,
  page: number,
): ContainerBuilder[] {
  const totalMountains = MountainService.count;
  const rarityOrder: MountainRarity[] = ['legendary', 'epic', 'rare', 'common'];

  const sorted = [...unlocked]
    .filter(e => MountainService.getById(e.mountainId))
    .sort((a, b) => {
      const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
      const ra = order[a.rarity ?? 'common'];
      const rb = order[b.rarity ?? 'common'];
      if (ra !== rb) return ra - rb;
      return (MountainService.getById(a.mountainId)?.name ?? '').localeCompare(
        MountainService.getById(b.mountainId)?.name ?? '',
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
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# ⛰️ Ma collection'),
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
          `🎟️ **${tickets}** ticket${tickets > 1 ? 's' : ''} de pack  ·  🧩 Fragments : ${fragBar} \`${fragments}/${FRAGMENTS_PER_TICKET}\``,
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
    .setAccentColor(0x27ae60)
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

    listContainer.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji} **${mountain.name}**\n-# 📏 ${mountain.altitude}  ·  🗓️ ${date}`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`${INV_BUTTON_PREFIX}:detail:${userId}:${mountain.id}`)
            .setLabel('🔍 Détails')
            .setStyle(ButtonStyle.Secondary),
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
    const containers = buildInventoryContainer(ownerId, unlocked, doc.packTickets, doc.fragments, page);

    await interaction.update({ components: containers });
    return;
  }
}

export async function executeInv(interaction: ChatInputCommandInteraction, _client: BotClient): Promise<void> {
  const userId = interaction.user.id;
  const [doc, unlocked] = await Promise.all([
    UserMountainsRepository.getOrCreate(userId),
    UserMountainsRepository.getUnlocked(userId),
  ]);

  const containers = buildInventoryContainer(userId, unlocked, doc.packTickets, doc.fragments, 0);

  await interaction.reply({
    components: containers,
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}
