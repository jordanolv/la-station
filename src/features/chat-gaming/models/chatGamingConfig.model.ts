import { prop } from '@typegoose/typegoose';

export class ChatGamingConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ default: '' })
  channelId!: string;
}

// Garde l'interface pour la compatibilité
export type IChatGamingConfig = ChatGamingConfig;