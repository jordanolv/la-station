import { prop } from '@typegoose/typegoose';

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

// Garde l'interface pour la compatibilité
export type ILeveling = LevelingConfig; 