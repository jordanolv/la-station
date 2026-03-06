import { EmbedBuilder, TextChannel, VoiceChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { VoicePlugin, VoiceSession } from '../../voice/services/voice-session.service';
import { MountainConfigRepository } from '../repositories/mountain-config.repository';
import { MOUNTAIN_REQUIRED_SECONDS, RARITY_CONFIG } from '../constants/mountain.constants';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { MountainService, MountainInfo } from './mountain.service';
import type { MountainRarity } from '../types/mountain.types';
import { LogService } from '../../../shared/logs/logs.service';

const LOG_FEATURE = '⛰️ Mountain';

export interface MountainSessionResult {
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
  ticketsGained?: number;
}

/**
 * Plugin montagne pour le voice manager.
 *
 * - Assigne une montagne aléatoire à chaque channel créé
 * - À la déconnexion : débloque si l'user est resté ≥ MOUNTAIN_REQUIRED_SECONDS
 * - À la déconnexion : attribue des tickets en fonction du temps vocal cumulé
 * - Tout est calculé au session end, aucun timer en cours de session
 */
export class MountainPlugin implements VoicePlugin {
  private channelMountains = new Map<string, string>();

  onBeforeChannelCreate(_userId: string) {
    const mountain = MountainService.getRandomByPackWeight();
    return {
      templateVars: { mountain: mountain?.name ?? 'Vocal' },
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

    const mountain = MountainService.getById(mountainId);
    if (!mountain) return;

    await this.postMountainEmbed(channel, mountain);

    const rarity = MountainService.getRarity(mountain);
    if (rarity === 'epic' || rarity === 'legendary') {
      const { emoji, label } = RARITY_CONFIG[rarity];
      const notifChannel = await this.getNotificationChannel(client);
      if (notifChannel) {
        await notifChannel.send(
          `${emoji} Une montagne **${label}** est apparue ! **${mountain.name}** (${mountain.altitude}) — connecte-toi vite pour la débloquer ! <#${channel.id}>`,
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

    // Tickets : accumulation cross-sessions via vocSecondsAccumulated en BDD
    let vocTicketsGained = 0;
    if (session.activeSeconds > 0) {
      const vocResult = await UserMountainsRepository.addVocSeconds(session.userId, session.activeSeconds);
      vocTicketsGained = vocResult.ticketsGained;
    }

    // Pas assez de temps actif → on retourne quand même la montagne du channel sans unlock
    if (session.activeSeconds < MOUNTAIN_REQUIRED_SECONDS) {
      return {
        mountain: {
          mountain, rarity, emoji, label, color,
          unlocked: false, isNew: false,
          ticketsGained: vocTicketsGained,
        } satisfies MountainSessionResult,
      };
    }

    const result = await UserMountainsRepository.unlock(session.userId, mountainId, rarity);

    if (!result) {
      const { fragmentsOnDuplicate } = RARITY_CONFIG[rarity];
      const { newFragments, ticketsGained: fragTickets } = await UserMountainsRepository.addFragments(session.userId, fragmentsOnDuplicate);
      const totalTickets = vocTicketsGained + fragTickets;

      await LogService.info(client,
        `<@${session.userId}> a obtenu un doublon : **${mountain.name}** ${emoji} ${label}\n→ +${fragmentsOnDuplicate} fragment${fragmentsOnDuplicate > 1 ? 's' : ''} 🧩 (\`${newFragments}/20\`)${totalTickets > 0 ? `\n→ +${totalTickets} 🎟️ ticket${totalTickets > 1 ? 's' : ''}` : ''}`,
        { feature: LOG_FEATURE, title: '🔁 Montagne en double' },
      );

      return {
        mountain: {
          mountain, rarity, emoji, label, color,
          unlocked: true, isNew: false,
          fragmentsGained: fragmentsOnDuplicate,
          totalFragments: newFragments,
          ticketsGained: totalTickets,
        } satisfies MountainSessionResult,
      };
    }

    await LogService.success(client,
      `<@${session.userId}> a débloqué **${mountain.name}** ${emoji} ${label} (${mountain.altitude})\nProgression : \`${result.totalUnlocked}/${MountainService.count}\`${vocTicketsGained > 0 ? `\n→ +${vocTicketsGained} 🎟️ ticket${vocTicketsGained > 1 ? 's' : ''}` : ''}`,
      { feature: LOG_FEATURE, title: '🏔️ Montagne débloquée' },
    );

    return {
      mountain: {
        mountain, rarity, emoji, label, color,
        unlocked: true, isNew: true,
        totalUnlocked: result.totalUnlocked,
        ticketsGained: vocTicketsGained,
      } satisfies MountainSessionResult,
    };
  }

  onChannelDeleted(channelId: string): void {
    this.channelMountains.delete(channelId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async postMountainEmbed(channel: VoiceChannel, mountain: MountainInfo): Promise<void> {
    try {
      const rarity = MountainService.getRarity(mountain);
      const { emoji, label, color } = RARITY_CONFIG[rarity];

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⛰️ ${mountain.name}`)
        .setDescription(mountain.description)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '✨ Rareté', value: `${emoji} ${label}`, inline: true },
          { name: '🔗 En savoir plus', value: `[Wikipédia](${mountain.wiki})`, inline: true },
        )
        .setImage(mountain.image)
        .setTimestamp()
        .setFooter({ text: `🏔️ Restez ${Math.floor(MOUNTAIN_REQUIRED_SECONDS / 60)} minutes pour débloquer cette montagne !` });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[MountainPlugin] Erreur envoi embed montagne:', err);
    }
  }

  private async getNotificationChannel(client: BotClient): Promise<TextChannel | null> {
    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return null;

    const config = await MountainConfigRepository.get();
    if (!config?.notificationChannelId) return null;

    const channel = await guild.channels.fetch(config.notificationChannelId).catch(() => null);
    if (!channel?.isTextBased()) return null;

    return channel as TextChannel;
  }
}
