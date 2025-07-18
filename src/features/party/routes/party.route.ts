import { Hono } from 'hono';
import { BotClient } from '../../../bot/client';
import { PartyService } from '../services/party.service';
import { PartyUtils } from '../utils/party.utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const party = new Hono();

const createUploadsDir = async () => {
  const uploadsDir = path.resolve(__dirname, '../../../uploads');
  try {
    await mkdir(uploadsDir, { recursive: true });
    console.log('Dossier uploads créé/vérifié à:', uploadsDir);
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
  return uploadsDir;
};

// Get all events for a guild
party.get('/', async (c) => {
  try {
    const guildId = c.req.query('guildId') || process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const eventList = await PartyService.getEventsByGuild(guildId);
    return c.json({ events: eventList });
  } catch (error) {
    console.error('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

// Create a new event
party.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const name = formData.get('name') as string;
    const game = formData.get('game') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const maxSlots = parseInt(formData.get('maxSlots') as string);
    const channelId = formData.get('channelId') as string;
    const color = formData.get('color') as string || '#FF6B6B';
    const eventImage = formData.get('image') as File;
    const createdBy = formData.get('createdBy') as string;
    
    const guildId = c.req.query('guildId') || process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    // Combiner date et time en dateTime
    const dateTime = new Date(`${date}T${time}`);

    // Validation des données selon la nouvelle structure
    const eventData = {
      eventInfo: {
        name,
        game,
        description,
        dateTime,
        maxSlots: parseInt(maxSlots.toString()),
        color
      },
      discord: {
        guildId,
        channelId
      },
      participants: [],
      createdBy
    };

    const validation = PartyUtils.validateEventData(eventData);
    if (!validation.isValid) {
      return c.json({ error: 'Données invalides', details: validation.errors }, 400);
    }

    // Gestion de l'upload d'image (même pattern que chat-gaming)
    let imageUrl = undefined;
    if (eventImage && eventImage.size > 0) {
      try {
        const uploadsDir = await createUploadsDir();
        const fileName = `${Date.now()}-${eventImage.name}`;
        const filePath = path.join(uploadsDir, fileName);
        
        console.log('Sauvegarde de l\'image dans:', filePath);
        
        // Convert File to ArrayBuffer and then to Buffer
        const arrayBuffer = await eventImage.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Save the file
        await writeFile(filePath, buffer);
        
        // Create URL for the image (relative to the API root)
        imageUrl = `/uploads/${fileName}`;
        console.log('URL de l\'image:', imageUrl);
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return c.json({ error: 'Failed to upload image' }, 500);
      }
    }

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

    console.log('Creating event in Discord with data:', finalEventData);
    const createdEvent = await PartyService.createEventInDiscord(client, finalEventData);
    console.log('Event created successfully:', createdEvent._id);
    
    return c.json({ 
      success: true, 
      message: 'Événement créé avec succès', 
      event: createdEvent 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

// Get a specific event
party.get('/:id', async (c) => {
  try {
    const eventId = c.req.param('id');
    
    const event = await PartyService.getEventById(eventId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    
    return c.json({ event: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return c.json({ error: 'Failed to fetch event' }, 500);
  }
});

// Update an event
party.put('/:id', async (c) => {
  try {
    const eventId = c.req.param('id');
    const formData = await c.req.formData();
    
    const updates: any = {};
    
    // Récupérer tous les champs possibles
    const fields = ['name', 'game', 'description', 'date', 'time', 'maxSlots', 'channelId', 'color'];
    fields.forEach(field => {
      const value = formData.get(field);
      if (value !== null) {
        if (field === 'date') {
          updates[field] = new Date(value as string);
        } else if (field === 'maxSlots') {
          updates[field] = parseInt(value as string);
        } else {
          updates[field] = value;
        }
      }
    });

    // Gestion de l'image
    const eventImage = formData.get('image') as File;
    if (eventImage && eventImage.size > 0) {
      try {
        const uploadsDir = await createUploadsDir();
        const fileName = `${Date.now()}-${eventImage.name}`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Convert File to ArrayBuffer and then to Buffer
        const arrayBuffer = await eventImage.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Save the file
        await writeFile(filePath, buffer);
        
        // Create URL for the image
        updates.image = `/uploads/${fileName}`;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return c.json({ error: 'Failed to upload image' }, 500);
      }
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
    
    return c.json({ 
      success: true, 
      message: 'Événement mis à jour avec succès', 
      event: event 
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return c.json({ error: 'Failed to update event' }, 500);
  }
});

// Delete an event
party.delete('/:id', async (c) => {
  try {
    const eventId = c.req.param('id');
    
    // Récupérer l'événement avant suppression pour nettoyer Discord
    const event = await PartyService.getEventById(eventId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Supprimer le rôle Discord si il existe
    const client = BotClient.getInstance();
    if (client && event.discord.roleId) {
      try {
        const guild = await client.guilds.fetch(event.discord.guildId);
        const role = await guild.roles.fetch(event.discord.roleId);
        if (role) {
          await role.delete('Événement supprimé');
        }
      } catch (discordError) {
        console.error('Error deleting Discord role:', discordError);
      }
    }

    // Supprimer l'événement de la base de données
    const deleted = await PartyService.deleteEvent(eventId);
    if (!deleted) {
      return c.json({ error: 'Failed to delete event' }, 500);
    }
    
    return c.json({ success: true, message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return c.json({ error: 'Failed to delete event' }, 500);
  }
});

export default party;