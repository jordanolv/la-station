import { Events, VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { VocManagerService } from '../../voc-manager/services/vocManager.service';
import { StatsService } from '../../stats/services/stats.service';
import { UserService } from '../../user/services/guildUser.service';

export default {
  name: Events.VoiceStateUpdate,
  once: false,

  async execute(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    try {
      // Ignorer les bots
      if (newState.member?.user.bot || oldState.member?.user.bot) return;
      
      // Déterminer le type d'événement vocal
      const isJoining = !oldState.channelId && newState.channelId;
      const isLeaving = oldState.channelId && !newState.channelId;
      const isMoving = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;
      const wasTrackable = StatsService.isVoiceStateTrackable(oldState);
      const isTrackableNow = StatsService.isVoiceStateTrackable(newState);

      // 1. Gestion des statistiques
      if (isJoining) {
        StatsService.handleUserJoinVoice(oldState, newState);
        // Mettre à jour la daily streak lors de la connexion en vocal
        if (newState.guild && newState.member) {
          await UserService.updateDailyStreak(newState.member.user.id, newState.guild.id);
        }
      } else if (isLeaving) {
        await StatsService.handleUserLeaveVoice(client, oldState, newState);
      } else if (isMoving) {
        if (!wasTrackable && isTrackableNow) {
          StatsService.handleUserJoinVoice(oldState, newState);
          // Mettre à jour la daily streak lors du passage à un canal trackable
          if (newState.guild && newState.member) {
            await UserService.updateDailyStreak(newState.member.user.id, newState.guild.id);
          }
        } else if (wasTrackable && !isTrackableNow) {
          await StatsService.handleUserLeaveVoice(client, oldState, newState);
        } else if (wasTrackable || isTrackableNow) {
          StatsService.handleVoiceStateUpdate(oldState, newState);
        }
      } else if (wasTrackable || isTrackableNow) {
        StatsService.handleVoiceStateUpdate(oldState, newState);
      }

      // 2. Gestion des canaux vocaux dynamiques
      if (isJoining || isMoving) {
        await VocManagerService.handleUserJoinChannel(client, oldState, newState);
      }
      
      if (isLeaving || isMoving) {
        await VocManagerService.handleUserLeaveChannel(client, oldState, newState);
      }
    } catch (error) {
      console.error('Erreur dans l\'événement voiceStateUpdate:', error);
    }
  }
}; 
