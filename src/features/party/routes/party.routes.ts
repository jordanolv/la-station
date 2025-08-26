import { Hono } from 'hono';
import { BotClient } from '../../../bot/client';
import { PartyService } from '../services/party.service';
import { ChatGamingService } from '../../chat-gaming/services/chatGaming.service';
import { PartyError, ValidationError, NotFoundError } from '../services/party.types';
import { DiscordPartyService } from '../services/discord.party.service';
import { PartyRepository } from '../services/party.repository';

const party = new Hono();

const getGuildId = (c: any) => c.req.query('guildId') || process.env.GUILD_ID;

const validateGuildId = (guildId: string | null) => {
  if (!guildId) {
    throw new ValidationError('Guild ID is required');
  }
  return guildId;
};

const handleError = (error: any) => {
  if (error instanceof PartyError) {
    return { error: error.message, statusCode: error.statusCode as any };
  }
  console.error('[PARTY ROUTES] Erreur:', error);
  return { error: 'Erreur interne du serveur', statusCode: 500 as any };
};

// Get all events for a guild
party.get('/', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const service = new PartyService();
    const events = await service.getEventsByGuild(guildId);
    return c.json({ events });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// Create a new event
party.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const guildId = validateGuildId(getGuildId(c));

    const name = formData.get('name') as string;
    const game = formData.get('game') as string;
    const gameId = formData.get('gameId') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const maxSlots = parseInt(formData.get('maxSlots') as string);
    const channelId = formData.get('channelId') as string;
    const color = formData.get('color') as string || '#FF6B6B';
    const eventImage = formData.get('image') as File;
    const createdBy = formData.get('createdBy') as string;
    const announcementChannelId = formData.get('announcementChannelId') as string;

    if (!name || !game || !date || !time || !maxSlots || !channelId || !createdBy) {
      throw new ValidationError('Tous les champs requis doivent être remplis');
    }

    const dateTime = new Date(`${date}T${time}`);

    // Récupérer les infos du jeu chat-gaming si disponible
    let chatGamingGame = null;
    if (gameId && gameId !== 'custom') {
      try {
        chatGamingGame = await ChatGamingService.getGameById(gameId);
      } catch (error) {
        console.error('Erreur récupération jeu chat-gaming:', error);
      }
    }

    const finalColor = chatGamingGame?.color || color;
    const finalGame = chatGamingGame?.name || game;

    const client = BotClient.getInstance();
    if (!client) {
      throw new PartyError('Bot client non disponible', 'BOT_UNAVAILABLE', 500);
    }

    const service = new PartyService();
    const event = await service.createEvent(client, {
      name,
      game: finalGame,
      description,
      dateTime,
      maxSlots,
      image: eventImage as any,
      color: finalColor,
      guildId,
      channelId,
      createdBy,
      chatGamingGameId: chatGamingGame?._id?.toString(),
      announcementChannelId
    });

    return c.json({
      success: true,
      message: 'Événement créé avec succès',
      event
    });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// Get available chat-gaming games
party.get('/games', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const games = await ChatGamingService.getGamesByGuild(guildId);
    
    const formattedGames = games.map(game => ({
      id: game._id.toString(),
      name: game.name,
      color: game.color,
      roleId: game.roleId
    }));

    return c.json({ games: formattedGames });
  } catch (error) {
    console.error('Erreur récupération jeux chat-gaming:', error);
    return c.json({ error: 'Impossible de récupérer les jeux' }, 500);
  }
});

// Get a specific event
party.get('/:id', async (c) => {
  try {
    const service = new PartyService();
    const event = await service.getEventById(c.req.param('id'));
    return c.json({ event });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// Update an event
party.put('/:id', async (c) => {
  try {
    const eventId = c.req.param('id');
    const formData = await c.req.formData();
    
    const name = formData.get('name') as string;
    const game = formData.get('game') as string;
    const gameId = formData.get('gameId') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const maxSlots = formData.get('maxSlots') as string;
    const channelId = formData.get('channelId') as string;
    const color = formData.get('color') as string;
    const eventImage = formData.get('image') as File;

    // Récupérer les infos du jeu chat-gaming si disponible
    let chatGamingGame = null;
    if (gameId && gameId !== 'custom') {
      try {
        chatGamingGame = await ChatGamingService.getGameById(gameId);
      } catch (error) {
        console.error('Erreur récupération jeu chat-gaming:', error);
      }
    }

    const finalColor = chatGamingGame?.color || color;
    const finalGame = chatGamingGame?.name || game;

    const updates: any = {};
    if (name) updates.name = name;
    if (finalGame) updates.game = finalGame;
    if (description !== null) updates.description = description;
    if (maxSlots) updates.maxSlots = parseInt(maxSlots);
    if (finalColor) updates.color = finalColor;
    if (date && time) updates.dateTime = new Date(`${date}T${time}`);
    if (channelId) updates.channelId = channelId;
    if (gameId) updates.chatGamingGameId = gameId === 'custom' ? undefined : chatGamingGame?._id?.toString();
    if (eventImage) updates.image = eventImage as any;

    const service = new PartyService();
    const event = await service.updateEvent(eventId, updates);

    // Mettre à jour l'embed Discord
    const client = BotClient.getInstance();
    if (client) {
      const repository = new PartyRepository();
      const fullEvent = await repository.findById(eventId);
      if (fullEvent) {
        const embed = DiscordPartyService.createEventEmbed(fullEvent, fullEvent.discord.roleId);
        await DiscordPartyService.updateEventMessage(client, fullEvent, embed);
      }
    }

    return c.json({
      success: true,
      message: 'Événement mis à jour avec succès',
      event
    });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// Delete an event
party.delete('/:id', async (c) => {
  try {
    const service = new PartyService();
    await service.deleteEvent(c.req.param('id'));
    return c.json({ success: true, message: 'Événement supprimé avec succès' });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// Start an event
party.post('/:id/start', async (c) => {
  try {
    const service = new PartyService();
    const event = await service.startEvent(c.req.param('id'));
    return c.json({ success: true, message: 'Soirée démarrée avec succès', event });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// Get participants info for an event
party.get('/:id/participants', async (c) => {
  try {
    const client = BotClient.getInstance();
    if (!client) {
      throw new PartyError('Bot client non disponible', 'BOT_UNAVAILABLE', 500);
    }

    const service = new PartyService();
    const participants = await service.getParticipantsInfo(client, c.req.param('id'));
    return c.json({ participants });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

// End an event with rewards
party.post('/:id/end', async (c) => {
  try {
    const eventId = c.req.param('id');
    const body = await c.req.json();
    const { attendedParticipants, rewardAmount, xpAmount } = body;

    const client = BotClient.getInstance();
    if (!client) {
      throw new PartyError('Bot client non disponible', 'BOT_UNAVAILABLE', 500);
    }

    const service = new PartyService();
    const event = await service.endEvent(client, eventId, {
      attendedParticipants: attendedParticipants || [],
      rewardAmount: rewardAmount || 0,
      xpAmount: xpAmount || 0
    });

    return c.json({
      success: true,
      message: 'Soirée terminée avec succès',
      event
    });
  } catch (error: any) {
    const { error: message, statusCode } = handleError(error);
    return c.json({ error: message }, statusCode);
  }
});

export default party;