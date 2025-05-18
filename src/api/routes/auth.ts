import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { sign, verify } from 'jsonwebtoken';
import { BotClient } from '../../bot/BotClient';
import { JwtPayload } from 'jsonwebtoken';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}

const auth = new Hono();

// Route de redirection vers Discord OAuth2
auth.get('/discord', (c) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const scope = 'identify email guilds';
  
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&response_type=code&scope=${encodeURIComponent(scope)}`;
  
  return c.redirect(url);
});

// Callback route après l'authentification Discord
auth.get('/discord/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'No code provided' }, 400);
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || '',
      }),
    });

    const { access_token } = await tokenResponse.json() as DiscordTokenResponse;

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user = await userResponse.json() as DiscordUser;

    const token = sign(
      { 
        id: user.id,
        name: user.username,
        avatar: user.avatar,
        discriminator: user.discriminator,
        access_token: access_token
      },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    return c.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  } catch (error) {
    console.error('Authentication error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Middleware JWT pour les routes protégées
// auth.use('*', jwt({
//   secret: process.env.JWT_SECRET || 'your-secret-key',
//   alg: 'HS256'
// }));

// Logout route
auth.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

// Route pour récupérer les serveurs de l'utilisateur
auth.get('/guilds', async (c) => {
  const payload = c.get('jwtPayload');
  console.log('Payload from middleware:', payload);
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    // Décoder le JWT pour obtenir le token d'accès Discord
    const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload & { access_token: string };
    console.log('Decoded JWT:', decoded);
    if (!decoded.access_token) {
      return c.json({ error: 'No Discord access token found' }, 401);
    }

    // Utiliser le token d'accès Discord pour récupérer les serveurs
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${decoded.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch guilds');
    }

    const guilds = await response.json() as any[];

    // Filtrer pour ne garder que les serveurs où l'utilisateur est admin
    const adminGuilds = guilds.filter(guild =>
      guild.owner === true ||
      (typeof guild.permissions === 'string'
        ? (BigInt(guild.permissions) & 0x8n) !== 0n
        : (guild.permissions & 0x8) !== 0)
    );

    return c.json(adminGuilds);
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return c.json({ error: 'Failed to fetch guilds' }, 500);
  }
});

// Route pour récupérer les serveurs où le bot est présent
auth.get('/bot-guilds', async (c) => {
  try {
    const client = BotClient.getInstance();
    const botGuilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon
    }));
    return c.json(botGuilds);
  } catch (error) {
    console.error('Error fetching bot guilds:', error);
    return c.json({ error: 'Failed to fetch bot guilds' }, 500);
  }
});

export { auth }; 