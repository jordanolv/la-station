import { prop } from '@typegoose/typegoose';

export class PartyConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ default: '' })
  channelId!: string;
}

// Garde l'interface pour la compatibilité
export type IParty = PartyConfig;