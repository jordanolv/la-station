import { Hono } from 'hono';
import GuildUserModel from '../../features/user/models/guild-user.model'; // Adjust path as needed
import mongoose from 'mongoose';
import { BotClient } from '../../bot/client';
import ChatGamingModel from '../../features/chat-gaming/chatGaming.model';
import LevelingModel from '../../features/leveling/leveling.model';
import VocManagerModel from '../../features/voc-manager/vocManager.model';
import BirthdayModel from '../../features/user/models/birthday.model';
import GuildModel from '../../features/discord/models/guild.model';

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
    console.error('Error fetching leaderboard:', error);
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
    console.error('Error checking bot status:', error);
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
    const [chatGamingSettings, levelingSettings, vocManagerSettings, birthdaySettings] = await Promise.all([
      ChatGamingModel.findOne({ guildId }),
      LevelingModel.findOne({ guildId }),
      VocManagerModel.findOne({ guildId }),
      BirthdayModel.findOne({ guildId })
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
        
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    console.log(`Feature ${featureId} ${enabled ? 'enabled' : 'disabled'} for guild ${guildId}`);
    
    return c.json({ 
      success: true, 
      message: `Feature ${featureId} ${enabled ? 'enabled' : 'disabled'}` 
    });
  } catch (error) {
    console.error('Error toggling feature:', error);
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
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    if (!settings) {
      return c.json({ error: 'Feature settings not found' }, 404);
    }
    
    return c.json({ settings });
  } catch (error) {
    console.error('Error fetching feature settings:', error);
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
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    console.log(`Settings updated for feature ${featureId} in guild ${guildId}`);
    
    return c.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating feature settings:', error);
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
    
    // Debug: Log all channel types
    console.log('Channels in guild:', guild.name);
    guild.channels.cache.forEach(channel => {
      console.log(`Channel: ${channel.name}, Type: ${channel.type}`);
    });
    
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
    console.error('Error fetching guild channels:', error);
    return c.json({ error: 'Failed to fetch channels' }, 500);
  }
});

export { guilds }; 