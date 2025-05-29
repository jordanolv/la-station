import { Context } from 'hono';
import { GameService } from './game.service';
import { saveGameImage } from './game.utils';

export class GameController {
  /**
   * Récupérer tous les jeux
   */
  static async getAllGames(c: Context) {
    try {
      const guildId = process.env.GUILD_ID;
      if (!guildId) {
        return c.json({ error: 'Guild ID is required' }, 400);
      }

      const games = await GameService.getGamesByGuild(guildId);
      return c.json({ games });
    } catch (error) {
      console.error('Error fetching games:', error);
      return c.json({ error: 'Failed to fetch games' }, 500);
    }
  }

  /**
   * Créer un nouveau jeu
   */
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

      // Gérer le téléchargement d'image si présente
      const imageUrl = await saveGameImage(gameImage);

      const game = await GameService.createGame({
        name: name.toString(),
        description: description?.toString(),
        image: imageUrl,
        color: color.toString(),
        guildId
      });

      return c.json({ message: 'Game created successfully', game });
    } catch (error) {
      console.error('Error creating game:', error);
      return c.json({ error: 'Failed to create game' }, 500);
    }
  }

  /**
   * Récupérer un jeu spécifique
   */
  static async getGameById(c: Context) {
    try {
      const id = c.req.param('id');
      const game = await GameService.getGameById(id);
      
      if (!game) {
        return c.json({ error: 'Game not found' }, 404);
      }

      return c.json({ game });
    } catch (error) {
      console.error('Error fetching game:', error);
      return c.json({ error: 'Failed to fetch game' }, 500);
    }
  }

  /**
   * Mettre à jour un jeu
   */
  static async updateGame(c: Context) {
    try {
      const id = c.req.param('id');
      const updates = await c.req.json();
      
      const game = await GameService.updateGame(id, updates);
      
      if (!game) {
        return c.json({ error: 'Game not found' }, 404);
      }

      return c.json({ message: 'Game updated successfully', game });
    } catch (error) {
      console.error('Error updating game:', error);
      return c.json({ error: 'Failed to update game' }, 500);
    }
  }

  /**
   * Supprimer un jeu
   */
  static async deleteGame(c: Context) {
    try {
      const id = c.req.param('id');
      const game = await GameService.deleteGame(id);
      
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