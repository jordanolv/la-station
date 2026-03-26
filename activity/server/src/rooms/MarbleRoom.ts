import { Room, Client } from "@colyseus/core";
import { MarbleRoomState, Player } from "../schemas/MarbleRoomState";

interface JoinOptions {
  channelId: string;
  userId: string;
  username: string;
  avatarUrl: string;
}

interface UpdatePositionMessage {
  x: number;
  y: number;
}

export class MarbleRoom extends Room<MarbleRoomState> {
  maxClients = 8;
  private raceTimeout: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  onCreate(options: { channelId: string }) {
    this.roomId = options.channelId;

    const state = new MarbleRoomState();
    state.seed = Math.floor(Math.random() * 2147483647);
    state.phase = "lobby";
    this.setState(state);

    this.onMessage("start_race", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase !== "lobby") return;

      this.startCountdown();
    });

    this.onMessage("update_position", (client, message: UpdatePositionMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (this.state.phase !== "racing") return;

      player.x = message.x;
      player.y = message.y;
    });

    this.onMessage("finish", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.finished) return;
      if (this.state.phase !== "racing") return;

      this.state.finishedCount++;
      player.finished = true;
      player.finishPosition = this.state.finishedCount;

      if (this.state.finishedCount >= this.state.players.size) {
        this.endRace();
      }
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.id = options.userId;
    player.username = options.username;
    player.avatarUrl = options.avatarUrl;
    player.x = 0;
    player.y = 0;
    player.isReady = false;
    player.finished = false;
    player.finishPosition = 0;
    player.isHost = this.state.players.size === 0;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    const leavingPlayer = this.state.players.get(client.sessionId);
    const wasHost = leavingPlayer?.isHost ?? false;

    this.state.players.delete(client.sessionId);

    if (wasHost && this.state.players.size > 0) {
      const nextSessionId = this.state.players.keys().next().value;
      if (nextSessionId) {
        const nextPlayer = this.state.players.get(nextSessionId);
        if (nextPlayer) {
          nextPlayer.isHost = true;
        }
      }
    }

    if (this.state.phase === "racing") {
      const allFinished = Array.from(this.state.players.values()).every((p) => p.finished);
      if (allFinished || this.state.players.size === 0) {
        this.endRace();
      }
    }
  }

  onDispose() {
    if (this.raceTimeout) clearTimeout(this.raceTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  private startCountdown() {
    this.state.phase = "countdown";
    this.state.countdown = 3;

    this.countdownInterval = setInterval(() => {
      this.state.countdown--;

      if (this.state.countdown <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        this.startRace();
      }
    }, 1000);
  }

  private startRace() {
    this.state.phase = "racing";
    this.state.finishedCount = 0;

    this.raceTimeout = setTimeout(() => {
      this.endRace();
    }, 120_000);
  }

  private endRace() {
    if (this.raceTimeout) {
      clearTimeout(this.raceTimeout);
      this.raceTimeout = null;
    }

    this.state.phase = "finished";
  }
}
