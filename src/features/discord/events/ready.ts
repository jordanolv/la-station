import { Events, ActivityType } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { VoiceService } from '../../voice/services/voice.service';
import { panelRegistry } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { LogService } from '../../../shared/logs/logs.service';
import { generalPanel } from '../../admin/panels/general.panel';
import { logsPanel } from '../../admin/panels/logs.panel';
import { birthdayPanel } from '../../user/panels/birthday.panel';
import { levelingPanel } from '../../leveling/panels/leveling.panel';
import { voicePanel } from '../../voice/panels/voice.panel';
import { partyPanel } from '../../party/panels/party.panel';
import { chatGamingPanel } from '../../chat-gaming/panels/chat-gaming.panel';
import { arcadePanel } from '../../arcade/panels/arcade.panel';
import { peakHuntersPanel } from '../../peak-hunters/panels/peak-hunters.panel';
import { activityRolesPanel } from '../../activity-roles/panels/activity-roles.panel';
import { suggestionPanel } from '../../suggestion/panels/suggestion.panel';
import { SpawnService } from '../../peak-hunters/services/spawn.service';
import { QuizService } from '../../quiz/services/quiz.service';
import { BingoService } from '../../arcade/bingo/services/bingo.service';

panelRegistry.register(generalPanel);
panelRegistry.register(logsPanel);
panelRegistry.register(birthdayPanel);
panelRegistry.register(levelingPanel);
panelRegistry.register(voicePanel);
panelRegistry.register(partyPanel);
panelRegistry.register(chatGamingPanel);
panelRegistry.register(arcadePanel);
panelRegistry.register(peakHuntersPanel);
panelRegistry.register(activityRolesPanel);
panelRegistry.register(suggestionPanel);

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client: BotClient) {
    const statuses = [
      { name: 'Bienvenue sur The Ridge ⛰️', type: ActivityType.Playing },
      { name: '/profil pour remplir votre profil 📝', type: ActivityType.Watching },
      { name: '/peak-hunters — lance tes expéditions 🗺️', type: ActivityType.Playing },
    ];

    let currentStatusIndex = 0;

    const setStatus = () => {
      const status = statuses[currentStatusIndex];
      client.user?.setActivity(status.name, { type: status.type });
      currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
    };

    setStatus();
    setInterval(setStatus, 8000);
    await VoiceService.rehydrate(client);
    await SpawnService.rehydrate(client);
    await QuizService.rehydrate(client);
    await BingoService.rehydrate(client);
    await ConfigPanelService.init(client).catch((err) =>
      console.error('[ConfigPanel] Erreur init:', err),
    );
    LogService.init(client).catch((err) =>
      console.error('[LogService] Erreur init:', err),
    );

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
