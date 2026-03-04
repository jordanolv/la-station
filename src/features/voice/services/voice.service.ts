/**
 * VoiceService — Façade publique de la feature voice.
 *
 * Gère :
 *  - La config guild (joinChannels, notificationChannel, etc.)
 *  - Le cycle de vie des canaux vocaux créés dynamiquement
 *  - Le tracking de TOUTES les sessions vocales (pause/resume, rehydratation)
 *
 * Les plugins (mountain, stats, etc.) réagissent aux événements de session.
 */
import { VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVoiceConfig, IJoinChannel } from '../models/voice-config.model';
import { VoiceConfigRepository } from '../repositories/voice-config.repository';
import { VoiceSessionService } from './voice-session.service';
import { MountainPlugin } from '../../mountain/services/mountain.plugin';
import { StatsPlugin } from '../../stats/services/stats.plugin';

export { VOC_CONFIG_BUTTON_ID, VOC_INVITE_USER_SELECT_ID } from '../constants/voice.constants';

VoiceSessionService.registerPlugin(new MountainPlugin());
VoiceSessionService.registerPlugin(new StatsPlugin());

export class VoiceService {
  // ─── Config ────────────────────────────────────────────────────────────────

  static getConfig(): Promise<IVoiceConfig | null> {
    return VoiceConfigRepository.get();
  }

  static getOrCreateConfig(): Promise<IVoiceConfig> {
    return VoiceConfigRepository.getOrCreate();
  }

  static toggleFeature(enabled: boolean): Promise<IVoiceConfig> {
    return VoiceConfigRepository.toggle(enabled);
  }

  static addJoinChannel(
    channelId: string,
    category: string,
    nameTemplate = '{mountain} #{count}',
  ): Promise<IVoiceConfig> {
    return VoiceConfigRepository.upsertJoinChannel(channelId, category, nameTemplate);
  }

  static removeJoinChannel(channelId: string): Promise<IVoiceConfig | null> {
    return VoiceConfigRepository.removeJoinChannel(channelId);
  }

  static updateJoinChannelSettings(
    channelId: string,
    nameTemplate?: string,
    category?: string,
  ): Promise<IVoiceConfig | null> {
    return VoiceConfigRepository.updateJoinChannel(channelId, { nameTemplate, category });
  }

  static async getJoinChannelSettings(channelId: string): Promise<IJoinChannel | null> {
    const config = await VoiceConfigRepository.get();
    return config?.joinChannels.find(c => c.id === channelId) ?? null;
  }

  static addChannel(channelId: string): Promise<IVoiceConfig | null> {
    return VoiceConfigRepository.addCreatedChannel(channelId);
  }

  // ─── Voice events ──────────────────────────────────────────────────────────

  static handleJoin(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    return VoiceSessionService.handleJoin(client, oldState, newState);
  }

  static handleLeave(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    return VoiceSessionService.handleLeave(client, oldState, newState);
  }

  static handleVoiceStateChange(oldState: VoiceState, newState: VoiceState): void {
    VoiceSessionService.handleVoiceStateChange(oldState, newState);
  }

  // ─── Rehydration ───────────────────────────────────────────────────────────

  static rehydrate(client: BotClient): void {
    VoiceSessionService.rehydrate(client);
  }
}
