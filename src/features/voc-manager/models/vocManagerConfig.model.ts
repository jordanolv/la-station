import { prop, getModelForClass } from '@typegoose/typegoose';

// Classes pour les objets imbriqués
export class JoinChannel {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  category!: string;

  @prop({ default: '🎮 {username} #{count}' })
  nameTemplate!: string;
}

export class VocManagerConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ type: () => [JoinChannel], default: [] })
  joinChannels!: JoinChannel[];

  @prop({ type: () => [String], default: [] })
  createdChannels!: string[];

  @prop({ default: 0 })
  channelCount!: number;
}

// Créer le modèle (pour compatibilité avec l'ancien code qui l'utilise encore)
export const VocManagerModel = getModelForClass(VocManagerConfig, {
  schemaOptions: {
    timestamps: true,
    collection: 'voc_managers'
  }
});

// Export par défaut pour compatibilité
export default VocManagerModel;

// Garde les interfaces pour la compatibilité
export type IJoinChannel = JoinChannel;
export type IVocManager = VocManagerConfig; 