import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, MessageFlags, TextChannel, VoiceChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { BotEventBus } from '../../../shared/events/bot-event-bus';
import { toParisDayYMD } from '../../../shared/time/day-split';
import { VoicePlugin } from '../../voice/services/voice-session.service';
import '../../voice/events/voice.events';
import type {
  VoiceChannelCreatedEvent,
  VoiceChannelDeletedEvent,
  VoiceSessionEndedEvent,
  VoiceTickEvent,
} from '../../voice/events/voice.events';
import { PeakHuntersConfigRepository } from '../repositories/peak-hunters-config.repository';
import { RARITY_CONFIG, MOUNTAIN_UNLOCK_SECONDS, FRAGMENTS_PER_HOUR } from '../constants/peak-hunters.constants';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { MountainService, type MountainInfo } from './mountain.service';
import type { MountainRarity } from '../types/peak-hunters.types';
import { LogService } from '../../../shared/logs/logs.service';
import { DailyMountainService } from './daily-mountain.service';

const LOG_FEATURE = '⛰️ Mountain';
export const VOICE_CHECK_BUTTON_PREFIX = 'mountain:voice:check';


/**
 * Intégration peak-hunters ↔ voice.
 * - onBeforeChannelCreate (sync, impl VoicePlugin) : les channels créés aujourd'hui reçoivent la montagne du jour.
 * - voice:tick : chaque user qui cumule ≥ 60 min de voc aujourd'hui (Paris) reçoit la montagne du jour.
 * - voice:session:ended : +4 fragments / heure de voc.
 */
export class PeakHuntersPlugin implements VoicePlugin {
  /** userId → jour YMD où on a déjà grant (évite double-grant pendant la session). */
  private grantedToday = new Map<string, string>();

  async init(): Promise<void> {
    await DailyMountainService.init();
  }

  onBeforeChannelCreate(_userId: string) {
    const mountain = DailyMountainService.getTodayMountain();
    return {
      channelNamePrefix: mountain ? RARITY_CONFIG[mountain.rarity].nameEmoji : undefined,
      templateVars: { mountain: mountain ? mountain.mountainLabel : 'Vocal' },
      metadata: { mountainId: mountain?.id ?? null },
    };
  }

  registerVoiceListeners(client: BotClient): void {
    BotEventBus.on('voice:channel:created', event => {
      this.handleChannelCreated(event, client).catch(err =>
        console.error('[PeakHuntersPlugin] handleChannelCreated error:', err),
      );
    });

    BotEventBus.on('voice:tick', event => {
      this.handleTick(event, client).catch(err =>
        console.error('[PeakHuntersPlugin] handleTick error:', err),
      );
    });

    BotEventBus.on('voice:session:ended', event => {
      this.handleSessionEnded(event).catch(err =>
        console.error('[PeakHuntersPlugin] handleSessionEnded error:', err),
      );
    });

    BotEventBus.on('voice:channel:deleted', event => {
      this.handleChannelDeleted(event);
    });
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  private async handleChannelCreated(event: VoiceChannelCreatedEvent, client: BotClient): Promise<void> {
    const mountainId = event.metadata.mountainId as string | null;
    if (!mountainId) return;

    const mountain = MountainService.getById(mountainId);
    if (!mountain) return;

    this.postMountainEmbed(event.channel, mountain).catch(err =>
      console.error('[PeakHuntersPlugin] postMountainEmbed failed:', err),
    );

    const rarity = MountainService.getRarity(mountain);
    if (rarity === 'epic' || rarity === 'legendary') {
      const { emoji, label } = RARITY_CONFIG[rarity];
      this.getNotificationChannel(client)
        .then(notifChannel => {
          if (!notifChannel) return;
          return notifChannel.send(
            `${emoji} La montagne du jour est **${label}** ! **${mountain.mountainLabel}** (${MountainService.getAltitude(mountain)}) — 1h de voc aujourd'hui pour la débloquer.`,
          );
        })
        .catch(err => console.error('[PeakHuntersPlugin] rare mountain notification failed:', err));
    }
  }

  private async handleTick(event: VoiceTickEvent, client: BotClient): Promise<void> {
    const mountain = DailyMountainService.getTodayMountain();
    if (!mountain) return;

    const today = toParisDayYMD(event.tickAt);
    const rarity = MountainService.getRarity(mountain);

    for (const [uid, day] of this.grantedToday) {
      if (day !== today) this.grantedToday.delete(uid);
    }

    for (const session of event.sessions) {
      if (session.activeSecondsTodayParis < MOUNTAIN_UNLOCK_SECONDS) continue;
      if (this.grantedToday.get(session.userId) === today) continue;

      this.grantedToday.set(session.userId, today);

      try {
        const unlockResult = await UserMountainsRepository.unlock(session.userId, mountain.id, rarity);
        if (!unlockResult) {
          const { fragmentsOnDuplicate } = RARITY_CONFIG[rarity];
          await UserMountainsRepository.addFragments(session.userId, fragmentsOnDuplicate);
          this.postDailyReveal(client, session.userId, mountain, rarity, {
            fragments: fragmentsOnDuplicate,
          }).catch(() => {});
        } else {
          this.postDailyReveal(client, session.userId, mountain, rarity, {
            totalUnlocked: unlockResult.totalUnlocked,
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[PeakHuntersPlugin] handleTick grant error:', err);
      }
    }
  }

  private async handleSessionEnded(event: VoiceSessionEndedEvent): Promise<void> {
    if (event.activeSeconds <= 0) return;

    const fragments = Math.floor((event.activeSeconds / 3600) * FRAGMENTS_PER_HOUR);
    if (fragments <= 0) return;

    const { newFragments, expeditionsToAward } = await UserMountainsRepository.addFragments(event.userId, fragments);

    let msg = `<@${event.userId}> a gagné **${fragments}** fragment${fragments > 1 ? 's' : ''} 🧩 (\`${newFragments}/20\`)`;
    if (expeditionsToAward > 0) {
      msg += ` → conversion en **${expeditionsToAward}** expédition${expeditionsToAward > 1 ? 's' : ''}`;
    }
    LogService.info(msg, { feature: LOG_FEATURE, title: '🧩 Fragments de voc' });
  }

  private handleChannelDeleted(event: VoiceChannelDeletedEvent): void {
    PeakHuntersConfigRepository.deleteChannelMountain(event.channelId).catch(err =>
      console.error('[PeakHuntersPlugin] Erreur suppression channel montagne:', err),
    );
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private async postDailyReveal(
    client: BotClient,
    userId: string,
    mountain: MountainInfo,
    rarity: MountainRarity,
    info: { fragments: number } | { totalUnlocked: number },
  ): Promise<void> {
    const notifChannel = await this.getNotificationChannel(client);
    if (!notifChannel) return;

    const { emoji, label, color } = RARITY_CONFIG[rarity];
    const isDuplicate = 'fragments' in info;

    const header = `<@${userId}> a passé 1h en voc aujourd'hui 🏆`;
    const description = 'fragments' in info
      ? `${header}\n→ déjà possédée → +${info.fragments} fragment${info.fragments > 1 ? 's' : ''} 🧩`
      : `${header}\n→ nouvelle montagne débloquée !  📊 \`${info.totalUnlocked}/${MountainService.count}\``;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(isDuplicate
        ? `🔁 ${mountain.mountainLabel} — déjà possédée`
        : `🏔️ Montagne du jour débloquée — ${mountain.mountainLabel}`,
      )
      .setDescription(description)
      .addFields(
        { name: '📏 Altitude', value: MountainService.getAltitude(mountain), inline: true },
        { name: '✨ Rareté', value: `${emoji} ${label}`, inline: true },
        { name: '🌍 Pays', value: MountainService.getCountryDisplay(mountain), inline: true },
      )
      .setImage(mountain.image)
      .setTimestamp();

    await notifChannel.send({ embeds: [embed] });
  }

  private async postMountainEmbed(channel: VoiceChannel, mountain: MountainInfo): Promise<void> {
    try {
      const rarity = MountainService.getRarity(mountain);
      const { emoji, label, color } = RARITY_CONFIG[rarity];

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⛰️ Montagne du jour — ${mountain.mountainLabel}`)
        .addFields(
          { name: '📏 Altitude', value: MountainService.getAltitude(mountain), inline: true },
          { name: '✨ Rareté', value: `${emoji} ${label}`, inline: true },
          { name: '🌍 Pays', value: MountainService.getCountryDisplay(mountain), inline: true },
          { name: '🔗 En savoir plus', value: `[Wikipédia](${mountain.article})`, inline: true },
        )
        .setImage(mountain.image)
        .setTimestamp()
        .setFooter({ text: '🕐 Cumule 1h de voc aujourd\'hui pour la débloquer !' });

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
        content: `❌ Tu ne possèdes pas encore **${mountain.mountainLabel}** ${emoji} ${label}.\n🕐 Cumule **1 heure de voc aujourd'hui** pour la débloquer !`,
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
