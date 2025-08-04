import { Context } from 'hono';
import { ChatGamingService } from '../services/chatGaming.service';
import { BotClient } from '../../../bot/client';
import { ChatGamingError } from '../services/chatGaming.types';

export class ChatGamingController {
  
  private static handleError(error: any) {
    if (error instanceof ChatGamingError) {
      return { error: error.message, statusCode: error.statusCode as any };
    }
    console.error('[CHAT-GAMING CONTROLLER] Erreur:', error);
    return { error: 'Erreur interne du serveur', statusCode: 500 as any };
  }

  static async getAllGames(c: Context) {
    try {
      const guildId = process.env.GUILD_ID;
      if (!guildId) {
        return c.json({ error: 'Guild ID is required' }, 400);
      }

      const service = new ChatGamingService();
      const games = await service.getGamesByGuild(guildId);
      return c.json({ games });
    } catch (error: any) {
      const { error: message, statusCode } = this.handleError(error);
      return c.json({ error: message }, statusCode);
    }
  }

  static async createGame(c: Context) {
    try {
      const formData = await c.req.formData();
      const name = formData.get('gamename');
      const description = formData.get('gamedescription');
      const gameImage = formData.get('gameimage') as File;
      const color = formData.get('gamecolor') || '#55CCFC';
      
      const guildId = process.env.GUILD_ID;
      if (!guildId) {
        return c.json({ error: 'Guild ID is required' }, 400);
      }

      const client = BotClient.getInstance();
      if (!client) {
        return c.json({ error: 'Bot client non disponible' }, 500);
      }

      const service = new ChatGamingService();
      const game = await service.createGame(client, {
        name: name?.toString() || '',
        description: description?.toString(),
        image: gameImage,
        color: color.toString(),
        guildId
      });

      return c.json({
        success: true,
        message: 'Jeu créé avec succès',
        game
      });
    } catch (error: any) {
      const { error: message, statusCode } = this.handleError(error);
      return c.json({ error: message }, statusCode);
    }
  }

  static async getGameById(c: Context) {
    try {
      const id = c.req.param('id');
      const service = new ChatGamingService();
      const game = await service.getGameById(id);
      return c.json({ game });
    } catch (error: any) {
      const { error: message, statusCode } = this.handleError(error);
      return c.json({ error: message }, statusCode);
    }
  }

  static async updateGame(c: Context) {
    try {
      const id = c.req.param('id');
      const updates = await c.req.json();
      
      const service = new ChatGamingService();
      const game = await service.updateGame(id, updates);

      return c.json({
        success: true,
        message: 'Jeu mis à jour avec succès',
        game
      });
    } catch (error: any) {
      const { error: message, statusCode } = this.handleError(error);
      return c.json({ error: message }, statusCode);
    }
  }

  static async deleteGame(c: Context) {
    try {
      const id = c.req.param('id');
      const client = BotClient.getInstance();
      if (!client) {
        return c.json({ error: 'Bot client non disponible' }, 500);
      }

      const service = new ChatGamingService();
      await service.deleteGame(client, id);

      return c.json({
        success: true,
        message: 'Jeu supprimé avec succès'
      });
    } catch (error: any) {
      const { error: message, statusCode } = this.handleError(error);
      return c.json({ error: message }, statusCode);
    }
  }
}