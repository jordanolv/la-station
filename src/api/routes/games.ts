import { Hono } from 'hono';
import { BotClient } from '../../bot/BotClient';
import { GameService } from '../../database/services/GameService';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const games = new Hono();

// Ensure uploads directory exists
const createUploadsDir = async () => {
  // Remonter à la racine du projet (3 niveaux au-dessus de src/api/routes)
  const uploadsDir = path.resolve(__dirname, '../../../uploads');
  try {
    await mkdir(uploadsDir, { recursive: true });
    console.log('Dossier uploads créé/vérifié à:', uploadsDir);
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
  return uploadsDir;
};

// Get all games
games.get('/', async (c) => {
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
});

// Create a new game
games.post('/', async (c) => {
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

    // Handle image upload if present
    let imageUrl = undefined;
    if (gameImage && gameImage.size > 0) {
      const uploadsDir = await createUploadsDir();
      const fileName = `${Date.now()}-${gameImage.name}`;
      const filePath = path.join(uploadsDir, fileName);
      
      console.log('Sauvegarde de l\'image dans:', filePath);
      
      // Convert File to ArrayBuffer and then to Buffer
      const arrayBuffer = await gameImage.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Save the file
      await writeFile(filePath, buffer);
      
      // Create URL for the image (relative to the API root)
      imageUrl = `/uploads/${fileName}`;
      console.log('URL de l\'image:', imageUrl);
    }

    const game = await GameService.createGame({
      name: name.toString(),
      description: description?.toString(),
      image: imageUrl,
      color: color.toString(),
      guildId
    });

    // TODO: Implement game creation with Discord bot if needed
    // client.emit('gameCreate', game, guild, client);

    return c.json({ message: 'Game created successfully', game });
  } catch (error) {
    console.error('Error creating game:', error);
    return c.json({ error: 'Failed to create game' }, 500);
  }
});

// Get a specific game
games.get('/:id', async (c) => {
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
});

// Update a game
games.put('/:id', async (c) => {
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
});

// Delete a game
games.delete('/:id', async (c) => {
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
});

export { games }; 