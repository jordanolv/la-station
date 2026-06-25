import CdmEventModel, { ICdmEvent } from '../models/cdm-event.model';
import { CDM_EVENT_KEY } from '../constants/cdm.constants';

export class CdmRepository {
  static async getOrCreate(): Promise<ICdmEvent> {
    const existing = await CdmEventModel.findOne({ key: CDM_EVENT_KEY });
    if (existing) return existing;
    return CdmEventModel.create({ key: CDM_EVENT_KEY });
  }

  static async setPrediction(
    userId: string,
    field: 'team' | 'outsider',
    value: string,
  ): Promise<ICdmEvent> {
    const event = await this.getOrCreate();
    const entry = event.predictions.find(p => p.userId === userId);
    if (entry) {
      entry[field] = value;
    } else {
      event.predictions.push({ userId, [field]: value });
    }
    await event.save();
    return event;
  }

  static async setResult(field: 'team' | 'outsider', value: string): Promise<ICdmEvent> {
    const event = await this.getOrCreate();
    if (field === 'team') event.resultTeam = value;
    else event.resultOutsider = value;
    await event.save();
    return event;
  }

  static async setAnnounceChannel(channelId: string): Promise<ICdmEvent> {
    const event = await this.getOrCreate();
    event.announceChannelId = channelId;
    await event.save();
    return event;
  }

  static async setStatus(status: 'open' | 'locked'): Promise<ICdmEvent> {
    const event = await this.getOrCreate();
    event.status = status;
    await event.save();
    return event;
  }

  static async close(paidAt: Date): Promise<ICdmEvent> {
    const event = await this.getOrCreate();
    event.status = 'closed';
    event.paidAt = paidAt;
    await event.save();
    return event;
  }

  static async reset(): Promise<ICdmEvent> {
    const event = await this.getOrCreate();
    event.status = 'open';
    event.predictions = [];
    event.resultTeam = undefined;
    event.resultOutsider = undefined;
    event.paidAt = undefined;
    await event.save();
    return event;
  }
}
