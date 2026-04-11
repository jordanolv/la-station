import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';
import type { MountainRarity } from '../types/mountain.types';

export class RaidParticipant {
  @prop({ required: true })
  userId!: string;

  @prop({ default: 0 })
  contributedPoints!: number;

  @prop({ default: false })
  rewarded!: boolean;
}

export class Raid {
  @prop({ required: true })
  mountainId!: string;

  @prop({ required: true })
  status!: 'active' | 'completed' | 'failed' | 'failed_partial';

  @prop({ required: true })
  rarity!: MountainRarity;

  @prop({ required: true })
  maxHp!: number;

  @prop({ required: true })
  currentHp!: number;

  @prop({ required: true })
  startedAt!: Date;

  @prop({ required: true })
  endsAt!: Date;

  @prop()
  progressMessageId?: string;

  @prop()
  progressChannelId?: string;

  @prop()
  threadId?: string;

  @prop({ type: () => [RaidParticipant], default: [] })
  participants!: RaidParticipant[];
}

const RaidModel = getModelForClass(Raid, {
  schemaOptions: { collection: 'mountain_raids', timestamps: true },
});

export type IRaid = Raid;
export type IRaidDoc = DocumentType<Raid>;
export default RaidModel;
