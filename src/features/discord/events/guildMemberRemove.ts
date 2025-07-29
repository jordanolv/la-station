import { Events, GuildMember } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { handleGuildMemberRemove as handleGoodbye } from '../../welcome/events/guildMemberRemove';

export default {
  name: Events.GuildMemberRemove,
  once: false,

  async execute(client: any, member: GuildMember) {
    console.log(`[GUILD_MEMBER_REMOVE] ${member.user.tag} a quitté ${member.guild.name}`);
    console.log(`[DEBUG] Événement guildMemberRemove déclenché pour guild ${member.guild.id}`);
    
    try {
      // Appeler le handler goodbye
      await handleGoodbye(member, member.guild.id);
      
      // Ici on peut ajouter d'autres handlers si nécessaire
      // Par exemple: statistiques, logs, etc.
      
    } catch (error) {
      console.error(`[GUILD_MEMBER_REMOVE] Erreur lors du traitement:`, error);
    }
  }
};