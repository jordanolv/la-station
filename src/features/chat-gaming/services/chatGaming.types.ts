import { IChatGamingItem } from '../models/chatGamingItem.model';

// ===== ERRORS =====
export class ChatGamingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ChatGamingError';
  }
}

export class ValidationError extends ChatGamingError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ChatGamingError {
  constructor(message: string = 'Jeu non trouvé') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// ===== DTOs =====
export interface CreateGameDTO {
  name: string;
  guildId: string;
  description?: string;
  image?: File | string;
  color?: string;
}

export interface UpdateGameDTO {
  name?: string;
  description?: string;
  image?: File | string;
  color?: string;
  threadId?: string;
  messageId?: string;
  roleId?: string;
}

export interface GameResponseDTO {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  color?: string;
  guildId: string;
  threadId?: string;
  messageId?: string;
  roleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== VALIDATION RESULT =====
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ===== DISCORD INTEGRATION =====
export interface DiscordGameData {
  threadId: string;
  messageId: string;
  roleId: string;
}