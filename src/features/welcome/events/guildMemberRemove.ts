import { GuildMember, User, Client } from 'discord.js';
import { WelcomeService } from '../services/WelcomeService';

/**
 * Gestionnaire d'événement pour le départ d'un membre
 * @param member - Le membre qui a quitté (GuildMember) ou l'utilisateur (User)
 * @param guildId - ID de la guilde
 * @param client - Client Discord (nécessaire pour les User)
 */
export async function handleGuildMemberRemove(
  member: GuildMember | User, 
  guildId: string,
  client?: Client
): Promise<void> {
  const user = member instanceof GuildMember ? member.user : member;
  const discordClient = member instanceof GuildMember ? member.client : client;
  
  if (!discordClient) {
    console.error('[WELCOME] Client Discord non disponible pour handleGuildMemberRemove');
    return;
  }

  await WelcomeService.handleMemberLeave(discordClient, guildId, user);
}