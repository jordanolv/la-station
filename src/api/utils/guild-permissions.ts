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
 * @returns true si l'utilisateur a les permissions, sinon envoie une réponse d'erreur et retourne false
 */
export async function requireGuildPermissions(c: Context, guildId: string): Promise<boolean> {
  const authContext = c as AuthContext;
  const user = authContext.get('user');

  if (!user) {
    c.status(401);
    c.json({ error: 'Authentication required' });
    return false;
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
      c.status(500);
      c.json({ error: 'Failed to verify guild access' });
      return false;
    }

    const guilds = await response.json() as DiscordGuild[];

    // Trouver la guild demandée
    const userGuild = guilds.find(guild => guild.id === guildId);

    if (!userGuild) {
      c.status(403);
      c.json({
        error: 'You do not have access to this guild',
        code: 'GUILD_NOT_FOUND'
      });
      return false;
    }

    // Vérifier les permissions administrateur
    const hasAdminPermissions =
      userGuild.owner === true ||
      (typeof userGuild.permissions === 'string'
        ? (BigInt(userGuild.permissions) & 0x8n) !== 0n
        : (userGuild.permissions & 0x8) !== 0);

    if (!hasAdminPermissions) {
      c.status(403);
      c.json({
        error: 'You do not have administrator permissions for this guild',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Guild permissions check error:', error);
    c.status(500);
    c.json({ error: 'Failed to verify guild permissions' });
    return false;
  }
}
