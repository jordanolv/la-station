import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { BotClient } from '../../bot/client';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AuthContext } from '../middleware/auth.middleware';

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
  console.log('🔍 Route /discord/callback appelée');
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'No code provided' }, 400);
  }

  try {
    // Ajouter un log pour vérifier le JWT_SECRET
    console.log(`JWT_SECRET défini: ${!!process.env.JWT_SECRET}`);
    console.log(`JWT_SECRET (premiers caractères): ${process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 3) + '...' : 'NON DÉFINI'}`);
    
    // Log pour vérifier les paramètres d'authentification envoyés à Discord
    console.log('📝 Paramètres envoyés à Discord:');
    console.log(`- client_id: ${process.env.DISCORD_CLIENT_ID}`);
    console.log(`- client_secret: ${process.env.DISCORD_CLIENT_SECRET ? '****' + process.env.DISCORD_CLIENT_SECRET.substring(process.env.DISCORD_CLIENT_SECRET.length - 4) : 'NON DÉFINI'}`);
    console.log(`- redirect_uri: ${process.env.DISCORD_REDIRECT_URI}`);
    console.log(`- code: ${code.substring(0, 10)}...`);
    
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

    // Log de la réponse brute de Discord
    console.log(`Statut de réponse Discord: ${tokenResponse.status}`);
    const responseText = await tokenResponse.text();
    console.log(`Réponse brute de Discord: ${responseText}`);
    
    // Tentative de parser la réponse JSON
    let tokenData: DiscordTokenResponse;
    try {
      tokenData = JSON.parse(responseText) as DiscordTokenResponse;
    } catch (parseError) {
      console.error('❌ Erreur lors du parsing de la réponse Discord:', parseError);
      return c.json({ error: 'Failed to parse Discord response', details: responseText }, 500);
    }
    
    console.log('✅ Token Discord obtenu:');
    console.log(`- access_token: ${tokenData.access_token ? tokenData.access_token.substring(0, 10) + '...' : 'NON PRÉSENT'}`);
    console.log(`- token_type: ${tokenData.token_type || 'NON PRÉSENT'}`);
    console.log(`- expires_in: ${tokenData.expires_in || 'NON PRÉSENT'}`);
    
    if (!tokenData.access_token) {
      console.error('❌ Erreur: pas d\'access_token dans la réponse Discord');
      return c.json({ 
        error: 'No access token provided by Discord',
        discord_response: tokenData
      }, 500);
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const user = await userResponse.json() as DiscordUser;
    
    // Préparer le payload du JWT
    const jwtPayload = { 
      id: user.id,
      name: user.username,
      avatar: user.avatar,
      discriminator: user.discriminator,
      access_token: tokenData.access_token
    };
    
    console.log('📝 Création du JWT avec payload:');
    console.log('- id:', jwtPayload.id);
    console.log('- name:', jwtPayload.name);
    console.log('- access_token présent:', !!jwtPayload.access_token);

    const token = sign(
      jwtPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' } // Token expire dans 7 jours
    );

    // Définir le cookie httpOnly sécurisé
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = [
      `auth_token=${token}`,
      'HttpOnly',
      isProduction ? 'Secure' : '', // Secure seulement en production (HTTPS)
      'SameSite=Lax',
      `Max-Age=${7 * 24 * 60 * 60}`,
      'Path=/'
    ].filter(Boolean).join('; ')

    c.header('Set-Cookie', cookieOptions)

    // Rediriger sans le token dans l'URL
    return c.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
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

// Route pour récupérer les informations de l'utilisateur actuel
auth.get('/me', authMiddleware, async (c: AuthContext) => {
  const user = c.get('user');

  return c.json({
    id: user.id,
    username: user.name,
    avatar: user.avatar,
    discriminator: user.discriminator
  });
});

// Logout route
auth.post('/logout', (c) => {
  // Supprimer le cookie d'authentification
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieOptions = [
    'auth_token=',
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Lax',
    'Max-Age=0',
    'Path=/'
  ].filter(Boolean).join('; ')

  c.header('Set-Cookie', cookieOptions)
  return c.json({ message: 'Logged out successfully' });
});

// Route pour récupérer les serveurs de l'utilisateur (protégée)
auth.get('/guilds', authMiddleware, async (c: AuthContext) => {
  console.log('🔍 Route /guilds appelée');

  // Récupérer l'utilisateur depuis le contexte (ajouté par le middleware)
  const user = c.get('user');

  try {
    console.log('🔄 Tentative de récupération des guilds depuis Discord API...');
    console.log(`🔑 User ID: ${user.id}`);

    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${user.access_token}`,
      },
    });

    console.log(`📊 Status de la réponse Discord: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Erreur Discord API: ${response.status} - ${errorBody}`);
      return c.json({
        error: 'Discord API error',
        status: response.status,
        details: errorBody
      }, 500);
    }

    const guilds = await response.json() as any[];
    console.log(`✅ Guilds récupérés: ${guilds.length}`);

    // Filtrer pour ne garder que les serveurs où l'utilisateur est admin
    const adminGuilds = guilds.filter(guild =>
      guild.owner === true ||
      (typeof guild.permissions === 'string'
        ? (BigInt(guild.permissions) & 0x8n) !== 0n
        : (guild.permissions & 0x8) !== 0)
    );

    console.log(`👑 Guilds avec droits admin: ${adminGuilds.length}`);

    return c.json(adminGuilds);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des guilds:', error);
    return c.json({
      error: 'Failed to fetch guilds',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
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