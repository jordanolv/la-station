import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class MountainConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop()
  spawnChannelId?: string;

  @prop()
  notificationChannelId?: string;

  @prop({ type: () => [Date], default: [] })
  spawnSchedule!: Date[];

  @prop({ type: String, default: new Map() })
  activeChannelMountains!: Map<string, string>;
}

const MountainConfigModel = getModelForClass(MountainConfig, {
  schemaOptions: { collection: 'mountain_config', timestamps: true },
});

export type IMountainConfig = MountainConfig;
export type IMountainConfigDoc = DocumentType<MountainConfig>;
export default MountainConfigModel;
