import { Hono } from 'hono';
import { BotClient } from '../../../bot/client';
import { PartyService } from '../services/party.service';
import { PartyUtils } from '../utils/party.utils';
import { ChatGamingService } from '../../chat-gaming/services/chatGaming.service';
import { ImageUploadService } from '../services/imageUpload.service';

const party = new Hono();

// Helpers pour réduire la duplication
const getGuildId = (c: any) => c.req.query('guildId') || process.env.GUILD_ID;

const validateGuildId = (guildId: string | null) => {
  if (!guildId) {
    throw new Error('Guild ID is required');
  }
  return guildId;
};

const handleImageUpload = async (imageFile: File | null): Promise<string | undefined> => {
  return ImageUploadService.uploadImage(imageFile);
};

const handleError = (error: any, operation: string) => {
  console.error(`[PARTY] ${operation}:`, error);
  return { error: `Failed to ${operation.toLowerCase()}` };
};

// Get all events for a guild
party.get('/', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));
    const eventList = await PartyService.getEventsByGuild(guildId);
    return c.json({ events: eventList });
  } catch (error: any) {
    const errorResponse = handleError(error, 'fetch events');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// Create a new event
party.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const name = formData.get('name') as string;
    const game = formData.get('game') as string;
    const gameId = formData.get('gameId') as string; // ID du jeu chat-gaming si sélectionné
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const maxSlots = parseInt(formData.get('maxSlots') as string);
    const channelId = formData.get('channelId') as string;
    const color = formData.get('color') as string || '#FF6B6B';
    const eventImage = formData.get('image') as File;
    const createdBy = formData.get('createdBy') as string;
    const announcementChannelId = formData.get('announcementChannelId') as string;
    
    const guildId = validateGuildId(getGuildId(c));

    // Validation des champs requis
    if (!name || !game || !date || !time || !maxSlots || !channelId || !createdBy) {
      return c.json({ error: 'Tous les champs requis doivent être remplis' }, 400);
    }

    // Protection contre les doubles créations - vérifier si un événement similaire existe déjà (dans les 30 dernières secondes)
    const recentDuplicate = await PartyService.findRecentDuplicate(guildId, name, createdBy);
    if (recentDuplicate) {
      return c.json({ error: 'Un événement similaire vient d\'être créé. Veuillez patienter.' }, 429);
    }

    // Combiner date et time en dateTime
    const dateTime = new Date(`${date}T${time}`);

    // Récupérer les infos du jeu chat-gaming si un gameId est fourni
    let chatGamingGame = null;
    if (gameId && gameId !== 'custom') {
      try {
        chatGamingGame = await ChatGamingService.getGameById(gameId);
      } catch (error) {
        console.error('Error fetching chat-gaming game:', error);
      }
    }

    // Utiliser les données du jeu chat-gaming si disponible, sinon les données custom
    const finalColor = chatGamingGame?.color || color;
    const finalGame = chatGamingGame?.name || game;

    // Validation des données selon la nouvelle structure
    const eventData = {
      eventInfo: {
        name,
        game: finalGame,
        description,
        dateTime,
        maxSlots: parseInt(maxSlots.toString()),
        color: finalColor
      },
      discord: {
        guildId,
        channelId
      },
      participants: [],
      createdBy,
      chatGamingGameId: chatGamingGame?._id?.toString() // Stocker l'ID pour savoir si c'est un jeu chat-gaming  
    };

    const validation = PartyUtils.validateEventData(eventData);
    if (!validation.isValid) {
      return c.json({ error: 'Données invalides', details: validation.errors }, 400);
    }

    // Upload d'image
    const imageUrl = await handleImageUpload(eventImage);

    // Créer l'événement avec intégration Discord
    const client = BotClient.getInstance();
    if (!client) {
      return c.json({ error: 'Bot client not available' }, 500);
    }

    const finalEventData = {
      ...eventData,
      eventInfo: {
        ...eventData.eventInfo,
        image: imageUrl || undefined
      }
    };

    const createdEvent = await PartyService.createEventInDiscord(client, finalEventData, announcementChannelId);
    
    return c.json({ 
      success: true, 
      message: 'Événement créé avec succès', 
      event: createdEvent 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'create event');
    return c.json(errorResponse, error.message === 'Guild ID is required' ? 400 : 500);
  }
});

// Get available chat-gaming games for select menu (DOIT ÊTRE AVANT /:id)
party.get('/games', async (c) => {
  try {
    const guildId = validateGuildId(getGuildId(c));

    const games = await ChatGamingService.getGamesByGuild(guildId);
    
    // Format pour le select menu
    const formattedGames = games.map(game => ({
      id: game._id.toString(),
      name: game.name,
      color: game.color,
      roleId: game.roleId
    }));

    return c.json({ games: formattedGames });
  } catch (error) {
    console.error('Error fetching chat-gaming games:', error);
    return c.json({ error: 'Failed to fetch games' }, 500);
  }
});

// Get a specific event
party.get('/:id', async (c) => {
  try {
    const event = await PartyService.getEventByIdFormatted(c.req.param('id'));
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json({ event });
  } catch (error: any) {
    const errorResponse = handleError(error, 'fetch event');
    return c.json(errorResponse, 500);
  }
});

// Update an event
party.put('/:id', async (c) => {
  try {
    const eventId = c.req.param('id');
    const formData = await c.req.formData();
    
    console.log('[PARTY UPDATE] EventId:', eventId);
    console.log('[PARTY UPDATE] FormData entries:', Object.fromEntries(formData.entries()));
    
    // Récupérer les valeurs du formulaire
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

    // Récupérer les infos du jeu chat-gaming si un gameId est fourni
    let chatGamingGame = null;
    if (gameId && gameId !== 'custom') {
      try {
        chatGamingGame = await ChatGamingService.getGameById(gameId);
      } catch (error) {
        console.error('Error fetching chat-gaming game:', error);
      }
    }

    // Utiliser les données du jeu chat-gaming si disponible, sinon les données custom
    const finalColor = chatGamingGame?.color || color;
    const finalGame = chatGamingGame?.name || game;

    // Construire l'objet de mise à jour
    const updates: any = {};

    // Mettre à jour les champs de eventInfo si fournis
    if (name) updates['eventInfo.name'] = name;
    if (finalGame) updates['eventInfo.game'] = finalGame;
    if (description !== null) updates['eventInfo.description'] = description;
    if (maxSlots) updates['eventInfo.maxSlots'] = parseInt(maxSlots);
    if (finalColor) updates['eventInfo.color'] = finalColor;

    // Combiner date et time en dateTime si fournis
    if (date && time) {
      updates['eventInfo.dateTime'] = new Date(`${date}T${time}`);
    }

    // Mettre à jour les champs Discord si fournis
    if (channelId) updates['discord.channelId'] = channelId;

    // Mettre à jour l'ID du jeu chat-gaming
    if (gameId) {
      updates['chatGamingGameId'] = gameId === 'custom' ? undefined : chatGamingGame?._id?.toString();
    }

    // Gestion de l'image
    const imageUrl = await handleImageUpload(eventImage);
    if (imageUrl) {
      updates['eventInfo.image'] = imageUrl;
    }

    const event = await PartyService.updateEvent(eventId, updates);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Mettre à jour l'embed Discord
    const client = BotClient.getInstance();
    if (client) {
      await PartyService.updateEventEmbed(client, event);
    }

    // Retourner l'événement formaté pour le frontend
    const formattedEvent = await PartyService.getEventByIdFormatted(eventId);
    
    return c.json({ 
      success: true, 
      message: 'Événement mis à jour avec succès', 
      event: formattedEvent 
    });
  } catch (error: any) {
    const errorResponse = handleError(error, 'update event');
    return c.json(errorResponse, 500);
  }
});

// Delete an event
party.delete('/:id', async (c) => {
  try {
    const eventId = c.req.param('id');
    const event = await PartyService.getEventById(eventId);
    
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const deleted = await PartyService.deleteEvent(eventId);
    if (!deleted) {
      return c.json({ error: 'Failed to delete event' }, 500);
    }
    
    return c.json({ success: true, message: 'Événement supprimé avec succès' });
  } catch (error: any) {
    const errorResponse = handleError(error, 'delete event');
    return c.json(errorResponse, 500);
  }
});

// Start an event
party.post('/:id/start', async (c) => {
  try {
    const eventId = c.req.param('id');
    const event = await PartyService.getEventById(eventId);
    
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    if (event.status !== 'pending') {
      return c.json({ error: 'Event has already been started or ended' }, 400);
    }

    await PartyService.updateEvent(eventId, { status: 'started', startedAt: new Date() });
    const formattedEvent = await PartyService.getEventByIdFormatted(eventId);
    
    return c.json({ success: true, message: 'Soirée démarrée avec succès', event: formattedEvent });
  } catch (error: any) {
    const errorResponse = handleError(error, 'start event');
    return c.json(errorResponse, 500);
  }
});

// Get participants info for an event
party.get('/:id/participants', async (c) => {
  try {
    const eventId = c.req.param('id');
    
    const event = await PartyService.getEventById(eventId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Récupérer les informations des participants depuis Discord
    const client = BotClient.getInstance();
    const participantsInfo = [];
    
    const guild = await client.guilds.fetch(event.discord.guildId);
    if (!guild) {
      return c.json({ error: 'Guild not accessible' }, 500);
    }

    for (const participantId of event.participants) {
      try {
        const member = await guild.members.fetch(participantId);
        participantsInfo.push({
          id: participantId,
          name: member.user.username,
          displayName: member.displayName || member.user.displayName
        });
      } catch (error) {
        console.error(`Error fetching Discord user ${participantId}:`, error);
      }
    }

    return c.json({ participants: participantsInfo });
  } catch (error) {
    console.error('Error fetching participants info:', error);
    return c.json({ error: 'Failed to fetch participants info' }, 500);
  }
});

// End an event with attended participants and reward amount
party.post('/:id/end', async (c) => {
  try {
    const eventId = c.req.param('id');
    const body = await c.req.json();
    const { attendedParticipants, rewardAmount, xpAmount } = body;

    const event = await PartyService.getEventById(eventId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    if (event.status !== 'started') {
      return c.json({ error: 'Event must be started before it can be ended' }, 400);
    }

    // Validation des participants présents (doivent être dans la liste des participants)
    if (attendedParticipants && !Array.isArray(attendedParticipants)) {
      return c.json({ error: 'attendedParticipants must be an array' }, 400);
    }

    const invalidParticipants = attendedParticipants?.filter((id: string) => 
      !event.participants.includes(id)
    ) || [];
    
    if (invalidParticipants.length > 0) {
      return c.json({ error: 'Some attended participants are not in the original participants list' }, 400);
    }

    // Validation du montant de récompense
    if (rewardAmount !== undefined && (typeof rewardAmount !== 'number' || rewardAmount < 0)) {
      return c.json({ error: 'rewardAmount must be a positive number' }, 400);
    }

    // Validation du montant d'XP
    if (xpAmount !== undefined && (typeof xpAmount !== 'number' || xpAmount < 0)) {
      return c.json({ error: 'xpAmount must be a positive number' }, 400);
    }

    const updatedEvent = await PartyService.updateEvent(eventId, {
      status: 'ended',
      endedAt: new Date(),
      attendedParticipants: attendedParticipants || [],
      rewardAmount: rewardAmount || 0,
      xpAmount: xpAmount || 0
    });

    if (!updatedEvent) {
      return c.json({ error: 'Failed to end event' }, 500);
    }

    // Supprimer toutes les réactions du message d'événement et renommer le thread
    const client = BotClient.getInstance();
    if (client) {
      await PartyService.removeEventReactions(client, updatedEvent);
      await PartyService.renameEventThreadAsEnded(client, updatedEvent);
    }

    // Distribuer les récompenses aux participants présents
    if (client && attendedParticipants && attendedParticipants.length > 0 && (rewardAmount > 0 || xpAmount > 0)) {
      await PartyService.distributeRewards(client, updatedEvent, attendedParticipants, rewardAmount || 0, xpAmount || 0);
    }

    const formattedEvent = await PartyService.getEventByIdFormatted(eventId);
    
    return c.json({ 
      success: true, 
      message: 'Soirée terminée avec succès', 
      event: formattedEvent 
    });
  } catch (error) {
    console.error('Error ending event:', error);
    return c.json({ error: 'Failed to end event' }, 500);
  }
});

export default party;