import { Hono } from 'hono';
import GuildUserModel from '../../database/models/GuildUser'; // Adjust path as needed
import mongoose from 'mongoose';

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

export { guilds }; 