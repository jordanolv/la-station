import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class DailyMountainRef {
  @prop({ required: true })
  date!: string;

  @prop({ required: true })
  mountainId!: string;
}

export class PeakHuntersConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop()
  spawnChannelId?: string;

  @prop()
  notificationChannelId?: string;

  @prop()
  raidChannelId?: string;

  @prop({ type: () => [Date], default: [] })
  spawnSchedule!: Date[];

  @prop({ type: Object, default: {} })
  activeChannelMountains!: Record<string, string>;

  @prop()
  lastSpawnWinnerId?: string;

  @prop()
  activeSpawnMessageId?: string;

  @prop({ _id: false, type: () => DailyMountainRef })
  dailyMountain?: DailyMountainRef;
}

const MountainConfigModel = getModelForClass(PeakHuntersConfig, {
  schemaOptions: { collection: 'mountain_config', timestamps: true },
});

export type IPeakHuntersConfig = PeakHuntersConfig;
export type IPeakHuntersConfigDoc = DocumentType<PeakHuntersConfig>;
export default MountainConfigModel;
