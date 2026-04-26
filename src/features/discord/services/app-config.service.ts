import AppConfigModel, { IAppConfig } from '../models/app-config.model';

export class AppConfigService {
  private static commandChannelsCache: { [key: string]: string } | null = null;
  static async getConfig(): Promise<IAppConfig | null> {
    return AppConfigModel.findOne();
  }

  static async getOrCreateConfig(): Promise<IAppConfig> {
    const config = await this.getConfig();
    if (config) {
      return config;
    }
    return AppConfigModel.create({});
  }

  static async updateSettings(settings: any): Promise<IAppConfig | null> {
    return AppConfigModel.findOneAndUpdate(
      {},
      { $set: { config: settings } },
      { new: true }
    );
  }

  static async setCommandChannel(commandName: string, channelId: string): Promise<void> {
    await AppConfigModel.updateOne(
      {},
      { $set: { [`config.commandChannels.${commandName}`]: channelId } },
      { upsert: true }
    );
    this.commandChannelsCache = null;
  }

  static async removeCommandChannel(commandName: string): Promise<void> {
    await AppConfigModel.updateOne(
      {},
      { $unset: { [`config.commandChannels.${commandName}`]: '' } }
    );
    this.commandChannelsCache = null;
  }

  static async getCommandChannels(): Promise<{ [key: string]: string }> {
    if (this.commandChannelsCache !== null) return this.commandChannelsCache;
    const config = await this.getConfig();
    this.commandChannelsCache = config?.config?.commandChannels ?? {};
    return this.commandChannelsCache;
  }
}
