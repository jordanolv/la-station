import { Hono } from 'hono';
import { WelcomeService } from '../services/WelcomeService';
import { WelcomeFormatter } from '../services/WelcomeFormatter';

const welcomeRoute = new Hono();

// Helpers pour réduire la duplication
const getGuildId = (c: any): string | null => c.req.param('guildId');

const validateGuildId = (guildId: string | null) => {
  if (!guildId) {
    throw new Error('Guild ID is required');
  }
  return guildId;
};

const handleError = (error: any, operation: string) => {
  console.error(`[WELCOME] ${operation}:`, error);
  return { 
    error: error.message || `Failed to ${operation.toLowerCase()}`,
    details: error.message
  };
};

// GET /api/guilds/:guildId/features/welcome/settings
welcomeRoute.get('/settings', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const config = await WelcomeService.getConfig(guildId);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      settings: formattedConfig,
      templateInfo: WelcomeService.getImageTemplateInfo()
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'fetch welcome settings');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// PUT /api/guilds/:guildId/features/welcome/settings
welcomeRoute.put('/settings', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const body = await c.req.json();
    
    const config = await WelcomeService.updateConfig(guildId, body);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      success: true,
      message: 'Configuration mise à jour avec succès',
      settings: formattedConfig 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'update welcome settings');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// POST /api/guilds/:guildId/features/welcome/toggle
welcomeRoute.post('/toggle', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const { enabled } = await c.req.json();
    
    if (typeof enabled !== 'boolean') {
      return c.json({ error: 'Le paramètre "enabled" doit être un booléen' }, 400);
    }

    const config = await WelcomeService.toggleFeature(guildId, enabled);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      success: true,
      message: `Feature Welcome ${enabled ? 'activée' : 'désactivée'}`,
      settings: formattedConfig 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'toggle welcome feature');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// POST /api/guilds/:guildId/features/welcome/messages
welcomeRoute.post('/messages', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const { welcomeEnabled, goodbyeEnabled, welcomeMessage, goodbyeMessage } = await c.req.json();
    
    const updates: any = {};
    
    // Mise à jour des statuts si fournis
    if (typeof welcomeEnabled === 'boolean') {
      updates.welcomeEnabled = welcomeEnabled;
    }
    if (typeof goodbyeEnabled === 'boolean') {
      updates.goodbyeEnabled = goodbyeEnabled;
    }
    
    // Mise à jour des messages si fournis
    if (welcomeMessage !== undefined) {
      updates.welcomeMessage = welcomeMessage;
    }
    if (goodbyeMessage !== undefined) {
      updates.goodbyeMessage = goodbyeMessage;
    }

    const config = await WelcomeService.updateConfig(guildId, updates);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      success: true,
      message: 'Messages mis à jour avec succès',
      settings: formattedConfig 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'update welcome messages');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// POST /api/guilds/:guildId/features/welcome/channels
welcomeRoute.post('/channels', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const { welcomeChannelId, goodbyeChannelId } = await c.req.json();
    
    const config = await WelcomeService.setChannels(guildId, welcomeChannelId, goodbyeChannelId);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      success: true,
      message: 'Canaux mis à jour avec succès',
      settings: formattedConfig 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'update welcome channels');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// POST /api/guilds/:guildId/features/welcome/auto-roles
welcomeRoute.post('/auto-roles', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const { roleIds } = await c.req.json();
    
    if (!Array.isArray(roleIds)) {
      return c.json({ error: 'roleIds doit être un tableau' }, 400);
    }

    const config = await WelcomeService.updateAutoRoles(guildId, roleIds);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      success: true,
      message: 'Rôles automatiques mis à jour avec succès',
      settings: formattedConfig 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'update auto roles');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// POST /api/guilds/:guildId/features/welcome/images
welcomeRoute.post('/images', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const { generateWelcomeImage, generateGoodbyeImage } = await c.req.json();
    
    const config = await WelcomeService.toggleImageGeneration(guildId, generateWelcomeImage, generateGoodbyeImage);
    const formattedConfig = WelcomeFormatter.formatConfigForAPI(config);
    
    return c.json({ 
      success: true,
      message: 'Configuration des images mise à jour avec succès',
      settings: formattedConfig 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'update image generation');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// GET /api/guilds/:guildId/features/welcome/test
welcomeRoute.get('/test', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const result = await WelcomeService.testConfiguration(guildId);
    
    return c.json(result);
  } catch (error: any) {
    const errorResponse = handleError(error, 'test welcome configuration');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// GET /api/guilds/:guildId/features/welcome/test-image/:type
welcomeRoute.get('/test-image/:type', async (c) => {
  try {
    const type = c.req.param('type') as 'welcome' | 'goodbye';
    
    if (type !== 'welcome' && type !== 'goodbye') {
      return c.json({ error: 'Type doit être "welcome" ou "goodbye"' }, 400);
    }

    const imageBuffer = await WelcomeService.generateTestImage(type);
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="test-${type}.png"`
      }
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'generate test image');
    return c.json(errorResponse, 500);
  }
});

export { welcomeRoute };