import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { sign } from 'jsonwebtoken';
import { BotClient } from '../../bot/BotClient';

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
        discriminator: user.discriminator
      },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    return c.redirect(`${process.env.FRONTEND_URL}/login?token=${token}`);
  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Middleware JWT pour les routes protégées
auth.use('*', jwt({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  alg: 'HS256'
}));

// Logout route
auth.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

export { auth }; 