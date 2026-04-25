import type { BotClient } from '../../../bot/client';
import { VoiceSessionService } from '../../voice/services/voice-session.service';
import { PeakHuntersPlugin } from './peak-hunters.plugin';

const peakHuntersPlugin = new PeakHuntersPlugin();

VoiceSessionService.registerPlugin(peakHuntersPlugin);

export function registerPeakHuntersVoiceListeners(client: BotClient): void {
  peakHuntersPlugin.registerVoiceListeners(client);
}
