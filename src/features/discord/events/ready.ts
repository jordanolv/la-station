import { Events, ActivityType } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
    const statuses = [
      { name: 'Bienvenue sur La Station ! 👋', type: ActivityType.Playing },
      { name: '/ask pour me poser une question 🤖', type: ActivityType.Watching },
      { name: '/birthday pour votre anniversaire 🎂', type: ActivityType.Watching }
    ];

    let currentStatusIndex = 0;

    const setStatus = () => {
      const status = statuses[currentStatusIndex];
      client.user?.setActivity(status.name, { type: status.type });
      currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
    };

    setStatus();

    setInterval(setStatus, 8000);
  }
}; 