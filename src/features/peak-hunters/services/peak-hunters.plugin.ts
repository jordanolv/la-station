import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, MessageFlags, TextChannel, VoiceChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { VoicePlugin, VoiceSession } from '../../voice/services/voice-session.service';
import { PeakHuntersConfigRepository } from '../repositories/peak-hunters-config.repository';
import { MOUNTAIN_REQUIRED_SECONDS, RARITY_CONFIG } from '../constants/peak-hunters.constants';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { MountainService, MountainInfo } from './mountain.service';
import type { MountainRarity } from '../types/peak-hunters.types';
import { LogService } from '../../../shared/logs/logs.service';
import { awardExpeditions } from './expedition.service';

const LOG_FEATURE = '⛰️ Mountain';
export const VOICE_CHECK_BUTTON_PREFIX = 'mountain:voice:check';

const MOUNTAIN_LOCK_DURATION_MS = 15 * 60 * 1000;
// const MOUNTAIN_LOCK_DURATION_MS = 1;
const MOUNTAIN_PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;

export interface PeakHuntersSessionResult {
  mountain: MountainInfo;
  rarity: MountainRarity;
  emoji: string;
  label: string;
  color: number;
  unlocked: boolean;
  isNew: boolean;
  totalUnlocked?: number;
  fragmentsGained?: number;
  totalFragments?: number;
  expeditionsGained?: number;
  tierSummary?: string;
}

/**
 * Plugin montagne pour le voice manager.
 *
 * - Assigne une montagne aléatoire à chaque channel créé
 * - À la déconnexion : débloque si l'user est resté ≥ MOUNTAIN_REQUIRED_SECONDS
 * - À la déconnexion : attribue des expéditions en fonction du temps vocal cumulé
 * - Tout est calculé au session end, aucun timer en cours de session
 */
export class PeakHuntersPlugin implements VoicePlugin {
  private channelMountains = new Map<string, string>();
  private userMountainLocks = new Map<string, { mountainId: string; expiresAt: number }>();
  private channelProgress = new Map<string, { accumulatedActiveSeconds: number; expiresAt: number }>();

  async init(): Promise<void> {
    const stored = await PeakHuntersConfigRepository.getActiveChannelMountains();
    for (const [channelId, mountainId] of stored) {
      if (!this.channelMountains.has(channelId)) {
        this.channelMountains.set(channelId, mountainId);
      }
    }
  }

  onBeforeChannelCreate(userId: string) {
    const now = Date.now();
    const lock = this.userMountainLocks.get(userId);

    const mountain = lock && lock.expiresAt > now
      ? MountainService.getById(lock.mountainId) ?? MountainService.getRandomWeighted()
      : MountainService.getRandomWeighted();

    if ((!lock || lock.expiresAt <= now) && mountain) {
      this.userMountainLocks.set(userId, { mountainId: mountain.id, expiresAt: now + MOUNTAIN_LOCK_DURATION_MS });
    }

    return {
      templateVars: { mountain: mountain ? mountain.mountainLabel : 'Vocal' },
      metadata: { mountainId: mountain?.id ?? null },
    };
  }

  async onChannelCreated(
    channel: VoiceChannel,
    _userId: string,
    metadata: Record<string, unknown>,
    client: BotClient,
  ): Promise<void> {
    const mountainId = metadata.mountainId as string | null;
    if (!mountainId) return;

    this.channelMountains.set(channel.id, mountainId);
    await PeakHuntersConfigRepository.setChannelMountain(channel.id, mountainId);

    const mountain = MountainService.getById(mountainId);
    if (!mountain) return;

    await this.postMountainEmbed(channel, mountain);

    const rarity = MountainService.getRarity(mountain);
    if (rarity === 'epic' || rarity === 'legendary') {
      const { emoji, label } = RARITY_CONFIG[rarity];
      const notifChannel = await this.getNotificationChannel(client);
      if (notifChannel) {
        await notifChannel.send(
          `${emoji} Une montagne **${label}** est apparue ! **${mountain.mountainLabel}** (${MountainService.getAltitude(mountain)}) — connecte-toi vite pour la débloquer ! <#${channel.id}>`,
        );
      }
    }
  }

  async onSessionEnd(session: VoiceSession, client: BotClient): Promise<Record<string, unknown> | void> {
    const mountainId = this.channelMountains.get(session.channelId);
    if (!mountainId) return;

    const mountain = MountainService.getById(mountainId);
    if (!mountain) return;

    const rarity = MountainService.getRarity(mountain);
    const { emoji, label, color } = RARITY_CONFIG[rarity];

    let vocExpeditions = 0;
    let vocSummary = '';
    if (session.activeSeconds > 0) {
      const { expeditionsToAward } = await UserMountainsRepository.addVocSeconds(session.userId, session.activeSeconds);
      if (expeditionsToAward > 0) {
        const { summary } = await awardExpeditions(session.userId, expeditionsToAward);
        vocExpeditions = expeditionsToAward;
        vocSummary = summary;
      }
    }

    const progressKey = `${session.userId}:${session.channelId}`;
    const now = Date.now();
    const previous = this.channelProgress.get(progressKey);
    const previousSeconds = previous && previous.expiresAt > now ? previous.accumulatedActiveSeconds : 0;
    const totalActive = previousSeconds + session.activeSeconds;

    if (totalActive < MOUNTAIN_REQUIRED_SECONDS) {
      this.channelProgress.set(progressKey, {
        accumulatedActiveSeconds: totalActive,
        expiresAt: now + MOUNTAIN_PROGRESS_TTL_MS,
      });
      return {
        mountain: {
          mountain, rarity, emoji, label, color,
          unlocked: false, isNew: false,
          expeditionsGained: vocExpeditions,
          tierSummary: vocSummary,
        } satisfies PeakHuntersSessionResult,
      };
    }

    this.channelProgress.delete(progressKey);

    const result = await UserMountainsRepository.unlock(session.userId, mountainId, rarity);

    if (!result) {
      const { fragmentsOnDuplicate } = RARITY_CONFIG[rarity];
      const { newFragments, expeditionsToAward } = await UserMountainsRepository.addFragments(session.userId, fragmentsOnDuplicate);

      let fragSummary = '';
      if (expeditionsToAward > 0) {
        const { summary } = await awardExpeditions(session.userId, expeditionsToAward);
        fragSummary = summary;
      }

      const totalExpeditions = vocExpeditions + expeditionsToAward;
      const totalSummary = vocSummary + fragSummary;

      await LogService.info(`<@${session.userId}> a obtenu un doublon : **${mountain.mountainLabel}** ${emoji} ${label}\n→ +${fragmentsOnDuplicate} fragment${fragmentsOnDuplicate > 1 ? 's' : ''} 🧩 (\`${newFragments}/20\`)${totalExpeditions > 0 ? `\n→ +${totalExpeditions} expéditions ${totalSummary}` : ''}`,
        { feature: LOG_FEATURE, title: '🔁 Montagne en double' },
      );

      return {
        mountain: {
          mountain, rarity, emoji, label, color,
          unlocked: true, isNew: false,
          fragmentsGained: fragmentsOnDuplicate,
          totalFragments: newFragments,
          expeditionsGained: totalExpeditions,
          tierSummary: totalSummary,
        } satisfies PeakHuntersSessionResult,
      };
    }

    await LogService.success(`<@${session.userId}> a débloqué **${mountain.mountainLabel}** ${emoji} ${label} (${MountainService.getAltitude(mountain)})\nProgression : \`${result.totalUnlocked}/${MountainService.count}\`${vocExpeditions > 0 ? `\n→ +${vocExpeditions} expéditions ${vocSummary}` : ''}`,
      { feature: LOG_FEATURE, title: '🏔️ Montagne débloquée' },
    );

    return {
      mountain: {
        mountain, rarity, emoji, label, color,
        unlocked: true, isNew: true,
        totalUnlocked: result.totalUnlocked,
        expeditionsGained: vocExpeditions,
        tierSummary: vocSummary,
      } satisfies PeakHuntersSessionResult,
    };
  }

  onChannelDeleted(channelId: string): void {
    this.channelMountains.delete(channelId);
    const suffix = `:${channelId}`;
    for (const key of this.channelProgress.keys()) {
      if (key.endsWith(suffix)) this.channelProgress.delete(key);
    }
    PeakHuntersConfigRepository.deleteChannelMountain(channelId).catch(err =>
      console.error('[PeakHuntersPlugin] Erreur suppression channel montagne:', err),
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async postMountainEmbed(channel: VoiceChannel, mountain: MountainInfo): Promise<void> {
    try {
      const rarity = MountainService.getRarity(mountain);
      const { emoji, label, color } = RARITY_CONFIG[rarity];

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⛰️ ${mountain.mountainLabel}`)
        .addFields(
          { name: '📏 Altitude', value: MountainService.getAltitude(mountain), inline: true },
          { name: '✨ Rareté', value: `${emoji} ${label}`, inline: true },
          { name: '🌍 Pays', value: MountainService.getCountryDisplay(mountain), inline: true },
          { name: '🔗 En savoir plus', value: `[Wikipédia](${mountain.article})`, inline: true },
        )
        .setImage(mountain.image)
        .setTimestamp()
        .setFooter({ text: `🏔️ Restez ${Math.floor(MOUNTAIN_REQUIRED_SECONDS / 60)} minutes pour débloquer cette montagne !` });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${VOICE_CHECK_BUTTON_PREFIX}:${mountain.id}`)
          .setLabel('Vérifier')
          .setEmoji('🔍')
          .setStyle(ButtonStyle.Secondary),
      );

      await channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('[PeakHuntersPlugin] Erreur envoi embed montagne:', err);
    }
  }

  static async handleVoiceCheck(interaction: ButtonInteraction): Promise<void> {
    const mountainId = interaction.customId.split(':')[3];
    const mountain = MountainService.getById(mountainId);
    if (!mountain) {
      await interaction.reply({ content: '❌ Montagne introuvable.', flags: MessageFlags.Ephemeral });
      return;
    }

    const owned = await UserMountainsRepository.isUnlocked(interaction.user.id, mountainId);
    const rarity = MountainService.getRarity(mountain);
    const { emoji, label } = RARITY_CONFIG[rarity];

    if (owned) {
      await interaction.reply({
        content: `✅ Tu possèdes déjà **${mountain.mountainLabel}** ${emoji} ${label} !`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `❌ Tu ne possèdes pas encore **${mountain.mountainLabel}** ${emoji} ${label}.\n🏔️ Reste **${Math.floor(MOUNTAIN_REQUIRED_SECONDS / 60)} minutes** en vocal pour la débloquer !`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async getNotificationChannel(client: BotClient): Promise<TextChannel | null> {
    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return null;

    const config = await PeakHuntersConfigRepository.get();
    if (!config?.notificationChannelId) return null;

    const channel = await guild.channels.fetch(config.notificationChannelId).catch(() => null);
    if (!channel?.isTextBased()) return null;

    return channel as TextChannel;
  }
}
