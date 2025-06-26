import mongoose, { Schema, Document, Types } from 'mongoose';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'under_review';

export interface ISuggestionReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs qui ont réagi
}

export interface ISuggestionField {
  fieldId: string;
  label: string;
  value: string;
  type: string;
}

export interface ISuggestion extends Document {
  _id: Types.ObjectId;
  guildId: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  authorAvatar?: string;
  messageId?: string; // ID du message Discord
  threadId?: string; // ID du thread si créé
  
  // Données du formulaire
  formId: string;
  fields: ISuggestionField[];
  
  // Métadonnées
  status: SuggestionStatus;
  priority: number; // 1-5, pour trier les suggestions
  tags: string[]; // Tags personnalisés
  
  // Interactions
  reactions: ISuggestionReaction[];
  comments: string[]; // IDs des messages de commentaires
  
  // Modération
  moderatorId?: string;
  moderatorNote?: string;
  moderatedAt?: Date;
  
  // Statistiques
  views: number;
  score: number; // Score calculé basé sur les réactions
  
  createdAt: Date;
  updatedAt: Date;
}

const SuggestionReactionSchema = new Schema({
  emoji: { type: String, required: true },
  count: { type: Number, default: 0 },
  users: [{ type: String }]
});

const SuggestionFieldSchema = new Schema({
  fieldId: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, required: true },
  type: { type: String, required: true }
});

const SuggestionSchema = new Schema<ISuggestion>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  authorId: { type: String, required: true },
  authorUsername: { type: String, required: true },
  authorAvatar: { type: String },
  messageId: { type: String },
  threadId: { type: String },
  
  formId: { type: String, required: true },
  fields: [SuggestionFieldSchema],
  
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'implemented', 'under_review'],
    default: 'pending'
  },
  priority: { type: Number, default: 3, min: 1, max: 5 },
  tags: [{ type: String }],
  
  reactions: [SuggestionReactionSchema],
  comments: [{ type: String }],
  
  moderatorId: { type: String },
  moderatorNote: { type: String },
  moderatedAt: { type: Date },
  
  views: { type: Number, default: 0 },
  score: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'suggestions'
});

// Index pour optimiser les requêtes
SuggestionSchema.index({ guildId: 1, channelId: 1, createdAt: -1 });
SuggestionSchema.index({ guildId: 1, status: 1, score: -1 });
SuggestionSchema.index({ authorId: 1, guildId: 1 });

const SuggestionModel = mongoose.model<ISuggestion>('Suggestion', SuggestionSchema);

export default SuggestionModel;