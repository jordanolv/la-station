<<<<<<< Updated upstream
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { sign, verify } from 'jsonwebtoken';
import { BotClient } from '../../bot/BotClient';
import { JwtPayload } from 'jsonwebtoken';
=======
import { Hono } from 'hono'
import { initAuthConfig, authHandler } from '@hono/auth-js'
import Discord from '@auth/core/providers/discord'
>>>>>>> Stashed changes

export const auth = new Hono()

<<<<<<< Updated upstream
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
=======
auth.use(
  '*',
  initAuthConfig((c) => ({
    basePath: "/api/auth",
    secret: process.env.AUTH_SECRET!,
    providers: [
      Discord({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
>>>>>>> Stashed changes
      }),
    ],
  }))
)

<<<<<<< Updated upstream
    const tokenData = await tokenResponse.json() as DiscordTokenResponse;
    console.log('✅ Token Discord obtenu:');
    console.log(`- access_token: ${tokenData.access_token ? tokenData.access_token.substring(0, 10) + '...' : 'NON PRÉSENT'}`);
    console.log(`- token_type: ${tokenData.token_type || 'NON PRÉSENT'}`);
    console.log(`- expires_in: ${tokenData.expires_in || 'NON PRÉSENT'}`);
    
    if (!tokenData.access_token) {
      console.error('❌ Erreur: pas d\'access_token dans la réponse Discord');
      return c.json({ error: 'No access token provided by Discord' }, 500);
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
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // Vérifier le JWT juste après l'avoir créé
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload & { access_token: string };
      console.log('✅ JWT vérifié immédiatement après création:');
      console.log('- id:', decoded.id);
      console.log('- access_token présent:', !!decoded.access_token);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du JWT créé:', error);
    }

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
    
    // Décodage sans vérification pour voir le contenu
    try {
      const decodedWithoutVerify = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('📄 Contenu du JWT (sans vérification):');
      console.log(JSON.stringify(decodedWithoutVerify, null, 2));
      console.log('Access token présent dans le JWT non vérifié:', !!decodedWithoutVerify.access_token);
    } catch (err) {
      console.error('❌ Erreur lors du décodage sans vérification:', err);
    }
    
    // Décodage avec vérification (normal)
    const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload & { access_token: string };
    console.log('✅ Token JWT vérifié avec succès');
    console.log('📄 Contenu du JWT après vérification:');
    console.log(JSON.stringify(decoded, null, 2));
    
    if (!decoded.access_token) {
      console.log('❌ Access token Discord non trouvé dans le JWT');
      return c.json({ error: 'No Discord access token found' }, 401);
    }
    
    console.log(`🔑 Access token Discord (premiers caractères): ${decoded.access_token.substring(0, 10)}...`);

    // Utiliser le token d'accès Discord pour récupérer les serveurs
    try {
      console.log('🔄 Tentative de récupération des guilds depuis Discord API...');
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${decoded.access_token}`,
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
    } catch (fetchError) {
      console.error('❌ Erreur lors de la requête vers Discord API:', fetchError);
      return c.json({ 
        error: 'Failed to communicate with Discord API',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, 500);
    }
  } catch (error) {
    console.error('❌ Erreur de vérification du token:', error);
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
=======
auth.use('*', authHandler())
>>>>>>> Stashed changes
