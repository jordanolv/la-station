import { Hono } from 'hono';
import { TemplateRenderService } from '../../shared/template-render.service';
import { MeTemplateService } from '../../features/user/services/me-template.service';
import path from 'path';
import fs from 'fs';

const canva = new Hono();

/**
 * GET /canva
 * Liste tous les templates disponibles
 */
canva.get('/', async (c) => {
  try {
    const templates = TemplateRenderService.listTemplates();
    const templateDetails = templates.map(name => {
      try {
        const config = TemplateRenderService.loadTemplateConfig(name);
        return {
          name: config.name,
          description: config.description || '',
          dimensions: config.dimensions,
          previewUrl: `/canva/${name}/preview`,
        };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

    return c.json({
      success: true,
      templates: templateDetails,
    });
  } catch (error) {
    console.error('[Canva API] Error listing templates:', error);
    return c.json({
      success: false,
      error: 'Failed to list templates',
    }, 500);
  }
});

/**
 * GET /canva/:templateName
 * Récupère la configuration d'un template
 */
canva.get('/:templateName', async (c) => {
  try {
    const templateName = c.req.param('templateName');
    const config = TemplateRenderService.loadTemplateConfig(templateName);

    return c.json({
      success: true,
      config,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: `Template not found: ${c.req.param('templateName')}`,
    }, 404);
  }
});

/**
 * GET /canva/:templateName/preview
 * Génère un preview du template avec les données de test
 */
canva.get('/:templateName/preview', async (c) => {
  try {
    const templateName = c.req.param('templateName');

    // Pour le template "me", utiliser le service spécifique avec tous les overlays
    if (templateName === 'me') {
      // Générer des données de voiceHistory pour les 14 derniers jours (7 jours actuels + 7 jours précédents)
      const today = new Date();
      const voiceHistory = [];

      for (let i = 14; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        // Générer des temps aléatoires entre 2h et 4h (7200-14400 secondes)
        const time = Math.floor(Math.random() * 7200) + 7200;
        voiceHistory.push({
          date: date.toISOString(),
          time: time,
        });
      }

      const { buffer } = await MeTemplateService.generate({
        discordUser: {
          username: 'jordan.',
          displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
        },
        guildUser: {
          profil: { lvl: 35, exp: 15000, money: 224 },
          stats: {
            totalMsg: 5239,
            voiceTime: 136800, // 38h en secondes
            dailyStreak: 2,
            voiceHistory: voiceHistory,
            lastActivityDate: new Date('2025-10-18')
          },
          infos: {
            birthDate: new Date('1996-10-05'),
            registeredAt: new Date('2025-04-14')
          },
          bio: 'Développeur passionné par les montagnes',
        } as any,
        guildName: 'THE RIDGE',
        roles: [
          { name: '🏔️ Légende du ridge', color: '#f1c40f' },
          { name: '🔍 Scout', color: '#e67e22' },
          { name: '🏕️ Campeur du dimanche', color: '#9b59b6' },
          { name: '🎯 habbo', color: '#f39c12' },
          { name: 'test', color: '#3498db' },
          { name: 'aa', color: '#1abc9c' },
          { name: 'lslsl', color: '#e74c3c' },
          { name: 'aloig', color: '#95a5a6' },
          { name: 'qc', color: '#34495e' },
          { name: 'fifa', color: '#16a085' },
          { name: 'dddd', color: '#c0392b' },
          { name: 'fifaaaa', color: '#2c3e50' },
          { name: 'test', color: '#27ae60' },
          { name: 'the ridge', color: '#d35400' },
          { name: 'fifa', color: '#2980b9' },
          { name: 'aaa', color: '#8e44ad' },
        ],
      });

      const outputPath = path.resolve(process.cwd(), 'canva/output', `${templateName}-preview.png`);
      fs.writeFileSync(outputPath, buffer);

      c.header('Content-Type', 'image/png');
      c.header('Cache-Control', 'no-cache');
      return c.body(buffer);
    }

    // Pour les autres templates, utiliser le service générique
    const config = TemplateRenderService.loadTemplateConfig(templateName);
    const testData = config.testData || {};
    const renderData = {
      ...testData,
      avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
      xpPercent: 0.65,
    };

    const buffer = await TemplateRenderService.render(templateName, renderData);
    const outputPath = path.resolve(process.cwd(), 'canva/output', `${templateName}-preview.png`);
    fs.writeFileSync(outputPath, buffer);

    c.header('Content-Type', 'image/png');
    c.header('Cache-Control', 'no-cache');
    return c.body(buffer);
  } catch (error) {
    console.error('[Canva API] Error rendering preview:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to render preview',
    }, 500);
  }
});

/**
 * POST /canva/:templateName/render
 * Génère une image avec des données personnalisées
 */
canva.post('/:templateName/render', async (c) => {
  try {
    const templateName = c.req.param('templateName');
    const body = await c.req.json();

    const buffer = await TemplateRenderService.render(templateName, body);

    c.header('Content-Type', 'image/png');
    c.header('Cache-Control', 'no-cache');
    return c.body(buffer);
  } catch (error) {
    console.error('[Canva API] Error rendering template:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to render template',
    }, 500);
  }
});

export default canva;
