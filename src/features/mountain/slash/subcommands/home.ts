import {
  ButtonInteraction,
  ChatInputCommandInteraction,
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
import { RARITY_CONFIG, FRAGMENTS_PER_TICKET } from '../../constants/mountain.constants';
import type { MountainRarity } from '../../types/mountain.types';
import { buildInventoryContainer } from './inv';
import { buildPackInfoContainer } from './pack';
import { buildLeaderboardContainer } from './leaderboard';

export const HOME_BUTTON_PREFIX = 'mountain:home';

const RARITY_ORDER: MountainRarity[] = ['legendary', 'epic', 'rare', 'common'];

function buildFragmentBar(fragments: number): string {
  const filled = Math.round((fragments / FRAGMENTS_PER_TICKET) * 10);
  return '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);
}

async function buildHomeContainer(user: User, lastMsgId = 'none'): Promise<ContainerBuilder> {
  const [doc, unlocked] = await Promise.all([
    UserMountainsRepository.getOrCreate(user.id),
    UserMountainsRepository.getUnlocked(user.id),
  ]);

  const totalMountains = MountainService.count;
  const countByRarity = RARITY_ORDER.reduce((acc, r) => {
    acc[r] = unlocked.filter(m => (m.rarity ?? 'common') === r).length;
    return acc;
  }, {} as Record<MountainRarity, number>);

  const rarityLine = RARITY_ORDER
    .map(r => `${RARITY_CONFIG[r].emoji} **${countByRarity[r]}**`)
    .join('  ·  ');

  const fragBar = buildFragmentBar(doc.fragments);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${HOME_BUTTON_PREFIX}:inv:${lastMsgId}`)
      .setLabel('Collection')
      .setEmoji('🎒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${HOME_BUTTON_PREFIX}:pack:${lastMsgId}`)
      .setLabel('Packs')
      .setEmoji('🎟️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${HOME_BUTTON_PREFIX}:leaderboard:${lastMsgId}`)
      .setLabel('Classement')
      .setEmoji('🏆')
      .setStyle(ButtonStyle.Secondary),
  );

  return new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ⛰️ Montagnes\n-# par **${user.displayName}**`),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 64 }))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**${unlocked.length}/${totalMountains}** montagnes débloquées`,
          rarityLine,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `🎟️ **${doc.packTickets}** ticket${doc.packTickets > 1 ? 's' : ''} de pack  ·  🧩 ${fragBar} \`${doc.fragments}/${FRAGMENTS_PER_TICKET}\``,
      ),
    )
    .addActionRowComponents(row);
}

export async function executeHome(
  interaction: ChatInputCommandInteraction,
  _client: BotClient,
): Promise<void> {
  const container = await buildHomeContainer(interaction.user);
  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export async function handleHomeButton(
  interaction: ButtonInteraction,
  client: BotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[2];
  const lastMsgId = parts[3] ?? 'none';

  await interaction.deferUpdate();

  // Delete previous sub-view message if any
  if (lastMsgId !== 'none') {
    try {
      const prev = await interaction.channel?.messages.fetch(lastMsgId);
      if (prev) await prev.delete();
    } catch { /* already deleted or not found */ }
  }

  const { user } = interaction;
  let components: ContainerBuilder[];

  if (action === 'inv') {
    const [doc, unlocked] = await Promise.all([
      UserMountainsRepository.getOrCreate(user.id),
      UserMountainsRepository.getUnlocked(user.id),
    ]);
    components = buildInventoryContainer(user, unlocked, doc.packTickets, doc.fragments, 0);
  } else if (action === 'pack') {
    const doc = await UserMountainsRepository.getOrCreate(user.id);
    components = [buildPackInfoContainer(user, doc.packTickets, doc.fragments)];
  } else if (action === 'leaderboard') {
    components = [await buildLeaderboardContainer(user, client)];
  } else {
    return;
  }

  const sentMsg = await interaction.followUp({
    components,
    flags: MessageFlags.IsComponentsV2,
    fetchReply: true,
  });

  const updatedHome = await buildHomeContainer(user, sentMsg.id);
  await interaction.editReply({
    components: [updatedHome],
    flags: MessageFlags.IsComponentsV2,
  });
}
