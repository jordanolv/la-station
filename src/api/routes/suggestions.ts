import { Hono } from 'hono';
import { BotClient } from '../../bot/client';
import { SuggestionsService } from '../../features/suggestions/suggestions.service';
import { ChannelType } from 'discord.js';

const suggestions = new Hono();

// ===== CONFIGURATION =====

// Get suggestions configuration
suggestions.get('/config/:guildId', async (c) => {
  try {
    const guildId = c.req.param('guildId');
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const config = await SuggestionsService.getSuggestionsConfig(guildId);
    return c.json(config);
  } catch (error) {
    console.error('Error fetching suggestions config:', error);
    return c.json({ error: 'Failed to fetch suggestions config' }, 500);
  }
});

// Toggle feature enabled/disabled
suggestions.put('/config/:guildId/toggle', async (c) => {
  try {
    const guildId = c.req.param('guildId');
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const { enabled } = await c.req.json();

    if (typeof enabled !== 'boolean') {
      return c.json({ error: 'Enabled must be a boolean' }, 400);
    }

    const config = await SuggestionsService.toggleFeature(guildId, enabled);
    return c.json(config);
  } catch (error) {
    console.error('Error toggling suggestions feature:', error);
    return c.json({ error: 'Failed to toggle suggestions feature' }, 500);
  }
});

// Get guild channels (text channels only)
suggestions.get('/config/:guildId/channels', async (c) => {
  try {
    const guildId = c.req.param('guildId');
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    const textChannels = guild.channels.cache
      .filter(channel => channel.type === ChannelType.GuildText)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        position: channel.position
      }))
      .sort((a, b) => a.position - b.position);

    return c.json({ channels: textChannels });
  } catch (error) {
    console.error('Error fetching guild channels:', error);
    return c.json({ error: 'Failed to fetch guild channels' }, 500);
  }
});

// ===== GESTION DES FORMULAIRES =====

// Create a new form
suggestions.post('/config/:guildId/forms', async (c) => {
  try {
    const guildId = c.req.param('guildId');
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const formData = await c.req.json();
    
    if (!formData.name || !formData.fields || !Array.isArray(formData.fields)) {
      return c.json({ error: 'Form name and fields are required' }, 400);
    }

    const config = await SuggestionsService.createForm(guildId, formData);
    return c.json({ 
      message: 'Form created successfully', 
      config 
    });
  } catch (error) {
    console.error('Error creating form:', error);
    return c.json({ error: 'Failed to create form' }, 500);
  }
});

// Update a form
suggestions.put('/forms/:formId', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const formId = c.req.param('formId');
    const updates = await c.req.json();

    const config = await SuggestionsService.updateForm(guildId, formId, updates);
    
    if (!config) {
      return c.json({ error: 'Form not found' }, 404);
    }

    return c.json({ 
      message: 'Form updated successfully', 
      config 
    });
  } catch (error) {
    console.error('Error updating form:', error);
    return c.json({ error: 'Failed to update form' }, 500);
  }
});

// Delete a form
suggestions.delete('/forms/:formId', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const formId = c.req.param('formId');

    const config = await SuggestionsService.deleteForm(guildId, formId);
    
    if (!config) {
      return c.json({ error: 'Form not found' }, 404);
    }

    return c.json({ 
      message: 'Form deleted successfully', 
      config 
    });
  } catch (error) {
    console.error('Error deleting form:', error);
    return c.json({ error: 'Failed to delete form' }, 500);
  }
});

// ===== GESTION DES CHANNELS =====

// Add a suggestion channel
suggestions.post('/channels', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const { channelId, formId, readOnly = true, republishInterval = 4, customReactions, pinButton = false } = await c.req.json();

    if (!channelId || !formId) {
      return c.json({ error: 'Channel ID and form ID are required' }, 400);
    }

    // Verify the channel exists
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return c.json({ error: 'Channel not found or is not a text channel' }, 400);
    }

    // Setup channel permissions
    await SuggestionsService.setupChannelPermissions(guild, channelId, readOnly);

    // Add channel to config
    const config = await SuggestionsService.addSuggestionChannel(guildId, {
      channelId,
      enabled: true,
      formId,
      readOnly,
      republishInterval,
      customReactions: customReactions || ['👍', '👎'],
      pinButton
    });

    // Publish initial button
    const buttonMessageId = await SuggestionsService.publishSuggestionButton(guild, channelId);
    if (buttonMessageId) {
      await SuggestionsService.updateChannelConfig(guildId, channelId, { buttonMessageId });
    }

    return c.json({ 
      message: 'Suggestion channel added successfully', 
      config 
    });
  } catch (error) {
    console.error('Error adding suggestion channel:', error);
    return c.json({ error: 'Failed to add suggestion channel' }, 500);
  }
});

// Update channel configuration
suggestions.put('/channels/:channelId', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const channelId = c.req.param('channelId');
    const updates = await c.req.json();

    const config = await SuggestionsService.updateChannelConfig(guildId, channelId, updates);
    
    if (!config) {
      return c.json({ error: 'Channel configuration not found' }, 404);
    }

    return c.json({ 
      message: 'Channel configuration updated successfully', 
      config 
    });
  } catch (error) {
    console.error('Error updating channel configuration:', error);
    return c.json({ error: 'Failed to update channel configuration' }, 500);
  }
});

// Remove a suggestion channel
suggestions.delete('/channels/:channelId', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const channelId = c.req.param('channelId');

    const config = await SuggestionsService.removeSuggestionChannel(guildId, channelId);
    
    if (!config) {
      return c.json({ error: 'Channel configuration not found' }, 404);
    }

    return c.json({ 
      message: 'Suggestion channel removed successfully', 
      config 
    });
  } catch (error) {
    console.error('Error removing suggestion channel:', error);
    return c.json({ error: 'Failed to remove suggestion channel' }, 500);
  }
});

// Republish button manually
suggestions.post('/channels/:channelId/republish-button', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const channelId = c.req.param('channelId');

    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    const buttonMessageId = await SuggestionsService.publishSuggestionButton(guild, channelId);
    
    if (!buttonMessageId) {
      return c.json({ error: 'Failed to publish button' }, 500);
    }

    // Update config with new button message ID
    await SuggestionsService.updateChannelConfig(guildId, channelId, { buttonMessageId });

    return c.json({ 
      message: 'Button republished successfully',
      buttonMessageId
    });
  } catch (error) {
    console.error('Error republishing button:', error);
    return c.json({ error: 'Failed to republish button' }, 500);
  }
});

// ===== GESTION DES SUGGESTIONS =====

// Get suggestions for guild
suggestions.get('/list', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const skip = (page - 1) * limit;

    const suggestionsList = await SuggestionsService.getSuggestionsByGuild(guildId, limit, skip);
    
    return c.json({ 
      suggestions: suggestionsList,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return c.json({ error: 'Failed to fetch suggestions' }, 500);
  }
});

// Get suggestions for specific channel
suggestions.get('/channels/:channelId/suggestions', async (c) => {
  try {
    const channelId = c.req.param('channelId');
    const limit = parseInt(c.req.query('limit') || '20');

    const suggestionsList = await SuggestionsService.getSuggestionsByChannel(channelId, limit);
    
    return c.json({ suggestions: suggestionsList });
  } catch (error) {
    console.error('Error fetching channel suggestions:', error);
    return c.json({ error: 'Failed to fetch channel suggestions' }, 500);
  }
});

// Update suggestion status (moderation)
suggestions.put('/suggestions/:suggestionId/status', async (c) => {
  try {
    const suggestionId = c.req.param('suggestionId');
    const { status, moderatorId, note } = await c.req.json();

    if (!status) {
      return c.json({ error: 'Status is required' }, 400);
    }

    const suggestion = await SuggestionsService.updateSuggestionStatus(suggestionId, status, moderatorId, note);
    
    if (!suggestion) {
      return c.json({ error: 'Suggestion not found' }, 404);
    }

    return c.json({ 
      message: 'Suggestion status updated successfully', 
      suggestion 
    });
  } catch (error) {
    console.error('Error updating suggestion status:', error);
    return c.json({ error: 'Failed to update suggestion status' }, 500);
  }
});

// Get suggestion details
suggestions.get('/suggestions/:suggestionId', async (c) => {
  try {
    const suggestionId = c.req.param('suggestionId');

    const suggestion = await SuggestionsService.getSuggestion(suggestionId);
    
    if (!suggestion) {
      return c.json({ error: 'Suggestion not found' }, 404);
    }

    return c.json({ suggestion });
  } catch (error) {
    console.error('Error fetching suggestion:', error);
    return c.json({ error: 'Failed to fetch suggestion' }, 500);
  }
});

export default suggestions;