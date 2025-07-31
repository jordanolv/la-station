import { Hono } from 'hono';
import { ChatGamingController } from '../controllers/chat-gaming.controller';

const chatGaming = new Hono();

// Get all games
chatGaming.get('/', ChatGamingController.getAllGames);

// Create a new game
chatGaming.post('/', ChatGamingController.createGame);

// Get a specific game
chatGaming.get('/:id', ChatGamingController.getGameById);

// Update a game
chatGaming.put('/:id', ChatGamingController.updateGame);

// Delete a game
chatGaming.delete('/:id', ChatGamingController.deleteGame);

export default chatGaming;