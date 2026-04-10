import { AppConfigService } from '../../discord/services/app-config.service';
import { IVoiceConfig, IJoinChannel } from '../models/voice-config.model';

const DEFAULT_VOICE_CONFIG: IVoiceConfig = {
  enabled: false,
  joinChannels: [],
  createdChannels: [],
  channelCount: 0,
  notificationChannelId: undefined,
};

export class VoiceConfigRepository {
  static async get(): Promise<IVoiceConfig | null> {
    const config = await AppConfigService.getConfig();
    return config?.features?.voice ?? null;
  }

  static async getOrCreate(): Promise<IVoiceConfig> {
    const existing = await this.get();
    if (existing) return existing;

    const config = await AppConfigService.getOrCreateConfig();
    config.features = config.features ?? {};
    config.features.voice = { ...DEFAULT_VOICE_CONFIG };
    await config.save();
    return config.features.voice;
  }

  static async toggle(enabled: boolean): Promise<IVoiceConfig> {
    const config = await AppConfigService.getOrCreateConfig();
    config.features = config.features ?? {};
    config.features.voice = config.features.voice ?? { ...DEFAULT_VOICE_CONFIG };
    config.features.voice.enabled = enabled;
    await config.save();
    return config.features.voice;
  }

  static async upsertJoinChannel(channelId: string, category: string, nameTemplate: string): Promise<IVoiceConfig> {
    const config = await AppConfigService.getOrCreateConfig();
    config.features = config.features ?? {};
    config.features.voice = config.features.voice ?? { ...DEFAULT_VOICE_CONFIG };

    const channels = config.features.voice.joinChannels;
    const idx = channels.findIndex(c => c.id === channelId);
    const entry: IJoinChannel = { id: channelId, category, nameTemplate };

    if (idx !== -1) channels[idx] = entry;
    else channels.push(entry);

    await config.save();
    return config.features.voice;
  }

  static async removeJoinChannel(channelId: string): Promise<IVoiceConfig | null> {
    const config = await AppConfigService.getOrCreateConfig();
    if (!config.features?.voice) return null;
    config.features.voice.joinChannels = config.features.voice.joinChannels.filter(c => c.id !== channelId);
    await config.save();
    return config.features.voice;
  }

  static async updateJoinChannel(channelId: string, patch: Partial<Pick<IJoinChannel, 'nameTemplate' | 'category'>>): Promise<IVoiceConfig | null> {
    const config = await AppConfigService.getOrCreateConfig();
    if (!config.features?.voice) return null;

    const idx = config.features.voice.joinChannels.findIndex(c => c.id === channelId);
    if (idx === -1) return null;

    Object.assign(config.features.voice.joinChannels[idx], patch);
    await config.save();
    return config.features.voice;
  }

  static async addCreatedChannel(channelId: string): Promise<IVoiceConfig | null> {
    const config = await AppConfigService.getOrCreateConfig();
    if (!config.features?.voice) return null;
    config.features.voice.createdChannels.push(channelId);
    config.features.voice.channelCount += 1;
    await config.save();
    return config.features.voice;
  }

  static async removeCreatedChannel(channelId: string, decrementCount = false): Promise<IVoiceConfig | null> {
    const config = await AppConfigService.getOrCreateConfig();
    if (!config.features?.voice) return null;
    config.features.voice.createdChannels = config.features.voice.createdChannels.filter(id => id !== channelId);
    if (decrementCount && config.features.voice.channelCount > 0) {
      config.features.voice.channelCount -= 1;
    }
    await config.save();
    return config.features.voice;
  }

  static async setNotificationChannel(channelId: string | null): Promise<IVoiceConfig> {
    const config = await AppConfigService.getOrCreateConfig();
    config.features = config.features ?? {};
    config.features.voice = config.features.voice ?? { ...DEFAULT_VOICE_CONFIG };
    config.features.voice.notificationChannelId = channelId ?? undefined;
    config.markModified('features.voice');
    await config.save();
    return config.features.voice;
  }
}
