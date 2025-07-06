import { prop } from '@typegoose/typegoose';

// Types pour les champs de formulaire
export type FormFieldType = 'text' | 'textarea' | 'select' | 'number' | 'boolean';

export class FormField {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  label!: string;

  @prop({ required: true, enum: ['text', 'textarea', 'select', 'number', 'boolean'] })
  type!: FormFieldType;

  @prop({ default: false })
  required!: boolean;

  @prop()
  placeholder?: string;

  @prop()
  maxLength?: number;

  @prop()
  minLength?: number;

  @prop({ type: () => [String] })
  options?: string[];

  @prop()
  defaultValue?: string;
}

export class SuggestionForm {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  name!: string;

  @prop()
  description?: string;

  @prop({ type: () => [FormField], default: [] })
  fields!: FormField[];

  @prop({ default: () => new Date() })
  createdAt!: Date;

  @prop({ default: () => new Date() })
  updatedAt!: Date;
}

export class SuggestionChannel {
  @prop({ required: true })
  channelId!: string;

  @prop()
  channelName?: string;

  @prop({ default: true })
  enabled!: boolean;

  @prop({ required: true })
  formId!: string;

  @prop({ default: true })
  readOnly!: boolean;

  @prop()
  buttonMessageId?: string;

  @prop({ default: 0 })
  suggestionCount!: number;

  @prop({ default: 4 })
  republishInterval!: number;

  @prop({ type: () => [String], default: ['👍', '👎'] })
  customReactions?: string[];

  @prop({ default: false })
  pinButton!: boolean;
}

export class SuggestionsConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ type: () => [SuggestionChannel], default: [] })
  channels!: SuggestionChannel[];

  @prop({ type: () => [SuggestionForm], default: [] })
  forms!: SuggestionForm[];

  @prop({ type: () => [String], default: ['👍', '👎'] })
  defaultReactions!: string[];
}

// Garde les interfaces pour la compatibilité
export type IFormField = FormField;
export type ISuggestionForm = SuggestionForm;
export type ISuggestionChannel = SuggestionChannel;
export type ISuggestionsConfig = SuggestionsConfig;