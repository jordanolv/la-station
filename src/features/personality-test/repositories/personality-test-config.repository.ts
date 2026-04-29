import PersonalityTestConfigModel, { IPersonalityTestConfig } from '../models/personality-test-config.model';

export class PersonalityTestConfigRepository {
  static async getOrCreate(): Promise<IPersonalityTestConfig> {
    const existing = await PersonalityTestConfigModel.findOne();
    if (existing) return existing;
    return PersonalityTestConfigModel.create({});
  }

  static async update(data: Partial<{ channelId: string }>): Promise<void> {
    const doc = await this.getOrCreate();
    if (data.channelId !== undefined) doc.channelId = data.channelId;
    await doc.save();
  }
}
