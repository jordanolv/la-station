import { Context, Next } from 'hono';
import { verify, JwtPayload } from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  name: string;
  avatar: string;
  discriminator: string;
  access_token: string;
}

export interface AuthContext extends Context {
  get(key: 'user'): AuthUser;
  set(key: 'user', value: AuthUser): void;
}

/**
 * Middleware d'authentification JWT
 * Vérifie le token JWT depuis les cookies et le valide
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    // Récupérer le cookie auth_token
    const cookies = c.req.header('Cookie');

    if (!cookies) {
      return c.json({ error: 'No authentication cookie provided' }, 401);
    }

    // Parser les cookies pour extraire auth_token
    const cookieMap = cookies.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const token = cookieMap['auth_token'];

    if (!token) {
      return c.json({ error: 'No authentication token provided' }, 401);
    }

    // Vérifier et décoder le JWT
    const decoded = verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload & AuthUser;

    // Vérifier que le token contient les informations nécessaires
    if (!decoded.id || !decoded.access_token) {
      return c.json({ error: 'Invalid token payload' }, 401);
    }

    // Stocker l'utilisateur dans le contexte pour les routes suivantes
    c.set('user', {
      id: decoded.id,
      name: decoded.name,
      avatar: decoded.avatar,
      discriminator: decoded.discriminator,
      access_token: decoded.access_token,
    });

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error instanceof Error) {
      // Token expiré
      if (error.name === 'TokenExpiredError') {
        return c.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401);
      }
      // Token invalide
      if (error.name === 'JsonWebTokenError') {
        return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);
      }
    }

    return c.json({ error: 'Authentication failed' }, 401);
  }
};

/**
 * Middleware optionnel qui essaie d'authentifier mais continue même sans auth
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const cookies = c.req.header('Cookie');

    if (cookies) {
      const cookieMap = cookies.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const token = cookieMap['auth_token'];

      if (token) {
        const decoded = verify(
          token,
          process.env.JWT_SECRET || 'your-secret-key'
        ) as JwtPayload & AuthUser;

        if (decoded.id && decoded.access_token) {
          c.set('user', {
            id: decoded.id,
            name: decoded.name,
            avatar: decoded.avatar,
            discriminator: decoded.discriminator,
            access_token: decoded.access_token,
          });
        }
      }
    }
  } catch (error) {
    // Continuer silencieusement en cas d'erreur
    console.debug('Optional auth failed, continuing without auth');
  }

  await next();
};
