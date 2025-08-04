// DTOs pour l'API
export interface UpdateLevelingConfigDTO {
  enabled?: boolean;
  taux?: number;
  notifLevelUp?: boolean;
  channelNotif?: string | null;
}

export interface LevelUpResult {
  hasLeveledUp: boolean;
  newLevel: number;
  xpGiven: number;
  xpNeededForNext: number;
}

export interface XpCalculation {
  baseXp: number;
  multiplier: number;
  finalXp: number;
}

// Gestion d'erreurs
export class LevelingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LevelingError';
  }
}

export class ValidationError extends LevelingError {
  constructor(message: string, public details?: string[]) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends LevelingError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

// Types utilitaires
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}