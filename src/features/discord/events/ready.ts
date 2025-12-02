import { Events, ActivityType } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { StatsService } from '../../stats/services/stats.service';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
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
  }
};
