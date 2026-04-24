import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

/**
 * Codes d'erreur Discord qu'on considère "silencieux" :
 * rien à faire côté bot, on les ignore sans polluer les logs.
 *
 * - 10062 UnknownInteraction : token expiré (>3s entre event et réponse).
 * - 10008 UnknownMessage : message supprimé entre-temps.
 * - 40060 InteractionHasAlreadyBeenAcknowledged : double-réponse (race condition).
 */
const SILENT_CODES = new Set<number>([
  RESTJSONErrorCodes.UnknownInteraction,
  RESTJSONErrorCodes.UnknownMessage,
  RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
]);

export function isSilentDiscordError(error: unknown): boolean {
  return error instanceof DiscordAPIError && SILENT_CODES.has(Number(error.code));
}
