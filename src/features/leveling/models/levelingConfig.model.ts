import { prop, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { allowMixed: 0 } })
export class LevelingConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ default: 1 })
  taux!: number;

  @prop({ default: true })
  notifLevelUp!: boolean;

  @prop({ default: null })
  channelNotif!: string | null;
} 