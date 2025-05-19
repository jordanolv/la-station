import { GuildMember } from 'discord.js';
import { DefaultRolesService } from '../services/DefaultRolesService.js';

export async function handleGuildMemberAdd(member: GuildMember) {
    try {
        const service = DefaultRolesService.getInstance();
        const config = await service.getConfig(member.guild.id);

        if (!config || !config.enabled || config.roleIds.length === 0) {
            return;
        }

        await member.roles.add(config.roleIds);
        console.log(`Rôles par défaut attribués à ${member.user.tag} (${member.id})`);
    } catch (error) {
        console.error('Erreur lors de l\'attribution des rôles par défaut:', error);
    }
} 