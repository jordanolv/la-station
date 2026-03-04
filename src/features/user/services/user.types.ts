import { IUser } from '../models/user.model';
import { IBirthday } from '../models/birthday-config.model';

// ===== ERRORS =====
export class UserError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export class ValidationError extends UserError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends UserError {
  constructor(message: string = 'Utilisateur non trouvé') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// ===== USER DTOs =====
export interface CreateUserDTO {
  discordId: string;
  name: string;
  birthday?: Date;
}

export interface UpdateUserDTO {
  name?: string;
  birthday?: Date;
  profil?: {
    money?: number;
    exp?: number;
    lvl?: number;
  };
  stats?: {
    totalMsg?: number;
    voiceTime?: number;
  };
}

export interface SetBirthdayDTO {
  discordId: string;
  birthday: Date;
}

// ===== BIRTHDAY CONFIG DTOs =====
export interface UpdateBirthdayConfigDTO {
  channel?: string;
  enabled?: boolean;
}

// ===== RESPONSE DTOs =====
export interface UserProfileResponseDTO {
  discordId: string;
  name: string;
  profil: {
    money: number;
    exp: number;
    lvl: number;
  };
  stats: {
    totalMsg: number;
    voiceTime: number;
    voiceHistory: Array<{
      date: Date;
      time: number;
    }>;
  };
  infos: {
    registeredAt: Date;
    updatedAt: Date;
    birthday?: Date;
  };
}

export interface BirthdayConfigResponseDTO {
  channel: string;
  enabled: boolean;
}

export interface BirthdayNotificationDTO {
  user: {
    discordId: string;
    name: string;
    age?: number;
  };
  guild: {
    id: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
  };
}

// ===== VALIDATION TYPES =====
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ===== BIRTHDAY SEARCH TYPES =====
export interface BirthdaySearchCriteria {
  month: number;
  day: number;
}

export interface BirthdayUser {
  discordId: string;
  name: string;
  birthday: Date;
  age?: number;
}

// ===== STATS TYPES =====
export interface VoiceSessionDTO {
  discordId: string;
  duration: number; // en millisecondes
}

export interface MessageStatDTO {
  discordId: string;
  messageCount: number;
}

export interface UserStatsUpdateDTO {
  discordId: string;
  voiceTime?: number;
  messageCount?: number;
}