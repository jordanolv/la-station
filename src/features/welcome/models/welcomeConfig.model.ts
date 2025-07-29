import { prop } from '@typegoose/typegoose';

export class WelcomeConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ default: false })
  welcomeEnabled!: boolean;

  @prop({ default: false })
  goodbyeEnabled!: boolean;

  @prop({ default: null })
  welcomeChannelId!: string | null;

  @prop({ default: null })
  goodbyeChannelId!: string | null;

  @prop({ default: 'Bienvenue {user} sur le serveur!' })
  welcomeMessage!: string;

  @prop({ default: 'Au revoir {user}!' })
  goodbyeMessage!: string;

  @prop({ default: false })
  generateWelcomeImage!: boolean;

  @prop({ default: false })
  generateGoodbyeImage!: boolean;

  @prop({ default: [], type: () => [String] })
  autoRoles!: string[];
}

// Garde l'interface pour la compatibilité
export type IWelcome = WelcomeConfig;