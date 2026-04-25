import type { VoiceChannel } from 'discord.js';
import type { DayChunk } from '../../../shared/time/day-split';

export interface VoiceSessionStartedEvent {
  userId: string;
  channelId: string;
  channelName: string;
  startedAt: Date;
}

export interface VoiceSessionEndedEvent {
  userId: string;
  channelId: string;
  channelName: string;
  startedAt: Date;
  endedAt: Date;
  totalSeconds: number;
  activeSeconds: number;
  byDay: DayChunk[];
}

export interface VoiceChannelCreatedEvent {
  channel: VoiceChannel;
  userId: string;
  metadata: Record<string, unknown>;
}

export interface VoiceChannelDeletedEvent {
  channelId: string;
}

export interface VoiceTickSession {
  userId: string;
  channelId: string;
  sessionStartedAt: Date;
  activeSecondsSoFar: number;
  /** Secondes actives attribuables au jour Paris courant (compte uniquement les périodes/segments tombant aujourd'hui). */
  activeSecondsTodayParis: number;
}

export interface VoiceTickEvent {
  tickAt: Date;
  sessions: VoiceTickSession[];
}

declare module '../../../shared/events/bot-event-bus' {
  interface BotEventMap {
    'voice:session:started': VoiceSessionStartedEvent;
    'voice:session:ended': VoiceSessionEndedEvent;
    'voice:channel:created': VoiceChannelCreatedEvent;
    'voice:channel:deleted': VoiceChannelDeletedEvent;
    'voice:tick': VoiceTickEvent;
  }
}
