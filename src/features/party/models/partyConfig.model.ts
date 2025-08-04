import { prop } from '@typegoose/typegoose';

export class PartyConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ default: '' })
  channelId!: string;

  @prop()
  defaultRoleId?: string; // Rôle par défaut pour les jeux custom
}