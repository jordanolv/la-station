import { Hono } from 'hono';
import GuildUserModel from '../../features/user/models/guild-user.model';
import { BotClient } from '../../bot/client';
import GuildModel from '../../features/discord/models/guild.model';
import { SuggestionsService } from '../../features/suggestions/services/suggestions.service';
import { GuildService } from '../../features/discord/services/guild.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireGuildPermissions } from '../utils/guild-permissions';

const guilds = new Hono();

// Route publique bot-status (avant authentification)
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

// Route publique leaderboard
guilds.get('/:id/leaderboard', async (c) => {
  try {
    const guildId = c.req.param('id');
    const timeFilter = c.req.query('time') || 'all'; // all, today, week, month
    const sortBy = c.req.query('sortBy') || 'level'; // level, messages, voiceTime

    // Get all users from the guild
    const users = await GuildUserModel.find({ guildId });

    // Calculate today's start
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate week start (Monday)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    // Calculate month start
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Filter and calculate stats based on timeFilter
    const leaderboardData = users.map(user => {
      let messages = user.stats?.totalMsg || 0;
      let voiceTime = user.stats?.voiceTime || 0;
      let messageHistory = user.stats?.messageHistory || [];
      let voiceHistory = user.stats?.voiceHistory || [];

      if (timeFilter === 'today') {
        const todayMsgEntry = user.stats?.messageHistory?.find(entry => {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === today.getTime();
        });
        messages = todayMsgEntry?.count || 0;
        messageHistory = todayMsgEntry ? [todayMsgEntry] : [];

        const todayVoiceEntry = user.stats?.voiceHistory?.find(entry => {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === today.getTime();
        });
        voiceTime = todayVoiceEntry?.time || 0;
        voiceHistory = todayVoiceEntry ? [todayVoiceEntry] : [];
      } else if (timeFilter === 'week') {
        messageHistory = user.stats?.messageHistory?.filter(entry => new Date(entry.date) >= weekStart) || [];
        messages = messageHistory.reduce((sum, entry) => sum + entry.count, 0);

        voiceHistory = user.stats?.voiceHistory?.filter(entry => new Date(entry.date) >= weekStart) || [];
        voiceTime = voiceHistory.reduce((sum, entry) => sum + entry.time, 0);
      } else if (timeFilter === 'month') {
        messageHistory = user.stats?.messageHistory?.filter(entry => new Date(entry.date) >= monthStart) || [];
        messages = messageHistory.reduce((sum, entry) => sum + entry.count, 0);

        voiceHistory = user.stats?.voiceHistory?.filter(entry => new Date(entry.date) >= monthStart) || [];
        voiceTime = voiceHistory.reduce((sum, entry) => sum + entry.time, 0);
      }

      // Calculate hourly activity for this user
      const userHourlyActivity = Array(24).fill(0);
      const relevantHistory = timeFilter === 'today'
        ? messageHistory
        : timeFilter === 'week'
        ? user.stats?.messageHistory?.filter(entry => new Date(entry.date) >= weekStart) || []
        : timeFilter === 'month'
        ? user.stats?.messageHistory?.filter(entry => new Date(entry.date) >= monthStart) || []
        : user.stats?.messageHistory || [];

      relevantHistory.forEach(entry => {
        const date = new Date(entry.date);
        const hour = date.getHours();
        // Add the count to the corresponding hour
        userHourlyActivity[hour] += entry.count;
      });

      // Calculate arcade stats
      const arcadeStats = user.stats?.arcade as any || {};
      const totalArcadeWins = (arcadeStats.shifumi?.wins || 0) +
                               (arcadeStats.puissance4?.wins || 0) +
                               (arcadeStats.morpion?.wins || 0) +
                               (arcadeStats.battle?.wins || 0);
      const totalArcadeLosses = (arcadeStats.shifumi?.losses || 0) +
                                 (arcadeStats.puissance4?.losses || 0) +
                                 (arcadeStats.morpion?.losses || 0) +
                                 (arcadeStats.battle?.losses || 0);

      return {
        discordId: user.discordId,
        name: user.name,
        level: user.profil?.lvl || 0,
        exp: user.profil?.exp || 0,
        messages,
        voiceTime: Math.round(voiceTime / 60), // Convert to minutes
        money: user.profil?.money || 0,
        messageHistory: messageHistory.map(entry => ({
          date: entry.date,
          count: entry.count
        })),
        voiceHistory: voiceHistory.map(entry => ({
          date: entry.date,
          time: Math.round(entry.time / 60) // Convert to minutes
        })),
        hourlyActivity: userHourlyActivity,
        arcade: {
          shifumi: arcadeStats.shifumi || { wins: 0, losses: 0 },
          puissance4: arcadeStats.puissance4 || { wins: 0, losses: 0 },
          morpion: arcadeStats.morpion || { wins: 0, losses: 0 },
          battle: arcadeStats.battle || { wins: 0, losses: 0 },
          totalWins: totalArcadeWins,
          totalLosses: totalArcadeLosses
        }
      };
    });

    // Sort based on sortBy parameter
    leaderboardData.sort((a, b) => {
      if (sortBy === 'level') {
        const lvlDiff = b.level - a.level;
        if (lvlDiff !== 0) return lvlDiff;
        return b.exp - a.exp;
      } else if (sortBy === 'messages') {
        return b.messages - a.messages;
      } else if (sortBy === 'voiceTime') {
        return b.voiceTime - a.voiceTime;
      }
      return 0;
    });

    // Calculate chart data
    const totalMessages = leaderboardData.reduce((sum, u) => sum + u.messages, 0);
    const totalVoiceTime = leaderboardData.reduce((sum, u) => sum + u.voiceTime, 0);
    const avgLevel = leaderboardData.length > 0
      ? leaderboardData.reduce((sum, u) => sum + u.level, 0) / leaderboardData.length
      : 0;

    // Activity distribution (messages by hour)
    const hourlyActivity = Array(24).fill(0);
    if (timeFilter === 'today' || timeFilter === 'all') {
      users.forEach(user => {
        user.stats?.messageHistory?.forEach(entry => {
          const date = new Date(entry.date);
          if (timeFilter === 'today') {
            const entryDate = new Date(date);
            entryDate.setHours(0, 0, 0, 0);
            if (entryDate.getTime() === today.getTime()) {
              const hour = date.getHours();
              hourlyActivity[hour] += entry.count;
            }
          } else if (timeFilter === 'all') {
            // Pour 'all', on compte tous les messages peu importe la date
            const hour = date.getHours();
            hourlyActivity[hour] += entry.count;
          }
        });
      });
    }

    // Level distribution
    const levelDistribution: Record<string, number> = {};
    leaderboardData.forEach(user => {
      const levelRange = `${Math.floor(user.level / 10) * 10}-${Math.floor(user.level / 10) * 10 + 9}`;
      levelDistribution[levelRange] = (levelDistribution[levelRange] || 0) + 1;
    });

    return c.json({
      leaderboard: leaderboardData.slice(0, 100), // Top 100
      stats: {
        totalMembers: users.length,
        totalMessages,
        totalVoiceTime,
        avgLevel: Math.round(avgLevel * 10) / 10,
        activeMembers: leaderboardData.filter(u => u.messages > 0 || u.voiceTime > 0).length
      },
      charts: {
        hourlyActivity,
        levelDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

// Toutes les autres routes nécessitent l'authentification
guilds.use('*', authMiddleware);

// Get available features for a guild
guilds.get('/:id/features', async (c) => {
  try {
    const guildId = c.req.param('id');
    
    // Get guild with all features from centralized model
    const guild = await GuildModel.findOne({ guildId });
    const features = guild?.features || {};

    // Suggestions maintenant dans guild.features
    
    // Define available features with actual status from database
    const featureList = [
      {
        id: 'chat-gaming',
        name: 'Gaming',
        description: 'Créez des jeux communautaires avec des rôles automatiques',
        icon: '🎮',
        enabled: features.chatGaming?.enabled || false
      },
      {
        id: 'leveling',
        name: 'Niveaux',
        description: 'Système de niveaux et d\'expérience pour les membres',
        icon: '📈',
        enabled: features.leveling?.enabled || false
      },
      {
        id: 'voice-channels',
        name: 'Vocal',
        description: 'Gestion automatique des salons vocaux',
        icon: '🔊',
        enabled: features.vocManager?.enabled || false
      },
      {
        id: 'birthday',
        name: 'Anniversaires',
        description: 'Notifications d\'anniversaires automatiques',
        icon: '🎂',
        enabled: features.birthday?.enabled || false
      },
      {
        id: 'suggestions',
        name: 'Suggestions',
        description: 'Système de suggestions avec formulaires et votes',
        icon: '💡',
        enabled: features.suggestions?.enabled || false
      },
      {
        id: 'party',
        name: 'Soirées',
        description: 'Organisez des événements et soirées gaming pour votre communauté',
        icon: '🎉',
        enabled: features.party?.enabled || false
      }
    ];
    
    return c.json({ features: featureList });
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

    // Vérifier les permissions
    const permCheck = await requireGuildPermissions(c, guildId);
    if (permCheck !== true) {
      return permCheck;
    }

    const { enabled } = await c.req.json();

    // Get guild name from Discord if creating new guild
    const client = BotClient.getInstance();
    const discordGuild = client.guilds.cache.get(guildId);
    const guildName = discordGuild?.name || `Guild ${guildId}`;
    
    // Get or create guild
    const guild = await GuildService.getOrCreateGuild(guildId, guildName);
    
    // Initialize features object if not exists
    if (!guild.features) guild.features = {};

    // Update feature status based on featureId
    switch (featureId) {
      case 'chat-gaming':
        if (!guild.features.chatGaming) {
          guild.features.chatGaming = {
            enabled: false,
            channelId: ''
          };
        }
        guild.features.chatGaming.enabled = enabled;
        break;
        
      case 'leveling':
        if (!guild.features.leveling) {
          guild.features.leveling = {
            enabled: false,
            taux: 1,
            notifLevelUp: true,
            channelNotif: null
          };
        }
        guild.features.leveling.enabled = enabled;
        break;
        
      case 'voice-channels':
        if (!guild.features.vocManager) {
          guild.features.vocManager = {
            enabled: false,
            joinChannels: [],
            createdChannels: [],
            channelCount: 0
          };
        }
        guild.features.vocManager.enabled = enabled;
        break;
        
      case 'birthday':
        if (!guild.features.birthday) {
          guild.features.birthday = {
            enabled: false,
            channel: ''
          };
        }
        guild.features.birthday.enabled = enabled;
        break;

      case 'party':
        if (!guild.features.party) {
          guild.features.party = {
            enabled: false,
            channelId: ''
          };
        }
        guild.features.party.enabled = enabled;
        break;
        
      case 'suggestions':
        if (!guild.features.suggestions) {
          guild.features.suggestions = {
            guildId: guildId,
            enabled: false,
            channels: [],
            forms: [],
            defaultReactions: ['👍', '👎']
          };
        }
        guild.features.suggestions.enabled = enabled;
        break;

      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    // Save guild with updated features
    await guild.save();
    
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
    
    // Get guild name from Discord if creating new guild
    const client = BotClient.getInstance();
    const discordGuild = client.guilds.cache.get(guildId);
    const guildName = discordGuild?.name || `Guild ${guildId}`;
    
    const guild = await GuildService.getOrCreateGuild(guildId, guildName);
    let settings: any;
    
    switch (featureId) {
      case 'chat-gaming':
        settings = guild.features?.chatGaming || { enabled: false, channelId: '' };
        break;
      case 'leveling':
        settings = guild.features?.leveling || { enabled: false, taux: 1, notifLevelUp: true, channelNotif: null };
        break;
      case 'voice-channels':
        settings = guild.features?.vocManager || { enabled: false, joinChannels: [], createdChannels: [], channelCount: 0 };
        break;
      case 'birthday':
        settings = guild.features?.birthday || { enabled: false, channel: '' };
        break;
      case 'party':
        settings = guild.features?.party || { enabled: false, channelId: '' };
        break;
      case 'suggestions':
        settings = guild.features?.suggestions || { 
          guildId: guildId,
          enabled: false, 
          channels: [], 
          forms: [], 
          defaultReactions: ['👍', '👎'] 
        };
        break;
      default:
        return c.json({ error: 'Unknown feature' }, 400);
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

    // Vérifier les permissions
    const permCheck = await requireGuildPermissions(c, guildId);
    if (permCheck !== true) {
      return permCheck;
    }

    const updates = await c.req.json();

    // Get guild name from Discord if creating new guild
    const client = BotClient.getInstance();
    const discordGuild = client.guilds.cache.get(guildId);
    const guildName = discordGuild?.name || `Guild ${guildId}`;
    
    const guild = await GuildService.getOrCreateGuild(guildId, guildName);
    if (!guild.features) guild.features = {};

    let updatedSettings: any;
    
    switch (featureId) {
      case 'chat-gaming':
        guild.features.chatGaming = { ...guild.features.chatGaming, ...updates };
        updatedSettings = guild.features.chatGaming;
        break;
      case 'leveling':
        guild.features.leveling = { ...guild.features.leveling, ...updates };
        updatedSettings = guild.features.leveling;
        break;
      case 'voice-channels':
        guild.features.vocManager = { ...guild.features.vocManager, ...updates };
        updatedSettings = guild.features.vocManager;
        break;
      case 'birthday':
        guild.features.birthday = { ...guild.features.birthday, ...updates };
        updatedSettings = guild.features.birthday;
        break;
      case 'party':
        guild.features.party = { ...guild.features.party, ...updates };
        updatedSettings = guild.features.party;
        break;
      case 'suggestions':
        guild.features.suggestions = { ...guild.features.suggestions, ...updates };
        updatedSettings = guild.features.suggestions;
        break;
      default:
        return c.json({ error: 'Unknown feature' }, 400);
    }
    
    await guild.save();
    
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

// Get leveling stats for a guild
guilds.get('/:id/features/leveling/stats', async (c) => {
  try {
    const guildId = c.req.param('id');

    // Récupérer tous les utilisateurs de la guild
    const users = await GuildUserModel.find({ guildId });

    // Calculer les statistiques
    const totalXp = users.reduce((sum, user) => sum + (user.profil?.exp || 0), 0);
    const activeMembers = users.filter(user => (user.profil?.exp || 0) > 0).length;

    // Level ups aujourd'hui (approximation basée sur l'activité récente)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentLevelUps = users.filter(user => {
      // On estime qu'un utilisateur avec beaucoup d'XP a level up récemment
      // C'est une approximation, idéalement on devrait avoir un champ updatedAt
      return (user.profil?.lvl || 0) > 0;
    }).length;

    // Top 10 leaderboard
    const leaderboard = users
      .sort((a, b) => {
        const lvlDiff = (b.profil?.lvl || 0) - (a.profil?.lvl || 0);
        if (lvlDiff !== 0) return lvlDiff;
        return (b.profil?.exp || 0) - (a.profil?.exp || 0);
      })
      .slice(0, 10)
      .map(user => ({
        discordId: user.discordId,
        name: user.name,
        level: user.profil?.lvl || 0,
        exp: user.profil?.exp || 0
      }));

    return c.json({
      stats: {
        totalXp,
        activeMembers,
        levelUpsToday: Math.min(recentLevelUps, 50), // Approximation
        totalMembers: users.length
      },
      leaderboard
    });
  } catch (error) {
    console.error('Error fetching leveling stats:', error);
    return c.json({ error: 'Failed to fetch leveling stats' }, 500);
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
    
    const service = new SuggestionsService();
    const config = await service.createForm(guildId, formData);
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
    
    console.log('Updating form:', { guildId, formId, updates });
    
    const service = new SuggestionsService();
    const config = await service.updateForm(guildId, formId, updates);
    return c.json(config);
  } catch (error) {
    console.error('Error updating form:', error);
    return c.json({ error: 'Failed to update form', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Delete form
guilds.delete('/:id/suggestions/forms/:formId', async (c) => {
  try {
    const guildId = c.req.param('id');
    const formId = c.req.param('formId');
    
    const service = new SuggestionsService();
    const config = await service.deleteForm(guildId, formId);
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
    
    const service = new SuggestionsService();
    const config = await service.addSuggestionChannel(guildId, channelData);
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
    
    const service = new SuggestionsService();
    const config = await service.removeSuggestionChannel(guildId, channelId);
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
    
    const service = new SuggestionsService();
    const suggestions = await service.getSuggestionsByGuild(guildId, limit, skip);
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
    
    const service = new SuggestionsService();
    const suggestion = await service.updateSuggestionStatus(suggestionId, status, undefined, note);
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
    
    const service = new SuggestionsService();
    const messageId = await service.publishSuggestionButton(guild, channelId);
    
    if (!messageId) {
      return c.json({ error: 'Failed to publish button' }, 500);
    }
    
    // Update the channel config with the new button message ID
    const guildDoc = await GuildModel.findOne({ guildId });
    if (guildDoc?.features?.suggestions?.channels) {
      const channelConfig = guildDoc.features.suggestions.channels.find(ch => ch.channelId === channelId);
      if (channelConfig) {
        channelConfig.buttonMessageId = messageId;
        await guildDoc.save();
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

// Get roles for a guild
guilds.get('/:id/roles', async (c) => {
  try {
    const guildId = c.req.param('id');
    const { BotClient } = require('../../bot/client');
    
    const client = BotClient.getInstance();
    if (!client) {
      return c.json({ error: 'Bot client not available' }, 500);
    }

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    // Récupérer les rôles (exclure @everyone et les rôles bot)
    const roles = guild.roles.cache
      .filter(role => role.name !== '@everyone' && !role.managed)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        mentionable: role.mentionable
      }))
      .sort((a, b) => b.position - a.position); // Trier par position (rôles les plus hauts en premier)

    return c.json({ roles });
  } catch (error) {
    console.error('Error fetching guild roles:', error);
    return c.json({ error: 'Failed to fetch roles' }, 500);
  }
});

// Get voice-channels (voc-manager) settings for a guild
guilds.get('/:id/features/voice-channels/settings', async (c) => {
  try {
    const guildId = c.req.param('id');
    const guild = await GuildService.getOrCreateGuild(guildId, '');

    return c.json({
      settings: {
        enabled: guild.features?.vocManager?.enabled || false,
        joinChannels: guild.features?.vocManager?.joinChannels || [],
        createdChannels: guild.features?.vocManager?.createdChannels || [],
        channelCount: guild.features?.vocManager?.channelCount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching voice-channels settings:', error);
    return c.json({ error: 'Failed to fetch voice-channels settings' }, 500);
  }
});

// Update voice-channels (voc-manager) settings
guilds.put('/:id/features/voice-channels/settings', async (c) => {
  try {
    const guildId = c.req.param('id');

    const permCheck = await requireGuildPermissions(c, guildId);
    if (permCheck !== true) {
      return permCheck;
    }

    const { joinChannels, enabled } = await c.req.json();
    const guild = await GuildService.getOrCreateGuild(guildId, '');

    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    if (joinChannels !== undefined) guild.features.vocManager.joinChannels = joinChannels;
    if (enabled !== undefined) guild.features.vocManager.enabled = enabled;

    await guild.save();

    return c.json({
      message: 'Voice-channels settings updated successfully',
      settings: guild.features.vocManager
    });
  } catch (error) {
    console.error('Error updating voice-channels settings:', error);
    return c.json({ error: 'Failed to update voice-channels settings' }, 500);
  }
});

// Get voice stats for a guild
guilds.get('/:id/features/voice-channels/stats', async (c) => {
  try {
    const guildId = c.req.param('id');

    // Get all users from the guild
    const users = await GuildUserModel.find({ guildId });

    // Calculate voice stats
    const totalVoiceTime = users.reduce((sum, user) => sum + (user.stats?.voiceTime || 0), 0);
    const activeVoiceUsers = users.filter(user => (user.stats?.voiceTime || 0) > 0).length;

    // Calculate voice time today from voiceHistory
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const voiceTimeToday = users.reduce((sum, user) => {
      const todayEntry = user.stats?.voiceHistory?.find(entry => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
      });
      return sum + (todayEntry?.time || 0);
    }, 0);

    // Get currently active voice users from Discord
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    let currentActiveUsers = 0;
    let activeChannelsCount = 0;

    if (guild) {
      const voiceStates = guild.voiceStates.cache;
      currentActiveUsers = voiceStates.filter(state => state.channelId).size;

      // Count unique voice channels with users
      const activeChannelIds = new Set(
        Array.from(voiceStates.values())
          .filter(state => state.channelId)
          .map(state => state.channelId)
      );
      activeChannelsCount = activeChannelIds.size;
    }

    // Calculate peak activity hour (simplified - from historical data)
    let peakHour = '8:00 PM';
    const hourlyData: Record<number, number> = {};
    users.forEach(user => {
      user.stats?.voiceHistory?.forEach(entry => {
        const hour = new Date(entry.date).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + entry.time;
      });
    });
    if (Object.keys(hourlyData).length > 0) {
      const peakHourNum = Object.entries(hourlyData).reduce((max, [hour, time]) =>
        time > (hourlyData[max] || 0) ? parseInt(hour) : max
      , 0);
      const isPM = peakHourNum >= 12;
      const displayHour = peakHourNum > 12 ? peakHourNum - 12 : peakHourNum || 12;
      peakHour = `${displayHour}:00 ${isPM ? 'PM' : 'AM'}`;
    }

    // Format total voice time in hours
    const totalVoiceTimeHours = Math.round(totalVoiceTime / 3600);
    const voiceTimeTodayHours = Math.round(voiceTimeToday / 3600);

    return c.json({
      stats: {
        currentActiveUsers,
        totalVoiceTime: totalVoiceTimeHours,
        voiceTimeToday: voiceTimeTodayHours,
        activeChannels: activeChannelsCount,
        peakActivity: peakHour,
        totalMembers: users.length,
        activeVoiceUsers
      }
    });
  } catch (error) {
    console.error('Error fetching voice stats:', error);
    return c.json({ error: 'Failed to fetch voice stats' }, 500);
  }
});

export { guilds }; 