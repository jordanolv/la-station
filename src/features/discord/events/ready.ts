import { Events, ActivityType } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { StatsService } from '../../stats/services/stats.service';

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client: BotClient) {
    const statuses = [
      { name: 'Bienvenue sur The Ridge ⛰️', type: ActivityType.Playing },
      { name: '/profil pour remplir votre profil 📝', type: ActivityType.Watching }
    ];

    let currentStatusIndex = 0;

    const setStatus = () => {
      const status = statuses[currentStatusIndex];
      client.user?.setActivity(status.name, { type: status.type });
      currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
    };

    setStatus();
    setInterval(setStatus, 8000);
    StatsService.rehydrateActiveSessions(client);

    // Send deployment notification to owner
    const ownerDiscordId = process.env.OWNER_DISCORD_ID;
    if (ownerDiscordId) {
      try {
        const owner = await client.users.fetch(ownerDiscordId);
        await owner.send('✅ Le bot est maintenant en ligne et prêt à être utilisé !');
        console.log(`[Ready] Notification envoyée à l'owner (${ownerDiscordId})`);
      } catch (error) {
        console.error('[Ready] Erreur lors de l\'envoi de la notification à l\'owner:', error);
      }
    }
  }
};
