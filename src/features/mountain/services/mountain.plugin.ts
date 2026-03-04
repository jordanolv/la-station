import { EmbedBuilder, TextChannel, VoiceChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { VoicePlugin, VoiceSession } from '../../voice/services/voice-session.service';
import { VoiceConfigRepository } from '../../voice/repositories/voice-config.repository';
import { MOUNTAIN_REQUIRED_SECONDS } from '../constants/mountain.constants';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { MountainService, MountainInfo } from './mountain.service';

/**
 * Plugin montagne pour le voice manager.
 *
 * Réagit aux événements de session vocale pour :
 *  - Assigner une montagne aléatoire à chaque channel créé
 *  - Débloquer une montagne si l'utilisateur reste assez longtemps
 *  - Envoyer les embeds / notifications
 */
export class MountainPlugin implements VoicePlugin {
  private channelMountains = new Map<string, string>();

  onBeforeChannelCreate(_userId: string) {
    const mountain = MountainService.getRandom();
    return {
      templateVars: { mountain: mountain?.name ?? 'Vocal' },
      metadata: { mountainId: mountain?.id ?? null },
    };
  }

  async onChannelCreated(
    channel: VoiceChannel,
    _userId: string,
    metadata: Record<string, unknown>,
    _client: BotClient,
  ): Promise<void> {
    const mountainId = metadata.mountainId as string | null;
    if (!mountainId) return;

    this.channelMountains.set(channel.id, mountainId);

    const mountain = MountainService.getById(mountainId);
    if (mountain) {
      await this.postMountainEmbed(channel, mountain);
    }
  }

  async onSessionEnd(session: VoiceSession, client: BotClient): Promise<void> {
    const mountainId = this.channelMountains.get(session.channelId);
    if (!mountainId) return;

    if (session.durationSeconds < MOUNTAIN_REQUIRED_SECONDS) {
      console.log(
        `[MountainPlugin] user=${session.userId} ${session.durationSeconds}s < ${MOUNTAIN_REQUIRED_SECONDS}s requis`,
      );
      return;
    }

    const result = await UserMountainsRepository.unlock(session.userId, mountainId);
    if (!result) {
      console.log(`[MountainPlugin] ${mountainId} déjà débloqué pour ${session.userId}`);
      return;
    }

    const mountain = MountainService.getById(mountainId);
    if (!mountain) return;

    console.log(
      `[MountainPlugin] ${mountainId} débloqué pour ${session.userId} (${result.totalUnlocked}/${MountainService.count})`,
    );

    await this.sendUnlockNotification(client, session, mountain, result.totalUnlocked);
  }

  onChannelDeleted(channelId: string): void {
    this.channelMountains.delete(channelId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async postMountainEmbed(channel: VoiceChannel, mountain: MountainInfo): Promise<void> {
    try {
      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle(`⛰️ ${mountain.name}`)
        .setDescription(mountain.description)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '🔗 En savoir plus', value: `[Wikipédia](${mountain.wiki})`, inline: true },
        )
        .setImage(mountain.image)
        .setTimestamp()
        .setFooter({ text: '🏔️ Restez 30 minutes pour débloquer cette montagne !' });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[MountainPlugin] Erreur envoi embed montagne:', err);
    }
  }

  private async sendUnlockNotification(
    client: BotClient,
    session: VoiceSession,
    mountain: MountainInfo,
    totalUnlocked: number,
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
      if (!guild) return;

      const voiceConfig = await VoiceConfigRepository.get();
      if (!voiceConfig?.notificationChannelId) return;

      const channel = await guild.channels.fetch(voiceConfig.notificationChannelId).catch(() => null);
      if (!channel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏔️ Nouvelle montagne débloquée !')
        .setDescription(`<@${session.userId}> a débloqué **${mountain.name}** !`)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '📊 Progression', value: `${totalUnlocked}/${MountainService.count} montagnes`, inline: true },
        )
        .setThumbnail(mountain.image)
        .setFooter({ text: 'Continuez à explorer pour débloquer toutes les montagnes !' })
        .setTimestamp();

      await (channel as TextChannel).send({ embeds: [embed] }).catch(err => {
        console.error('[MountainPlugin] Erreur envoi notification:', err);
      });
    } catch (err) {
      console.error('[MountainPlugin] Erreur notification:', err);
    }
  }
}
