import { prop } from '@typegoose/typegoose';

export class BirthdayConfig {
  @prop({ default: '' })
  channel!: string;

  @prop({ default: false })
  enabled!: boolean;
}

// Garde l'interface pour la compatibilité
export type IBirthday = BirthdayConfig; 