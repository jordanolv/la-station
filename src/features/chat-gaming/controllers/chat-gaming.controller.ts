import { Context } from 'hono';
import { ChatGamingService } from '../services/chatGaming.service';
import { ImageUploadService } from '../../../shared/services/ImageUploadService';
import { BotClient } from '../../../bot/client';

export class ChatGamingController {
  
  static async getAllGames(c: Context) {
    try {
      const guildId = process.env.GUILD_ID;
      if (!guildId) {
        return c.json({ error: 'Guild ID is required' }, 400);
      }

      const games = await ChatGamingService.getGamesByGuild(guildId);
      return c.json({ games });
    } catch (error) {
      console.error('Error fetching games:', error);
      return c.json({ error: 'Failed to fetch games' }, 500);
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

      if (!name) {
        return c.json({ error: 'Game name is required' }, 400);
      }

      // Upload image vers Cloudinary si présente
      const imageUrl = gameImage ? await ImageUploadService.uploadGameImage(gameImage) : undefined;
      console.log('[CHAT-GAMING] Image URL from Cloudinary:', imageUrl);

      const game = await ChatGamingService.createGame({
        name: name.toString(),
        description: description?.toString(),
        image: imageUrl,
        color: color.toString(),
        guildId
      });

      // Intégration Discord
      try {
        const client = BotClient.getInstance();
        const guild = client.guilds.cache.get(guildId);
        
        if (guild) {
          await ChatGamingService.createGameInDiscord(game, guild);
        }
      } catch (error) {
        console.error('Error creating game in Discord:', error);
      }

      return c.json({ message: 'Game created successfully', game });
    } catch (error) {
      console.error('Error creating game:', error);
      return c.json({ error: 'Failed to create game' }, 500);
    }
  }

  static async getGameById(c: Context) {
    try {
      const id = c.req.param('id');
      const game = await ChatGamingService.getGameById(id);
      
      if (!game) {
        return c.json({ error: 'Game not found' }, 404);
      }

      return c.json({ game });
    } catch (error) {
      console.error('Error fetching game:', error);
      return c.json({ error: 'Failed to fetch game' }, 500);
    }
  }

  static async updateGame(c: Context) {
    try {
      const id = c.req.param('id');
      const updates = await c.req.json();
      
      const game = await ChatGamingService.updateGame(id, updates);
      
      if (!game) {
        return c.json({ error: 'Game not found' }, 404);
      }

      return c.json({ message: 'Game updated successfully', game });
    } catch (error) {
      console.error('Error updating game:', error);
      return c.json({ error: 'Failed to update game' }, 500);
    }
  }

  static async deleteGame(c: Context) {
    try {
      const id = c.req.param('id');
      const game = await ChatGamingService.deleteGame(id);
      
      if (!game) {
        return c.json({ error: 'Game not found' }, 404);
      }

      return c.json({ message: 'Game deleted successfully' });
    } catch (error) {
      console.error('Error deleting game:', error);
      return c.json({ error: 'Failed to delete game' }, 500);
    }
  }
}