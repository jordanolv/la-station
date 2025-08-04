import { ISuggestionItem, ISuggestionField } from '../models/suggestionItem.model';
import { ISuggestionForm, ISuggestionChannel, IFormField } from '../models/suggestionConfig.model';

// ===== ERRORS =====
export class SuggestionsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SuggestionsError';
  }
}

export class ValidationError extends SuggestionsError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends SuggestionsError {
  constructor(message: string = 'Ressource non trouvée') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// ===== CONFIG DTOs =====
export interface CreateFormDTO {
  name: string;
  description?: string;
  fields: CreateFormFieldDTO[];
}

export interface CreateFormFieldDTO {
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}

export interface UpdateFormFieldDTO {
  id?: string; // Présent si on met à jour un champ existant
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}

export interface UpdateFormDTO {
  name?: string;
  description?: string;
  fields?: UpdateFormFieldDTO[];
}

export interface CreateChannelDTO {
  channelId: string;
  channelName?: string;
  formId: string;
  enabled?: boolean;
  readOnly?: boolean;
  republishInterval?: number;
  customReactions?: string[];
  pinButton?: boolean;
}

export interface UpdateChannelDTO {
  channelName?: string;
  formId?: string;
  enabled?: boolean;
  readOnly?: boolean;
  republishInterval?: number;
  customReactions?: string[];
  pinButton?: boolean;
  buttonMessageId?: string;
}

// ===== SUGGESTION DTOs =====
export interface CreateSuggestionDTO {
  guildId: string;
  channelId: string;
  formId: string;
  authorId: string;
  authorUsername: string;
  authorAvatar?: string;
  fields: CreateSuggestionFieldDTO[];
}

export interface CreateSuggestionFieldDTO {
  fieldId: string;
  label: string;
  value: string;
  type: 'text' | 'textarea';
}

export interface UpdateSuggestionStatusDTO {
  status: SuggestionStatus;
  moderatorId?: string;
  note?: string;
}

// ===== RESPONSE DTOs =====
export interface FormResponseDTO {
  id: string;
  name: string;
  description?: string;
  fields: FormFieldResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormFieldResponseDTO {
  id: string;
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
}

export interface ChannelResponseDTO {
  channelId: string;
  channelName: string;
  enabled: boolean;
  formId: string;
  readOnly: boolean;
  republishInterval: number;
  customReactions: string[];
  pinButton: boolean;
  buttonMessageId?: string;
  suggestionCount: number;
}

export interface SuggestionResponseDTO {
  _id: string;
  guildId: string;
  channelId: string;
  formId: string;
  authorId: string;
  authorUsername: string;
  authorAvatar?: string;
  fields: SuggestionFieldResponseDTO[];
  messageId?: string;
  status: SuggestionStatus;
  reactions: ReactionResponseDTO[];
  score: number;
  views: number;
  moderatorId?: string;
  moderatorNote?: string;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestionFieldResponseDTO {
  fieldId: string;
  label: string;
  value: string;
  type: 'text' | 'textarea';
}

export interface ReactionResponseDTO {
  emoji: string;
  count: number;
  users: string[];
}

export interface ConfigResponseDTO {
  guildId: string;
  enabled: boolean;
  channels: ChannelResponseDTO[];
  forms: FormResponseDTO[];
  defaultReactions: string[];
}

// ===== ENUMS & TYPES =====
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'under_review';

export interface SuggestionStatusInfo {
  emoji: string;
  text: string;
  color: number;
}

// ===== VALIDATION RESULT =====
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ===== DISCORD INTERACTION DATA =====
export interface ButtonInteractionData {
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
}

export interface ModalSubmitData {
  guildId: string;
  channelId: string;
  formId: string;
  userId: string;
  username: string;
  userAvatar: string;
  fields: CreateSuggestionFieldDTO[];
}

export interface ReactionData {
  guildId: string;
  channelId: string;
  messageId: string;
  emoji: string;
  userId: string;
  isAdd: boolean;
}

// ===== PERMISSION & CHANNEL SETUP =====
export interface ChannelPermissionSetup {
  channelId: string;
  readOnly: boolean;
  botCanWrite: boolean;
  everyoneCanReact: boolean;
}

export interface ButtonPublishResult {
  messageId: string | null;
  success: boolean;
  error?: string;
}