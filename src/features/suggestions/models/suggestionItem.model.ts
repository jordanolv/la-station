import { prop, getModelForClass, index } from '@typegoose/typegoose';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'under_review';

export class SuggestionReaction {
  @prop({ required: true })
  emoji!: string;

  @prop({ default: 0 })
  count!: number;

  @prop({ type: () => [String] })
  users!: string[]; // User IDs qui ont réagi
}

export class SuggestionField {
  @prop({ required: true })
  fieldId!: string;

  @prop({ required: true })
  label!: string;

  @prop({ required: true })
  value!: string;

  @prop({ required: true })
  type!: string;
}

@index({ guildId: 1, channelId: 1, createdAt: -1 })
@index({ guildId: 1, status: 1, score: -1 })
@index({ authorId: 1, guildId: 1 })
export class SuggestionItem {
  @prop({ required: true })
  guildId!: string;

  @prop({ required: true })
  channelId!: string;

  @prop({ required: true })
  authorId!: string;

  @prop({ required: true })
  authorUsername!: string;

  @prop()
  authorAvatar?: string;

  @prop()
  messageId?: string; // ID du message Discord

  @prop()
  threadId?: string; // ID du thread si créé

  // Données du formulaire
  @prop({ required: true })
  formId!: string;

  @prop({ type: () => [SuggestionField], default: [] })
  fields!: SuggestionField[];

  // Métadonnées
  @prop({ 
    enum: ['pending', 'approved', 'rejected', 'implemented', 'under_review'],
    default: 'pending'
  })
  status!: SuggestionStatus;

  @prop({ default: 3, min: 1, max: 5 })
  priority!: number; // 1-5, pour trier les suggestions

  @prop({ type: () => [String], default: [] })
  tags!: string[]; // Tags personnalisés

  // Interactions
  @prop({ type: () => [SuggestionReaction], default: [] })
  reactions!: SuggestionReaction[];

  @prop({ type: () => [String], default: [] })
  comments!: string[]; // IDs des messages de commentaires

  // Modération
  @prop()
  moderatorId?: string;

  @prop()
  moderatorNote?: string;

  @prop()
  moderatedAt?: Date;

  // Statistiques
  @prop({ default: 0 })
  views!: number;

  @prop({ default: 0 })
  score!: number; // Score calculé basé sur les réactions
}

// Créer le modèle
export const SuggestionItemModel = getModelForClass(SuggestionItem, {
  schemaOptions: {
    timestamps: true,
    collection: 'suggestion_items'
  }
});

// Export par défaut pour compatibilité
export default SuggestionItemModel;

// Garde les interfaces pour la compatibilité
export type ISuggestionReaction = SuggestionReaction;
export type ISuggestionField = SuggestionField;
export type ISuggestionItem = SuggestionItem;