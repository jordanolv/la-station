import type { Room } from "colyseus.js";

export interface UserInfo {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  avatarUrl: string;
}

export interface GameConfig {
  room: Room;
  user: UserInfo;
  channelId: string;
}

export interface PlayerState {
  id: string;
  username: string;
  avatarUrl: string;
  x: number;
  y: number;
  isReady: boolean;
  finished: boolean;
  finishPosition: number;
  isHost: boolean;
}

export interface RoomState {
  players: Map<string, PlayerState>;
  phase: "lobby" | "countdown" | "racing" | "finished";
  countdown: number;
  seed: number;
  finishedCount: number;
}

export interface TrackSegment {
  type: "straight" | "curve" | "funnel" | "narrow";
  y: number;
  leftX: number;
  rightX: number;
  width: number;
}

export interface Obstacle {
  type: "bumper" | "seesaw" | "pin";
  x: number;
  y: number;
  rotation?: number;
  radius?: number;
  width?: number;
}
