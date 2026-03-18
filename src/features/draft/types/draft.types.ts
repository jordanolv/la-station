export interface DraftPlayer {
  id: string;
  name: string;
}

export interface DraftSession {
  id: string;
  hostId: string;
  channelId: string;
  messageId: string;
  captain1: DraftPlayer;
  captain2: DraftPlayer;
  remainingPlayers: DraftPlayer[];
  team1: DraftPlayer[];
  team2: DraftPlayer[];
  pickIndex: number;
  firstPicker: 1 | 2;
  coinflipWinner: 1 | 2;
  status: 'choosefirst' | 'picking' | 'done';
}

export interface PendingSetup {
  hostId: string;
  captain1?: DraftPlayer;
  captain2?: DraftPlayer;
  players?: DraftPlayer[];
}
