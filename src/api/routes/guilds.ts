import { Hono } from 'hono';
import GuildUserModel from '../../features/user/models/guild-user.model'; // Adjust path as needed
import mongoose from 'mongoose';
import { BotClient } from '../../bot/client';
import ChatGamingModel from '../../features/chat-gaming/chatGaming.model';
import LevelingModel from '../../features/leveling/leveling.model';
import VocManagerModel from '../../features/voc-manager/vocManager.model';
import BirthdayModel from '../../features/user/models/birthday.model';
import GuildModel from '../../features/discord/models/guild.model';
import SuggestionsConfigModel from '../../features/suggestions/models/suggestions.model';
import { SuggestionsService } from '../../features/suggestions/suggestions.service';

const guilds = new Hono();

// GET /api/guilds/:guildId/leaderboard
guilds.get('/:guildId/leaderboard', async (c) => {
  const guildId = c.req.param('guildId');

  if (!guildId) {
    c.status(400);
    return c.json({ message: 'Guild ID is required' });
  }

  // Validate if guildId is a valid ObjectId if your guildId in GuildUser is an ObjectId
  // If guildId in GuildUser is a string (like a Discord Snowflake), this check might not be needed
  // or should be a string format check.
  // For this example, let's assume guildId in GuildUser model is a string (Discord ID).

  try {
    const leaderboardData = await GuildUserModel.find({ guildId: guildId })
      .sort({ 'profil.lvl': -1, 'profil.exp': -1 })
      .limit(100) 
      .select('discordId name profil stats.totalMsg stats.voiceTime') // Simplified select for lean
      .lean(); 

    if (!leaderboardData || leaderboardData.length === 0) {
      c.status(404);
      return c.json({ message: 'No leaderboard data found for this guild.' });
    }

    // Transform data to match LeaderboardUser interface from frontend
    const formattedLeaderboard = leaderboardData.map(user => ({
      discordId: user.discordId,
      name: user.name,
      profil: {
        lvl: user.profil.lvl,
        exp: user.profil.exp,
        money: user.profil.money, // Assuming money is part of profil in GuildUser model
      },
      stats: {
        totalMsg: user.stats.totalMsg,
        voiceTime: user.stats.voiceTime,
      }
    }));

    return c.json(formattedLeaderboard);
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      c.status(400);
      return c.json({ message: 'Invalid Guild ID format.' });
    }
    c.status(500);
    return c.json({ message: 'Internal server error' });
  }
});

// Get bot status for a guild
guilds.get('/:id/bot-status', async (c) => {
  try {
    const guildId = c.req.param('id');
    
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    return c.json({
      botPresent: !!guild,
      inviteUrl: guild ? null : `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot&guild_id=${guildId}`
    });
  } catch (error) {
    return c.json({ 
      botPresent: false, 
      inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot&guild_id=${c.req.param('id')}`
    }, 200);
  }
});

// Get available features for a guild
guilds.get('/:id/features', async (c) => {
  try {
    const guildId = c.req.param('id');
    
    // Get actual feature status from database for ALL features
    const [chatGamingSettings, levelingSettings, vocManagerSettings, birthdaySettings, suggestionsSettings] = await Promise.all([
      ChatGamingModel.findOne({ guildId }),
      LevelingModel.findOne({ guildId }),
      VocManagerModel.findOne({ guildId }),
      BirthdayModel.findOne({ guildId }),
      SuggestionsConfigModel.findOne({ guildId })
    ]);
    
    // Define available features with actual status from database
    const features = [
      {
        id: 'chat-gaming',
        name: 'Chat Gaming',
        description: 'Créez des jeux communautaires avec des rôles automatiques',
        icon: '🎮',
        enabled: chatGamingSettings?.enabled || false
      },
      {
        id: 'leveling',
        name: 'Système de niveaux',
        description: 'Système de niveaux et d\'expérience pour les membres',
        icon: '📈',
        enabled: levelingSettings?.enabled || false
      },
      {
        id: 'voice-channels',
        name: 'Salons vocaux',
        description: 'Gestion automatique des salons vocaux',
        icon: '🔊',
        enabled: vocManagerSettings?.enabled || false
      },
      {
        id: 'birthday',
        name: 'Anniversaires',
        description: 'Notifications d\'anniversaires automatiques',
        icon: '🎂',
        enabled: birthdaySettings?.enabled || false
      },
      {
        id: 'suggestions',
        name: 'Système de Suggestions',
        description: 'Système de suggestions avec formulaires et votes',
        icon: '💡',
        enabled: suggestionsSettings?.enabled || false
      }
    ];
    
    return c.json({ features });
  } catch (error) {
    console.error('Error fetching guild features:', error);
    return c.json({ error: 'Failed to fetch features' }, 500);
  }
});

// Toggle feature status
guilds.post('/:id/features/:featureId/toggle', async (c) => {
  try {
    const guildId = c.req.param('id');
    const featureId = c.req.param('featureId');
    const { enabled } = await c.req.json();
    
    // Ensure guild exists in database before updating features
    await GuildModel.findOneAndUpdate(
      { guildId },
      { 
        guildId,
        name: 'Unknown Guild', // Will be updated when bot joins
        $setOnInsert: {
          registeredAt: new Date(),
          config: {
            prefix: '!',
            colors: { primary: '#dac1ff' }
          }
        }
      },
      { upsert: true, new: true }
    );
    
    // Update feature status in database based on featureId
    // Each feature manages its own guild entry
    switch (featureId) {
      case 'chat-gaming':
        if (enabled) {
          // Create/enable chat-gaming for this guild
          await ChatGamingModel.findOneAndUpdate(
            { guildId },
            { 
              guildId,
              enabled: true,
              channelId: '' // Will be set later via commands
            },
            { upsert: true, new: true }
          );
        } else {
          // Disable chat-gaming for this guild
          await ChatGamingModel.findOneAndUpdate(
            { guildId },
            { enabled: false },
            { upsert: true, new: true }
          );
        }
        break;
        
      case 'leveling':
        await LevelingModel.findOneAndUpdate(
          { guildId },
          { 
            guildId,
            enabled,
            taux: 1, // Default XP rate
            notifLevelUp: true, // Default notification enabled
            channelNotif: null // No specific channel by default
          },
          { upsert: true, new: true }
        );
        break;
        
      case 'voice-channels':
        await VocManagerModel.findOneAndUpdate(
          { guildId },
          { 
            guildId,
            enabled,
            joinChannels: [], // Empty join channels array
            createdChannels: [], // Empty created channels array
            channelCount: 0 // Reset channel count
          },
          { upsert: true, new: true }
        );
        break;
        
      case 'birthday':
        await BirthdayModel.findOneAndUpdate(
          { guildId },
          { 
            guildId,
            enabled,
            channel: '' // No specific channel by default
          },
          { upsert: true, new: true }
        );
        break;
        
      case 'suggestions':
        if (enabled) {
          // If enabling, create config if not exists or just update enabled status
          await SuggestionsConfigModel.findOneAndUpdate(
            { guildId },
            { 
              $set: { enabled: true },
              $setOnInsert: {
                guildId,
                channels: [],
                forms: [],
                defaultReactions: ['👍', '👎']
              }
            },
            { upsert: true, new: true }
          );
        } else {
          // If disabling, just update enabled status without touching other fields
          await SuggestionsConfigModel.findOneAndUpdate(
            { guildId },
            { enabled: false },
            { upsert: true, new: true }
          );
        }
        break;
        
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    
    return c.json({ 
      success: true, 
      message: `Feature ${featureId} ${enabled ? 'enabled' : 'disabled'}` 
    });
  } catch (error) {
    return c.json({ error: 'Failed to toggle feature' }, 500);
  }
});

// Get feature settings
guilds.get('/:id/features/:featureId/settings', async (c) => {
  try {
    const guildId = c.req.param('id');
    const featureId = c.req.param('featureId');
    
    let settings: any;
    
    switch (featureId) {
      case 'chat-gaming':
        settings = await ChatGamingModel.findOne({ guildId });
        break;
      case 'leveling':
        settings = await LevelingModel.findOne({ guildId });
        break;
      case 'voice-channels':
        settings = await VocManagerModel.findOne({ guildId });
        break;
      case 'birthday':
        settings = await BirthdayModel.findOne({ guildId });
        break;
      case 'suggestions':
        settings = await SuggestionsConfigModel.findOne({ guildId });
        break;
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    if (!settings) {
      // For suggestions, create default config if not found
      if (featureId === 'suggestions') {
        settings = await SuggestionsConfigModel.create({
          guildId,
          enabled: false,
          channels: [],
          forms: [],
          defaultReactions: ['👍', '👎']
        });
      } else {
        return c.json({ error: 'Feature settings not found' }, 404);
      }
    }
    
    return c.json({ settings });
  } catch (error) {
    return c.json({ error: 'Failed to fetch feature settings' }, 500);
  }
});

// Update feature settings
guilds.put('/:id/features/:featureId/settings', async (c) => {
  try {
    const guildId = c.req.param('id');
    const featureId = c.req.param('featureId');
    const updates = await c.req.json();
    
    let updatedSettings: any;
    
    switch (featureId) {
      case 'chat-gaming':
        updatedSettings = await ChatGamingModel.findOneAndUpdate(
          { guildId },
          { ...updates, guildId },
          { new: true, upsert: true }
        );
        break;
      case 'leveling':
        updatedSettings = await LevelingModel.findOneAndUpdate(
          { guildId },
          { ...updates, guildId },
          { new: true, upsert: true }
        );
        break;
      case 'voice-channels':
        updatedSettings = await VocManagerModel.findOneAndUpdate(
          { guildId },
          { ...updates, guildId },
          { new: true, upsert: true }
        );
        break;
      case 'birthday':
        updatedSettings = await BirthdayModel.findOneAndUpdate(
          { guildId },
          { ...updates, guildId },
          { new: true, upsert: true }
        );
        break;
      case 'suggestions':
        updatedSettings = await SuggestionsConfigModel.findOneAndUpdate(
          { guildId },
          { ...updates, guildId },
          { new: true, upsert: true }
        );
        break;
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    
    return c.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    return c.json({ error: 'Failed to update feature settings' }, 500);
  }
});

// Get Discord channels for a guild
guilds.get('/:id/channels', async (c) => {
  try {
    const guildId = c.req.param('id');
    
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found or bot not present' }, 404);
    }
    
    
    // Get text, voice and forum channels
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0 || channel.type === 2 || channel.type === 15) // TEXT_CHANNEL = 0, VOICE_CHANNEL = 2, GUILD_FORUM = 15
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type === 0 ? 'text' : channel.type === 2 ? 'voice' : 'forum',
        position: channel.position,
        parentId: channel.parentId
      }))
      .sort((a, b) => a.position - b.position);
    
    // Get categories
    const categories = guild.channels.cache
      .filter(channel => channel.type === 4) // GUILD_CATEGORY = 4
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: 'category',
        position: channel.position
      }))
      .sort((a, b) => a.position - b.position);
    
    return c.json({ 
      channels: [...categories, ...channels],
      textChannels: channels.filter(ch => ch.type === 'text'),
      voiceChannels: channels.filter(ch => ch.type === 'voice'),
      forumChannels: channels.filter(ch => ch.type === 'forum'),
      categories 
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch channels' }, 500);
  }
});

// ===== SUGGESTIONS MANAGEMENT ROUTES =====

// Create form
guilds.post('/:id/suggestions/forms', async (c) => {
  try {
    const guildId = c.req.param('id');
    const formData = await c.req.json();
    
    const config = await SuggestionsService.createForm(guildId, formData);
    return c.json(config);
  } catch (error) {
    return c.json({ error: 'Failed to create form' }, 500);
  }
});

// Update form
guilds.put('/:id/suggestions/forms/:formId', async (c) => {
  try {
    const guildId = c.req.param('id');
    const formId = c.req.param('formId');
    const updates = await c.req.json();
    
    const config = await SuggestionsService.updateForm(guildId, formId, updates);
    return c.json(config);
  } catch (error) {
    return c.json({ error: 'Failed to update form' }, 500);
  }
});

// Delete form
guilds.delete('/:id/suggestions/forms/:formId', async (c) => {
  try {
    const guildId = c.req.param('id');
    const formId = c.req.param('formId');
    
    const config = await SuggestionsService.deleteForm(guildId, formId);
    return c.json(config);
  } catch (error) {
    return c.json({ error: 'Failed to delete form' }, 500);
  }
});

// Add channel
guilds.post('/:id/suggestions/channels', async (c) => {
  try {
    const guildId = c.req.param('id');
    const channelData = await c.req.json();
    
    const config = await SuggestionsService.addSuggestionChannel(guildId, channelData);
    return c.json(config);
  } catch (error) {
    return c.json({ error: 'Failed to add channel' }, 500);
  }
});

// Remove channel
guilds.delete('/:id/suggestions/channels/:channelId', async (c) => {
  try {
    const guildId = c.req.param('id');
    const channelId = c.req.param('channelId');
    
    const config = await SuggestionsService.removeSuggestionChannel(guildId, channelId);
    return c.json(config);
  } catch (error) {
    return c.json({ error: 'Failed to remove channel' }, 500);
  }
});

// Get suggestions
guilds.get('/:id/suggestions', async (c) => {
  try {
    const guildId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '20');
    const skip = parseInt(c.req.query('skip') || '0');
    
    const suggestions = await SuggestionsService.getSuggestionsByGuild(guildId, limit, skip);
    return c.json(suggestions);
  } catch (error) {
    return c.json({ error: 'Failed to fetch suggestions' }, 500);
  }
});

// Update suggestion status
guilds.put('/:id/suggestions/:suggestionId/status', async (c) => {
  try {
    const suggestionId = c.req.param('suggestionId');
    const { status, note } = await c.req.json();
    
    const suggestion = await SuggestionsService.updateSuggestionStatus(suggestionId, status, undefined, note);
    return c.json(suggestion);
  } catch (error) {
    return c.json({ error: 'Failed to update suggestion status' }, 500);
  }
});

// Publish suggestion button in a channel
guilds.post('/:id/suggestions/channels/:channelId/publish-button', async (c) => {
  try {
    const guildId = c.req.param('id');
    const channelId = c.req.param('channelId');
    
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }
    
    const messageId = await SuggestionsService.publishSuggestionButton(guild, channelId);
    
    if (!messageId) {
      return c.json({ error: 'Failed to publish button' }, 500);
    }
    
    // Update the channel config with the new button message ID
    const config = await SuggestionsService.getSuggestionsConfig(guildId);
    if (config) {
      const channelConfig = config.channels.find(c => c.channelId === channelId);
      if (channelConfig) {
        channelConfig.buttonMessageId = messageId;
        await config.save();
      }
    }
    
    return c.json({ 
      success: true, 
      messageId,
      message: 'Bouton publié avec succès' 
    });
  } catch (error) {
    return c.json({ error: 'Failed to publish suggestion button' }, 500);
  }
});

export { guilds }; 