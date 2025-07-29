import { Events, GuildMember } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { handleGuildMemberAdd as handleWelcome } from '../../welcome/events/guildMemberAdd';

export default {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(client: any, member: GuildMember) {
    console.log(`[GUILD_MEMBER_ADD] ${member.user.tag} a rejoint ${member.guild.name}`);
    
    try {
      // Appeler le handler welcome
      await handleWelcome(member);
      
      // Ici on peut ajouter d'autres handlers si nécessaire
      // Par exemple: statistiques, logs, etc.
      
    } catch (error) {
      console.error(`[GUILD_MEMBER_ADD] Erreur lors du traitement:`, error);
    }
  }
};