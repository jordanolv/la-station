import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { UserInfo, PlayerState } from "../types";

const AVATAR_RADIUS = 40;
const COLORS = {
  bg: 0x1a1a2e,
  card: 0x16213e,
  accent: 0xe94560,
  accentLight: 0xf5a623,
  btnPrimary: 0xe94560,
  btnPrimaryHover: 0xc73652,
};

export class LobbyScene extends Phaser.Scene {
  private room!: Room;
  private user!: UserInfo;
  private playerCards: Map<string, Phaser.GameObjects.Container> = new Map();
  private countdownText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Container;
  private playerCountText?: Phaser.GameObjects.Text;
  private cleanupFns: Array<() => void> = [];

  constructor() {
    super({ key: "LobbyScene" });
  }

  init(data: { room: Room; user: UserInfo }) {
    this.room = data.room;
    this.user = data.user;
  }

  preload() {
    this.room.state.players.forEach((player: PlayerState) => {
      if (!this.textures.exists(`avatar_${player.id}`)) {
        this.load.image(`avatar_${player.id}`, player.avatarUrl);
      }
    });
  }

  create() {
    this.buildBackground();
    this.buildTitle();
    this.buildPlayerGrid();
    this.buildBottomUI();
    this.setupRoomListeners();
    this.refreshAll();
  }

  private buildBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.bg, COLORS.bg, 0x0f3460, 0x0f3460, 1);
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.Between(2, 6);
      const circle = this.add.graphics();
      circle.fillStyle(0xffffff, 0.05);
      circle.fillCircle(x, y, r);
    }
  }

  private buildTitle() {
    const { width } = this.scale;
    this.add
      .text(width / 2, 50, "MARBLE RACE", {
        fontSize: "36px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const underline = this.add.graphics();
    underline.fillStyle(COLORS.accent, 1);
    underline.fillRect(width / 2 - 80, 75, 160, 3);

    this.playerCountText = this.add
      .text(width / 2, 100, "", {
        fontSize: "16px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#8892b0",
      })
      .setOrigin(0.5);
  }

  private buildPlayerGrid() {
    this.refreshPlayerCards();
  }

  private buildBottomUI() {
    const { width, height } = this.scale;

    this.statusText = this.add
      .text(width / 2, height - 80, "", {
        fontSize: "18px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#8892b0",
      })
      .setOrigin(0.5);

    this.countdownText = this.add
      .text(width / 2, height / 2, "", {
        fontSize: "120px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(10);
  }

  private createStartButton(): Phaser.GameObjects.Container {
    const { width, height } = this.scale;
    const bx = width / 2;
    const by = height - 70;

    const bg = this.add.graphics();
    const drawBtn = (color: number) => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-120, -22, 240, 44, 22);
    };
    drawBtn(COLORS.btnPrimary);

    const label = this.add
      .text(0, 0, "Lancer la partie", {
        fontSize: "18px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const container = this.add.container(bx, by, [bg, label]);
    container.setSize(240, 44);
    container.setInteractive({ cursor: "pointer" });

    container.on("pointerover", () => drawBtn(COLORS.btnPrimaryHover));
    container.on("pointerout", () => drawBtn(COLORS.btnPrimary));
    container.on("pointerdown", () => {
      this.room.send("start_race");
    });

    return container;
  }

  private refreshPlayerCards() {
    this.playerCards.forEach((card) => card.destroy());
    this.playerCards.clear();

    const players = Array.from(this.room.state.players.values()) as PlayerState[];
    const { width } = this.scale;
    const cols = Math.min(4, players.length || 1);
    const cardW = 130;
    const cardH = 140;
    const paddingX = 20;
    const paddingY = 20;

    const gridWidth = cols * cardW + (cols - 1) * paddingX;
    const startX = (width - gridWidth) / 2 + cardW / 2;
    const startY = 145;

    players.forEach((player, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + paddingX);
      const y = startY + row * (cardH + paddingY);

      const card = this.buildPlayerCard(player, x, y);
      this.playerCards.set(player.id, card);
    });
  }

  private buildPlayerCard(player: PlayerState, x: number, y: number): Phaser.GameObjects.Container {
    const cardBg = this.add.graphics();
    cardBg.fillStyle(COLORS.card, 0.9);
    cardBg.fillRoundedRect(-55, -65, 110, 130, 12);

    if (player.isHost) {
      cardBg.lineStyle(2, COLORS.accentLight, 1);
      cardBg.strokeRoundedRect(-55, -65, 110, 130, 12);
    }

    const avatarContainer = this.buildAvatarCircle(player, 0, -20);

    const nameText = this.add
      .text(0, 35, player.username, {
        fontSize: "13px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#ffffff",
        wordWrap: { width: 100 },
      })
      .setOrigin(0.5, 0);

    const items: Phaser.GameObjects.GameObject[] = [cardBg, avatarContainer, nameText];

    if (player.isHost) {
      const hostBadge = this.add
        .text(0, 55, "HOST", {
          fontSize: "11px",
          fontFamily: "Segoe UI, sans-serif",
          color: "#f5a623",
          fontStyle: "bold",
        })
        .setOrigin(0.5, 0);
      items.push(hostBadge);
    }

    return this.add.container(x, y, items);
  }

  private buildAvatarCircle(player: PlayerState, x: number, y: number): Phaser.GameObjects.Container {
    const textureKey = `avatar_${player.id}`;
    const items: Phaser.GameObjects.GameObject[] = [];

    const ring = this.add.graphics();
    ring.lineStyle(2, player.isHost ? COLORS.accentLight : COLORS.accent, 1);
    ring.strokeCircle(x, y, AVATAR_RADIUS + 2);
    items.push(ring);

    if (this.textures.exists(textureKey)) {
      const rt = this.add.renderTexture(x, y, AVATAR_RADIUS * 2, AVATAR_RADIUS * 2).setOrigin(0.5);
      const mask = this.make.graphics({ x: rt.x, y: rt.y });
      mask.fillStyle(0xffffff);
      mask.fillCircle(0, 0, AVATAR_RADIUS);
      rt.setMask(mask.createGeometryMask());
      rt.draw(textureKey, 0, 0, AVATAR_RADIUS * 2, AVATAR_RADIUS * 2);
      items.push(rt);
    } else {
      const placeholder = this.add.graphics();
      placeholder.fillStyle(COLORS.accent, 1);
      placeholder.fillCircle(x, y, AVATAR_RADIUS);
      const initial = this.add
        .text(x, y, player.username[0]?.toUpperCase() ?? "?", {
          fontSize: "28px",
          fontFamily: "Segoe UI, sans-serif",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      items.push(placeholder, initial);

      this.load.image(textureKey, player.avatarUrl);
      this.load.once("complete", () => this.refreshPlayerCards());
      this.load.start();
    }

    return this.add.container(0, 0, items);
  }

  private refreshAll() {
    const players = Array.from(this.room.state.players.values()) as PlayerState[];
    const myPlayer = players.find((p) => p.id === this.user.id);
    const isHost = myPlayer?.isHost ?? false;
    const count = players.length;

    if (this.playerCountText) {
      this.playerCountText.setText(`${count} / 8 joueur${count > 1 ? "s" : ""}`);
    }

    if (this.startButton) {
      this.startButton.destroy();
      this.startButton = undefined;
    }

    if (isHost && this.room.state.phase === "lobby") {
      this.startButton = this.createStartButton();
      if (this.statusText) this.statusText.setText("");
    } else if (this.statusText) {
      this.statusText.setText("En attente du lancement...");
    }
  }

  private setupRoomListeners() {
    this.room.state.players.onAdd(() => this.refreshPlayerCards());
    this.room.state.players.onRemove(() => this.refreshPlayerCards());

    const onStateChange = (state: { phase: string; countdown: number }) => {
      if (state.phase === "countdown") {
        this.handleCountdown(state.countdown);
      }
      if (state.phase === "racing") {
        this.transitionToRace();
      }
      this.refreshAll();
    };

    this.room.onStateChange(onStateChange);
    this.cleanupFns.push(() => this.room.onStateChange.remove(onStateChange));
  }

  private handleCountdown(value: number) {
    if (!this.countdownText) return;

    this.countdownText.setText(String(value)).setAlpha(1).setScale(1.5);
    this.tweens.add({
      targets: this.countdownText,
      scale: 1,
      duration: 800,
      ease: "Back.easeOut",
    });

    if (this.statusText) this.statusText.setText("");
    if (this.startButton) {
      this.startButton.destroy();
      this.startButton = undefined;
    }
  }

  private transitionToRace() {
    this.cameras.main.fade(300, 0, 0, 0, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.scene.start("RaceScene", {
          room: this.room,
          user: this.user,
        });
      }
    });
  }

  shutdown() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
