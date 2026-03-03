/**
 * VocManagerService — Façade publique du feature voc-manager.
 *
 * Ne contient aucune logique métier. Délègue à :
 *  - VocManagerRepository  : persistance de la config guild
 *  - MountainService       : montagnes, sessions, déblocages
 *  - ChannelService        : création / suppression de canaux vocaux
 */
import { VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVocManager, IJoinChannel } from '../models/vocManagerConfig.model';
import { VocManagerRepository } from '../repositories/vocManager.repository';
import { UserMountainsRepository } from '../repositories/userMountains.repository';
import { MountainService, MountainInfo } from './mountain.service';
import { ChannelService } from './channel.service';

export { VOC_CONFIG_BUTTON_ID, VOC_INVITE_USER_SELECT_ID } from '../constants/vocManager.constants';
export type { MountainInfo };

export class VocManagerService {
  // ─── Config ────────────────────────────────────────────────────────────────

  static getVocManager(guildId: string): Promise<IVocManager | null> {
    return VocManagerRepository.get(guildId);
  }

  static getOrCreateVocManager(guildId: string, _enabled = false): Promise<IVocManager> {
    return VocManagerRepository.getOrCreate(guildId);
  }

  static toggleFeature(guildId: string, enabled: boolean): Promise<IVocManager> {
    return VocManagerRepository.toggle(guildId, enabled);
  }

  static updateNotificationChannel(guildId: string, channelId: string | null): Promise<IVocManager> {
    return VocManagerRepository.setNotificationChannel(guildId, channelId);
  }

  static addJoinChannel(
    guildId: string,
    channelId: string,
    category: string,
    nameTemplate = '🎮 {username} #{count}'
  ): Promise<IVocManager> {
    return VocManagerRepository.upsertJoinChannel(guildId, channelId, category, nameTemplate);
  }

  static removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    return VocManagerRepository.removeJoinChannel(guildId, channelId);
  }

  static updateJoinChannelSettings(
    guildId: string,
    channelId: string,
    nameTemplate?: string,
    category?: string
  ): Promise<IVocManager | null> {
    return VocManagerRepository.updateJoinChannel(guildId, channelId, { nameTemplate, category });
  }

  static async getJoinChannelSettings(guildId: string, channelId: string): Promise<IJoinChannel | null> {
    const config = await VocManagerRepository.get(guildId);
    return config?.joinChannels.find(c => c.id === channelId) ?? null;
  }

  static addChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    return VocManagerRepository.addCreatedChannel(guildId, channelId);
  }

  // ─── Mountains ─────────────────────────────────────────────────────────────

  static getAllMountains(): MountainInfo[] {
    return MountainService.getAll();
  }

  static getMountainById(id: string): MountainInfo | undefined {
    return MountainService.getById(id);
  }

  static reloadMountains(): void {
    MountainService.loadMountains();
  }

  static getUserUnlockedMountains(userId: string) {
    return UserMountainsRepository.getUnlocked(userId);
  }

  // ─── Voice events ──────────────────────────────────────────────────────────

  static handleUserJoinChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    return ChannelService.handleJoin(client, oldState, newState);
  }

  static handleUserLeaveChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    return ChannelService.handleLeave(client, oldState, newState);
  }
}
