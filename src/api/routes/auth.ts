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
  console.log('🔍 Route /discord appelée');
  
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const scope = 'identify email guilds';
  
  console.log('📋 Variables d\'environnement:');
  console.log(`- DISCORD_CLIENT_ID: ${clientId || 'NON DÉFINI'}`);
  console.log(`- DISCORD_REDIRECT_URI: ${redirectUri || 'NON DÉFINI'}`);
  
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&response_type=code&scope=${encodeURIComponent(scope)}`;
  
  console.log(`🔀 Redirection vers: ${url}`);
  
  return c.redirect(url);
});

// Callback route après l'authentification Discord
auth.get('/discord/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'No code provided' }, 400);
  }

  try {
    // Ajouter un log pour vérifier le JWT_SECRET
    console.log(`JWT_SECRET défini: ${!!process.env.JWT_SECRET}`);
    console.log(`JWT_SECRET (premiers caractères): ${process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 3) + '...' : 'NON DÉFINI'}`);
    
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
  console.log('🔍 Route /guilds appelée');
  
  // Log tous les headers pour déboguer
  console.log('📋 Headers reçus:');
  const headers = Object.fromEntries(
    [...c.req.raw.headers.entries()].map(([key, value]) => [key, value])
  );
  console.log(headers);
  
  const auth_header = c.req.header('Authorization');
  console.log(`📝 Authorization header: ${auth_header || 'NON PRÉSENT'}`);
  
  const token = auth_header?.split(' ')[1];
  console.log(`🎟️ Token extrait: ${token ? token.substring(0, 10) + '...' : 'AUCUN'}`);
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    // Décoder le JWT pour obtenir le token d'accès Discord
    console.log(`🔑 JWT_SECRET défini: ${!!process.env.JWT_SECRET}`);
    const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload & { access_token: string };
    console.log('✅ Token vérifié avec succès');
    
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