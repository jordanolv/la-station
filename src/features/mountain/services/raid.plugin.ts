import { BotClient } from '../../../bot/client';
import { ActivityHooks } from '../../../shared/hooks/activity-hooks';
import { VoicePlugin, VoiceSession } from '../../voice/services/voice-session.service';
import { RaidService } from './raid.service';

export class RaidPlugin implements VoicePlugin {
  async init(): Promise<void> {
    ActivityHooks.onMessageActivity((userId, points) => {
      RaidService.addContribution(userId, points).catch(() => {});
    });
  }

  async onSessionEnd(session: VoiceSession, _client: BotClient): Promise<void> {
    if (session.activeSeconds <= 0) return;
    await RaidService.addContribution(session.userId, session.activeSeconds);
  }
}
