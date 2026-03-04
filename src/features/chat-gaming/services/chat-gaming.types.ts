// ===== ERRORS =====
export class ChatGamingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'ChatGamingError';
  }
}

export class NotFoundError extends ChatGamingError {
  constructor(message: string = 'Jeu non trouvé') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// ===== DISCORD INTEGRATION =====
export interface DiscordGameData {
  threadId: string;
  messageId: string;
  roleId: string;
}
