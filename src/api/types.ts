import { BotClient } from '../bot/BotClient.js';

declare module 'hono' {
  interface ContextVariableMap {
    botClient: BotClient;
  }
} 