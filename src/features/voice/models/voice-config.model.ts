import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class JoinChannel {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  category!: string;

  @prop({ default: '{mountain} #{count}' })
  nameTemplate!: string;
}

export class VoiceConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ type: () => [JoinChannel], default: [] })
  joinChannels!: JoinChannel[];

  @prop({ type: () => [String], default: [] })
  createdChannels!: string[];

  @prop({ default: 0 })
  channelCount!: number;

  @prop()
  notificationChannelId?: string;
}

export const VoiceConfigModel = getModelForClass(VoiceConfig, {
  schemaOptions: {
    timestamps: true,
    collection: 'voice_configs',
  },
});

export default VoiceConfigModel;

export type IJoinChannel = JoinChannel;
export type IVoiceConfigDoc = DocumentType<VoiceConfig>;
export type IVoiceConfig = VoiceConfig;
