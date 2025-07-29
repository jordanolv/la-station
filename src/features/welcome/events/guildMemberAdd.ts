import { GuildMember } from 'discord.js';
import { WelcomeService } from '../services/WelcomeService';

/**
 * Gestionnaire d'événement pour l'arrivée d'un nouveau membre
 */
export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  await WelcomeService.handleMemberJoin(member);
}