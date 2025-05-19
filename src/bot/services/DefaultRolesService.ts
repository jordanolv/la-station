import { DefaultRolesConfig } from '../interfaces/DefaultRolesConfig.js';
import GuildModel from '../../database/models/Guild.js';

export class DefaultRolesService {
    private static instance: DefaultRolesService;

    private constructor() {}

    public static getInstance(): DefaultRolesService {
        if (!DefaultRolesService.instance) {
            DefaultRolesService.instance = new DefaultRolesService();
        }
        return DefaultRolesService.instance;
    }

    async getConfig(guildId: string): Promise<DefaultRolesConfig | null> {
        const guild = await GuildModel.findOne({ guildId });
        if (!guild) return null;
        
        return {
            guildId: guild.guildId,
            roleIds: guild.features.defaultRoles.roleIds,
            enabled: guild.features.defaultRoles.enabled
        };
    }

    async setConfig(guildId: string, roleIds: string[], enabled: boolean = true): Promise<DefaultRolesConfig> {
        const guild = await GuildModel.findOneAndUpdate(
            { guildId },
            { 
                $set: {
                    'features.defaultRoles.enabled': enabled,
                    'features.defaultRoles.roleIds': roleIds
                }
            },
            { new: true }
        );

        if (!guild) {
            throw new Error('Guild not found');
        }

        return {
            guildId: guild.guildId,
            roleIds: guild.features.defaultRoles.roleIds,
            enabled: guild.features.defaultRoles.enabled
        };
    }

    async toggleConfig(guildId: string): Promise<DefaultRolesConfig> {
        const guild = await GuildModel.findOne({ guildId });
        if (!guild) {
            throw new Error('Guild not found');
        }

        return this.setConfig(
            guildId,
            guild.features.defaultRoles.roleIds,
            !guild.features.defaultRoles.enabled
        );
    }
} 