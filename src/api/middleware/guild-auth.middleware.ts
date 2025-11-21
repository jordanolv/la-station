import { Context, Next } from 'hono';
import type { AuthContext } from './auth.middleware';

/**
 * Middleware qui vérifie que l'utilisateur authentifié a accès à la guild demandée
 * Doit être utilisé APRÈS authMiddleware
 */
export const guildAuthMiddleware = async (c: Context, next: Next) => {
  const authContext = c as AuthContext;
  const user = authContext.get('user');

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // Récupérer le guildId depuis les params de la route
  const guildId = c.req.param('id') || c.req.param('guildId');

  if (!guildId) {
    return c.json({ error: 'Guild ID is required' }, 400);
  }

  try {
    // Vérifier que l'utilisateur a accès à cette guild via Discord
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${user.access_token}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user guilds: ${response.status}`);
      return c.json({ error: 'Failed to verify guild access' }, 500);
    }

    const guilds = await response.json() as Array<{
      id: string;
      name: string;
      owner: boolean;
      permissions: string | number;
    }>;

    // Vérifier si l'utilisateur est dans la guild et a les permissions admin
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

    // L'utilisateur a accès, continuer
    await next();
  } catch (error) {
    console.error('Guild auth middleware error:', error);
    return c.json({ error: 'Failed to verify guild access' }, 500);
  }
};
