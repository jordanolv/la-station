import { Context } from 'hono';
import type { AuthContext } from '../middleware/auth.middleware';

interface DiscordGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string | number;
}

/**
 * Vérifie que l'utilisateur authentifié a les permissions admin sur une guild
 * @param c - Context Hono
 * @param guildId - ID de la guild Discord
 * @returns true si l'utilisateur a les permissions, sinon envoie une réponse d'erreur et retourne la réponse
 */
export async function requireGuildPermissions(c: Context, guildId: string): Promise<true | Response> {
  const authContext = c as AuthContext;
  const user = authContext.get('user');

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    // Récupérer les guilds de l'utilisateur depuis Discord
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${user.access_token}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user guilds: ${response.status}`);
      return c.json({ error: 'Failed to verify guild access' }, 500);
    }

    const guilds = await response.json() as DiscordGuild[];

    // Trouver la guild demandée
    const userGuild = guilds.find(guild => guild.id === guildId);

    if (!userGuild) {
      return c.json({
        error: 'You do not have access to this guild',
        code: 'GUILD_NOT_FOUND'
      }, 403);
    }

    // Vérifier les permissions administrateur
    const hasAdminPermissions =
      userGuild.owner === true ||
      (typeof userGuild.permissions === 'string'
        ? (BigInt(userGuild.permissions) & 0x8n) !== 0n
        : (userGuild.permissions & 0x8) !== 0);

    if (!hasAdminPermissions) {
      return c.json({
        error: 'You do not have administrator permissions for this guild',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, 403);
    }

    return true;
  } catch (error) {
    console.error('Guild permissions check error:', error);
    return c.json({ error: 'Failed to verify guild permissions' }, 500);
  }
}
