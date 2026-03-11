import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import UserMountainsModel from '../../models/user-mountains.model';
import { MountainService } from '../../services/mountain.service';
import { RARITY_CONFIG } from '../../constants/mountain.constants';
import type { MountainRarity } from '../../types/mountain.types';

const RARITY_ORDER: MountainRarity[] = ['legendary', 'epic', 'rare', 'common'];

export async function executeLeaderboard(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  await interaction.deferReply({ ephemeral: false });

  const docs = await UserMountainsModel.find({}).lean();
  const totalMountains = MountainService.count;

  const ranked = docs
    .map(doc => ({
      userId: doc.userId,
      total: doc.unlockedMountains.length,
      byRarity: RARITY_ORDER.reduce((acc, r) => {
        acc[r] = doc.unlockedMountains.filter(m => (m.rarity ?? 'common') === r).length;
        return acc;
      }, {} as Record<MountainRarity, number>),
    }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);

  const top10 = ranked.slice(0, 10);
  const lines: string[] = [];

  for (let i = 0; i < top10.length; i++) {
    const entry = top10[i];
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
    const isMe = entry.userId === interaction.user.id;

    let username = `<@${entry.userId}>`;
    try {
      const user = await client.users.fetch(entry.userId);
      username = isMe ? `**__${user.username}__**` : `**${user.username}**`;
    } catch {}

    const rarityStr = RARITY_ORDER
      .filter(r => entry.byRarity[r] > 0)
      .map(r => `${RARITY_CONFIG[r].emoji}×${entry.byRarity[r]}`)
      .join(' ');

    lines.push(`${medal} ${username} — ${entry.total}/${totalMountains}  ${rarityStr}`);
  }

  const container = new ContainerBuilder()
    .setAccentColor(0xf1c40f)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 🏆 Classement des collectionneurs'),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        lines.length > 0 ? lines.join('\n') : '*Aucun collectionneur pour l\'instant.*',
      ),
    );

  const userRankIndex = ranked.findIndex(d => d.userId === interaction.user.id);
  if (userRankIndex >= 10) {
    const userEntry = ranked[userRankIndex];
    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# *Ta position : **#${userRankIndex + 1}** avec **${userEntry.total}** montagnes*`,
        ),
      );
  } else if (userRankIndex === -1) {
    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# *Tu n'as pas encore de montagnes. Passe du temps en vocal !*`,
        ),
      );
  }

  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
