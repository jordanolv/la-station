import AppConfigModel, { IAppConfig } from '../models/app-config.model';

export class AppConfigService {
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
  }

  static async removeCommandChannel(commandName: string): Promise<void> {
    await AppConfigModel.updateOne(
      {},
      { $unset: { [`config.commandChannels.${commandName}`]: '' } }
    );
  }

  static async getCommandChannels(): Promise<{ [key: string]: string }> {
    const config = await this.getConfig();
    return config?.config?.commandChannels ?? {};
  }
}
