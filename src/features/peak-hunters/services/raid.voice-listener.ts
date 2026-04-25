import { BotEventBus } from '../../../shared/events/bot-event-bus';
import { ActivityHooks } from '../../../shared/hooks/activity-hooks';
import '../../voice/events/voice.events';
import { RaidService } from './raid.service';

export function registerRaidListeners(): void {
  ActivityHooks.onMessageActivity((userId, points) => {
    RaidService.addContribution(userId, points).catch(() => {});
  });

  BotEventBus.on('voice:session:ended', async event => {
    if (event.activeSeconds <= 0) return;
    try {
      await RaidService.addContribution(event.userId, event.activeSeconds);
    } catch (err) {
      console.error('[raid.voice-listener] Erreur:', err);
    }
  });
}
