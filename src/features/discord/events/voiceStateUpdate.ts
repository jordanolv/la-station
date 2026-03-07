import { Events, VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { VoiceService } from '../../voice/services/voice.service';
import { UserService } from '../../user/services/user.service';
import { LogService } from '../../../shared/logs/logs.service';
import { VoiceConfigRepository } from '../../voice/repositories/voice-config.repository';

export default {
  name: Events.VoiceStateUpdate,
  once: false,

  async execute(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    try {
      if (newState.member?.user.bot || oldState.member?.user.bot) return;

      const isJoining = !oldState.channelId && newState.channelId;
      const isLeaving = oldState.channelId && !newState.channelId;
      const isMoving = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

      if (isJoining) {
        await VoiceService.handleJoin(client, oldState, newState);
        if (newState.member) {
          await UserService.updateDailyStreak(newState.member.user.id);
        }
      } else if (isLeaving) {
        await VoiceService.handleLeave(client, oldState, newState);
      } else if (isMoving) {
        await VoiceService.handleLeave(client, oldState, newState);
        await VoiceService.handleJoin(client, oldState, newState);

        const vocConfig = await VoiceConfigRepository.get();
        const isJoinToCreateFlow =
          vocConfig?.joinChannels.some(c => c.id === oldState.channelId) &&
          vocConfig?.createdChannels.includes(newState.channelId ?? '');
        if (!isJoinToCreateFlow) {
          await LogService.logVoiceMove(client, oldState, newState);
        }
      } else {
        await VoiceService.handleVoiceStateChange(oldState, newState);
        await LogService.logVoiceStateChange(client, oldState, newState);
      }
    } catch (error) {
      console.error('[voiceStateUpdate] Erreur:', error);
    }
  },
};
