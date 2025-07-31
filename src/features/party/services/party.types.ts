import { PartyEvent, EventInfo, DiscordInfo } from '../models/partyEvent.model';

// DTOs pour l'API
export interface CreateEventDTO {
  name: string;
  game: string;
  description?: string;
  dateTime: Date;
  maxSlots: number;
  image?: string | File;
  color?: string;
  guildId: string;
  channelId: string;
  createdBy: string;
  chatGamingGameId?: string;
  announcementChannelId?: string;
}

export interface UpdateEventDTO {
  name?: string;
  game?: string;
  description?: string;
  dateTime?: Date;
  maxSlots?: number;
  image?: string | File;
  color?: string;
  channelId?: string;
  chatGamingGameId?: string;
}

export interface EventResponseDTO {
  _id: string;
  name: string;
  game: string;
  description?: string;
  date: string;
  time: string;
  maxSlots: number;
  currentSlots: number;
  image?: string;
  color: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  threadId?: string;
  roleId?: string;
  participants: string[];
  createdBy: string;
  status: 'pending' | 'started' | 'ended';
  attendedParticipants: string[];
  rewardAmount?: number;
  xpAmount?: number;
  startedAt?: Date;
  endedAt?: Date;
}

export interface ParticipantInfoDTO {
  id: string;
  name: string;
  displayName: string;
}

export interface EndEventDTO {
  attendedParticipants: string[];
  rewardAmount?: number;
  xpAmount?: number;
}


// Gestion d'erreurs
export class PartyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PartyError';
  }
}

export class ValidationError extends PartyError {
  constructor(message: string, public details?: string[]) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends PartyError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}


export class DiscordError extends PartyError {
  constructor(message: string) {
    super(message, 'DISCORD_ERROR', 500);
  }
}

// Types utilitaires
export type PartyEventStatus = 'pending' | 'started' | 'ended';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}