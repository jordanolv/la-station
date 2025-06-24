import mongoose, { Schema, Document, Types } from 'mongoose';

// Types pour les champs de formulaire
export type FormFieldType = 'text' | 'textarea' | 'select' | 'number' | 'boolean';

export interface IFormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  options?: string[]; // Pour les select
  defaultValue?: string;
}

export interface ISuggestionForm {
  id: string;
  name: string;
  description?: string;
  fields: IFormField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISuggestionChannel {
  channelId: string;
  enabled: boolean;
  formId: string; // ID du formulaire à utiliser
  readOnly: boolean; // Channel en lecture seule
  buttonMessageId?: string; // ID du message avec le bouton
  suggestionCount: number; // Compteur pour republier le bouton
  republishInterval: number; // Toutes les X suggestions (défaut: 4)
  customReactions: string[]; // Emojis personnalisés, défaut: ['👍', '👎']
  pinButton: boolean; // Épingler le bouton
}

export interface ISuggestionsConfig extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  channels: ISuggestionChannel[];
  forms: ISuggestionForm[];
  defaultReactions: string[]; // Réactions par défaut
}

const FormFieldSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['text', 'textarea', 'select', 'number', 'boolean']
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  maxLength: { type: Number },
  minLength: { type: Number },
  options: [{ type: String }],
  defaultValue: { type: String }
});

const SuggestionFormSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  fields: [FormFieldSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SuggestionChannelSchema = new Schema({
  channelId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  formId: { type: String, required: true },
  readOnly: { type: Boolean, default: true },
  buttonMessageId: { type: String },
  suggestionCount: { type: Number, default: 0 },
  republishInterval: { type: Number, default: 4 },
  customReactions: [{ type: String }],
  pinButton: { type: Boolean, default: false }
});

const SuggestionsConfigSchema = new Schema<ISuggestionsConfig>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  channels: [SuggestionChannelSchema],
  forms: [SuggestionFormSchema],
  defaultReactions: { type: [String], default: ['👍', '👎'] }
}, {
  timestamps: true,
  collection: 'suggestions_config'
});

const SuggestionsConfigModel = mongoose.model<ISuggestionsConfig>('SuggestionsConfig', SuggestionsConfigSchema);

export default SuggestionsConfigModel;