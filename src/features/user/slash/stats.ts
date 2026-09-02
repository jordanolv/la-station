import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from 'discord.js';
import { isSilentDiscordError } from '../../../shared/utils/discord-errors';
import { BotClient } from '../../../bot/client';
import { UserService } from '../services/user.service';
import UserMountainsModel from '../../peak-hunters/models/user-mountains.model';
import { EXPEDITION_TIER_CONFIG, RARITY_CONFIG } from '../../peak-hunters/constants/peak-hunters.constants';
import type { MountainRarity } from '../../peak-hunters/types/peak-hunters.types';

const ARCADE_LABELS: Record<string, string> = {
  shifumi: '✊ Shifumi',
  puissance4: '🔴 Puissance 4',
  morpion: '⭕ Morpion',
  battle: '⚔️ Battle',
};

const RARITY_ORDER: MountainRarity[] = ['legendary', 'epic', 'rare', 'common'];

function formatVoice(seconds: number): string {
  const total = Math.floor(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours >= 1) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes >= 1) return `${minutes}m`;
  return `${total}s`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche tes statistiques détaillées'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    try {
      await interaction.deferReply();

      const user = await UserService.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.editReply({ content: '❌ Utilisateur introuvable dans la base de données.' });
        return;
      }

      const mountains = await UserMountainsModel.findOne({ userId: interaction.user.id });
      const stats = user.stats;
      const arcade = stats.arcade;

      const bingo = (arcade as any)?.bingo ?? { wins: 0, attempts: 0 };
      const bingoWins = bingo.wins ?? 0;
      const bingoAttempts = bingo.attempts ?? 0;
      const bingoLines = [
        `🏆 Victoires : **${bingoWins}**`,
        `🎲 Coups joués (total) : **${bingoAttempts}**`,
      ];
      if (bingoWins > 0) {
        bingoLines.push(`📊 Moyenne : **${(bingoAttempts / bingoWins).toFixed(1)}** coups/victoire`);
      }

      const justePrix = (arcade as any)?.justePrix ?? { wins: 0, attempts: 0 };
      const jpLines = [
        `🏆 Victoires : **${justePrix.wins ?? 0}**`,
        `🎲 Manches jouées : **${justePrix.attempts ?? 0}**`,
      ];

      const avalanche = (arcade as any)?.avalanche ?? { wins: 0, attempts: 0 };
      const avalancheLines = [
        `🏆 Victoires : **${avalanche.wins ?? 0}**`,
        `🎲 Parties jouées : **${avalanche.attempts ?? 0}**`,
      ];

      const arcadeLines = Object.entries(ARCADE_LABELS).map(([game, label]) => {
        const g = (arcade as any)?.[game] ?? { wins: 0, losses: 0 };
        return `${label} — 🏆 **${g.wins ?? 0}** · 💀 **${g.losses ?? 0}**`;
      });

      const opened = {
        sentier: mountains?.sentierOpened ?? 0,
        falaise: mountains?.falaiseOpened ?? 0,
        sommet: mountains?.sommetOpened ?? 0,
      };
      const totalOpened = opened.sentier + opened.falaise + opened.sommet;
      const expeditionLines = [
        `${EXPEDITION_TIER_CONFIG.sentier.emoji} ${EXPEDITION_TIER_CONFIG.sentier.label} — **${opened.sentier}**`,
        `${EXPEDITION_TIER_CONFIG.falaise.emoji} ${EXPEDITION_TIER_CONFIG.falaise.label} — **${opened.falaise}**`,
        `${EXPEDITION_TIER_CONFIG.sommet.emoji} ${EXPEDITION_TIER_CONFIG.sommet.label} — **${opened.sommet}**`,
        `📦 Total : **${totalOpened}** expédition${totalOpened > 1 ? 's' : ''} ouverte${totalOpened > 1 ? 's' : ''}`,
      ];

      const unlocked = mountains?.unlockedMountains ?? [];
      const byRarity = RARITY_ORDER
        .map(r => {
          const count = unlocked.filter(m => (m.rarity ?? 'common') === r).length;
          return count > 0 ? `${RARITY_CONFIG[r].nameEmoji} **${count}**` : null;
        })
        .filter(Boolean);
      const collectionLine = `⛰️ **${unlocked.length}** montagne${unlocked.length > 1 ? 's' : ''} débloquée${unlocked.length > 1 ? 's' : ''}` +
        (byRarity.length ? `\n${byRarity.join(' · ')}` : '');

      const miscLines = [
        `🎁 Dailies réclamés : **${stats.totalDailies ?? 0}** · 🔥 Streak : **${stats.dailyStreak ?? 0}**`,
        `💬 Messages : **${(stats.totalMsg ?? 0).toLocaleString('fr-FR')}**`,
        `🔊 Temps vocal : **${formatVoice(stats.voiceTime)}**`,
        `🎉 Soirées : **${stats.partyParticipated ?? 0}** · 🧠 Tests perso : **${stats.personalityTestsCount ?? 0}**`,
      ];

      const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 📊 Statistiques de ${interaction.user.displayName}`),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 🎯 Bingo', ...bingoLines].join('\n')),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 💰 Juste Prix', ...jpLines].join('\n')),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 🏔️ Avalanche', ...avalancheLines].join('\n')),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 🎮 Arcade', ...arcadeLines].join('\n')),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 🗺️ Expéditions ouvertes', ...expeditionLines].join('\n')),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 🏔️ Collection', collectionLine].join('\n')),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(['## 📈 Activité', ...miscLines].join('\n')),
        );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      if (isSilentDiscordError(error)) return;
      console.error('Erreur dans la commande /stats:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: '❌ Une erreur est survenue.' }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
