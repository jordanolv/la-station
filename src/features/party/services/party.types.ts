// ===== ERRORS =====
export class PartyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
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

export type PartyEventStatus = 'pending' | 'started' | 'ended';
