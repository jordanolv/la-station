import { Hono } from 'hono';
import { BotClient } from '../../bot/client';
import { VocManagerService, MountainInfo } from '../../features/voc-manager/services/vocManager.service';
import { ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

const vocManager = new Hono();

// Get voc-manager configuration
vocManager.get('/', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const vocManagerData = await VocManagerService.getVocManager(guildId);
    return c.json({ vocManager: vocManagerData });
  } catch (error) {
    console.error('Error fetching voc-manager config:', error);
    return c.json({ error: 'Failed to fetch voc-manager config' }, 500);
  }
});

// Get guild channels and categories
vocManager.get('/channels', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    const categories = guild.channels.cache
      .filter(channel => channel.type === ChannelType.GuildCategory)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        position: channel.position
      }))
      .sort((a, b) => a.position - b.position);

    const voiceChannels = guild.channels.cache
      .filter(channel => channel.type === ChannelType.GuildVoice)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        position: channel.position
      }))
      .sort((a, b) => a.position - b.position);

    const textChannels = guild.channels.cache
      .filter(channel => channel.type === ChannelType.GuildText)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        position: channel.position
      }))
      .sort((a, b) => a.position - b.position);

    return c.json({ categories, voiceChannels, textChannels });
  } catch (error) {
    console.error('Error fetching guild channels:', error);
    return c.json({ error: 'Failed to fetch guild channels' }, 500);
  }
});

// Create a new join channel
vocManager.post('/join-channel', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const { channelId, category, nameTemplate } = await c.req.json();

    if (!channelId || !category) {
      return c.json({ error: 'Channel ID and category are required' }, 400);
    }

    // Verify the channel exists and is a voice channel
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return c.json({ error: 'Channel not found or is not a voice channel' }, 400);
    }

    const categoryChannel = guild.channels.cache.get(category);
    if (!categoryChannel || categoryChannel.type !== ChannelType.GuildCategory) {
      return c.json({ error: 'Category not found or is not a category channel' }, 400);
    }

    // Add the join channel
    const updatedVocManager = await VocManagerService.addJoinChannel(
      guildId,
      channelId,
      category,
      nameTemplate || '🎮 {username} #{count}'
    );

    if (!updatedVocManager) {
      return c.json({ error: 'Failed to add join channel' }, 500);
    }

    return c.json({ 
      message: 'Join channel added successfully', 
      vocManager: updatedVocManager 
    });
  } catch (error) {
    console.error('Error adding join channel:', error);
    return c.json({ error: 'Failed to add join channel' }, 500);
  }
});

// Remove a join channel
vocManager.delete('/join-channel/:channelId', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const channelId = c.req.param('channelId');

    const updatedVocManager = await VocManagerService.removeJoinChannel(guildId, channelId);

    if (!updatedVocManager) {
      return c.json({ error: 'Failed to remove join channel' }, 500);
    }

    return c.json({ 
      message: 'Join channel removed successfully', 
      vocManager: updatedVocManager 
    });
  } catch (error) {
    console.error('Error removing join channel:', error);
    return c.json({ error: 'Failed to remove join channel' }, 500);
  }
});

// Update join channel settings
vocManager.put('/join-channel/:channelId', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const channelId = c.req.param('channelId');
    const { nameTemplate, category } = await c.req.json();

    const updatedVocManager = await VocManagerService.updateJoinChannelSettings(
      guildId,
      channelId,
      nameTemplate,
      category
    );

    if (!updatedVocManager) {
      return c.json({ error: 'Failed to update join channel settings' }, 500);
    }

    return c.json({ 
      message: 'Join channel settings updated successfully', 
      vocManager: updatedVocManager 
    });
  } catch (error) {
    console.error('Error updating join channel settings:', error);
    return c.json({ error: 'Failed to update join channel settings' }, 500);
  }
});

// Toggle feature enabled/disabled
vocManager.put('/toggle', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const { enabled } = await c.req.json();

    if (typeof enabled !== 'boolean') {
      return c.json({ error: 'Enabled must be a boolean' }, 400);
    }

    const updatedVocManager = await VocManagerService.toggleFeature(guildId, enabled);

    if (!updatedVocManager) {
      return c.json({ error: 'Failed to toggle feature' }, 500);
    }

    return c.json({
      message: `Feature ${enabled ? 'enabled' : 'disabled'} successfully`,
      vocManager: updatedVocManager
    });
  } catch (error) {
    console.error('Error toggling feature:', error);
    return c.json({ error: 'Failed to toggle feature' }, 500);
  }
});

// Update notification channel
vocManager.put('/notification-channel', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const { channelId } = await c.req.json();

    // Validate channel exists and is text-based
    if (channelId) {
      const client = BotClient.getInstance();
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        return c.json({ error: 'Guild not found' }, 404);
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return c.json({ error: 'Channel not found' }, 400);
      }

      if (!channel.isTextBased()) {
        return c.json({ error: 'Channel must be a text channel' }, 400);
      }
    }

    const updatedVocManager = await VocManagerService.updateNotificationChannel(guildId, channelId);

    if (!updatedVocManager) {
      return c.json({ error: 'Failed to update notification channel' }, 500);
    }

    return c.json({
      message: 'Notification channel updated successfully',
      vocManager: updatedVocManager
    });
  } catch (error) {
    console.error('Error updating notification channel:', error);
    return c.json({ error: 'Failed to update notification channel' }, 500);
  }
});

// Create a voice channel manually
vocManager.post('/create-channel', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const { name, categoryId, userLimit, bitrate } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Channel name is required' }, 400);
    }

    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return c.json({ error: 'Guild not found' }, 404);
    }

    // Verify category exists if provided
    if (categoryId) {
      const category = guild.channels.cache.get(categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        return c.json({ error: 'Category not found or is not a category channel' }, 400);
      }
    }

    // Get current channel count for naming
    const vocManagerData = await VocManagerService.getOrCreateVocManager(guildId);
    const channelNumber = vocManagerData.channelCount + 1;
    
    // Replace placeholders in name
    const finalName = name
      .replace('{count}', channelNumber.toString())
      .replace('{total}', channelNumber.toString());

    // Create the channel
    const newChannel = await guild.channels.create({
      name: finalName,
      type: ChannelType.GuildVoice,
      parent: categoryId || null,
      userLimit: userLimit || 0,
      bitrate: bitrate || 64000,
      reason: 'Channel created via web interface'
    });

    // Add to created channels
    await VocManagerService.addChannel(guildId, newChannel.id);

    return c.json({ 
      message: 'Voice channel created successfully', 
      channel: {
        id: newChannel.id,
        name: newChannel.name,
        categoryId: newChannel.parentId,
        userLimit: newChannel.userLimit,
        bitrate: newChannel.bitrate
      }
    });
  } catch (error) {
    console.error('Error creating voice channel:', error);
    return c.json({ error: 'Failed to create voice channel' }, 500);
  }
});

// Get statistics
vocManager.get('/stats', async (c) => {
  try {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      return c.json({ error: 'Guild ID is required' }, 400);
    }

    const vocManagerData = await VocManagerService.getVocManager(guildId);
    
    if (!vocManagerData) {
      return c.json({ 
        totalChannelsCreated: 0,
        activeChannels: 0,
        joinChannels: 0,
        enabled: false
      });
    }

    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    
    let activeChannels = 0;
    if (guild) {
      activeChannels = vocManagerData.createdChannels.filter(channelId => {
        const channel = guild.channels.cache.get(channelId);
        return channel && channel.type === ChannelType.GuildVoice;
      }).length;
    }

    return c.json({
      totalChannelsCreated: vocManagerData.channelCount,
      activeChannels,
      joinChannels: vocManagerData.joinChannels.length,
      enabled: vocManagerData.enabled
    });
  } catch (error) {
    console.error('Error fetching voc-manager stats:', error);
    return c.json({ error: 'Failed to fetch voc-manager stats' }, 500);
  }
});

// ============ MOUNTAINS MANAGEMENT ============

// Get all mountains
vocManager.get('/mountains', async (c) => {
  try {
    const mountains = VocManagerService.getAllMountains();
    return c.json({ mountains });
  } catch (error) {
    console.error('Error fetching mountains:', error);
    return c.json({ error: 'Failed to fetch mountains' }, 500);
  }
});

// Get a single mountain by ID
vocManager.get('/mountains/:mountainId', async (c) => {
  try {
    const mountainId = c.req.param('mountainId');
    const mountain = VocManagerService.getMountainById(mountainId);

    if (!mountain) {
      return c.json({ error: 'Mountain not found' }, 404);
    }

    return c.json({ mountain });
  } catch (error) {
    console.error('Error fetching mountain:', error);
    return c.json({ error: 'Failed to fetch mountain' }, 500);
  }
});

// Add a new mountain
vocManager.post('/mountains', async (c) => {
  try {
    const newMountain: MountainInfo = await c.req.json();

    // Validate required fields
    if (!newMountain.id || !newMountain.name || !newMountain.description || !newMountain.altitude || !newMountain.image || !newMountain.wiki) {
      return c.json({ error: 'All fields are required: id, name, description, altitude, image, wiki' }, 400);
    }

    // Check if mountain with this ID already exists
    const existing = VocManagerService.getMountainById(newMountain.id);
    if (existing) {
      return c.json({ error: 'Mountain with this ID already exists' }, 400);
    }

    // Load current mountains
    const mountainsPath = path.join(process.cwd(), 'src/features/voc-manager/data/mountains.json');
    const mountainsData = fs.readFileSync(mountainsPath, 'utf-8');
    const mountains: MountainInfo[] = JSON.parse(mountainsData);

    // Add new mountain
    mountains.push(newMountain);

    // Save to file
    fs.writeFileSync(mountainsPath, JSON.stringify(mountains, null, 2), 'utf-8');

    // Reload mountains in memory
    VocManagerService.reloadMountains();

    return c.json({ message: 'Mountain added successfully', mountain: newMountain }, 201);
  } catch (error) {
    console.error('Error adding mountain:', error);
    return c.json({ error: 'Failed to add mountain' }, 500);
  }
});

// Update a mountain
vocManager.put('/mountains/:mountainId', async (c) => {
  try {
    const mountainId = c.req.param('mountainId');
    const updatedData: Partial<MountainInfo> = await c.req.json();

    // Load current mountains
    const mountainsPath = path.join(process.cwd(), 'src/features/voc-manager/data/mountains.json');
    const mountainsData = fs.readFileSync(mountainsPath, 'utf-8');
    const mountains: MountainInfo[] = JSON.parse(mountainsData);

    // Find mountain index
    const mountainIndex = mountains.findIndex(m => m.id === mountainId);
    if (mountainIndex === -1) {
      return c.json({ error: 'Mountain not found' }, 404);
    }

    // Update mountain
    mountains[mountainIndex] = { ...mountains[mountainIndex], ...updatedData, id: mountainId };

    // Save to file
    fs.writeFileSync(mountainsPath, JSON.stringify(mountains, null, 2), 'utf-8');

    // Reload mountains in memory
    VocManagerService.reloadMountains();

    return c.json({ message: 'Mountain updated successfully', mountain: mountains[mountainIndex] });
  } catch (error) {
    console.error('Error updating mountain:', error);
    return c.json({ error: 'Failed to update mountain' }, 500);
  }
});

// Delete a mountain
vocManager.delete('/mountains/:mountainId', async (c) => {
  try {
    const mountainId = c.req.param('mountainId');

    // Load current mountains
    const mountainsPath = path.join(process.cwd(), 'src/features/voc-manager/data/mountains.json');
    const mountainsData = fs.readFileSync(mountainsPath, 'utf-8');
    const mountains: MountainInfo[] = JSON.parse(mountainsData);

    // Find mountain
    const mountainIndex = mountains.findIndex(m => m.id === mountainId);
    if (mountainIndex === -1) {
      return c.json({ error: 'Mountain not found' }, 404);
    }

    // Remove mountain
    mountains.splice(mountainIndex, 1);

    // Save to file
    fs.writeFileSync(mountainsPath, JSON.stringify(mountains, null, 2), 'utf-8');

    // Reload mountains in memory
    VocManagerService.reloadMountains();

    return c.json({ message: 'Mountain deleted successfully' });
  } catch (error) {
    console.error('Error deleting mountain:', error);
    return c.json({ error: 'Failed to delete mountain' }, 500);
  }
});

export default vocManager;