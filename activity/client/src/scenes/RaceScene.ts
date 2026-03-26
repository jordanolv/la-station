import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { UserInfo, PlayerState, TrackSegment, Obstacle } from "../types";

const MARBLE_RADIUS = 20;
const TRACK_WIDTH = 360;
const SEGMENT_HEIGHT = 200;
const SEGMENT_COUNT = 20;
const TRACK_TOTAL_HEIGHT = SEGMENT_COUNT * SEGMENT_HEIGHT + 400;
const FINISH_Y = TRACK_TOTAL_HEIGHT - 200;
const SEND_INTERVAL_MS = 100;

const COLORS = {
  bg: 0x1a1a2e,
  wall: 0x2d4a7a,
  floor: 0x1e3a5f,
  bumper: 0xe94560,
  bumperGlow: 0xff6b8a,
  seesaw: 0xf5a623,
  pin: 0x9b59b6,
  finishLine: 0xf1c40f,
  podiumBg: 0x0f3460,
  gold: 0xf5a623,
  silver: 0xbdc3c7,
  bronze: 0xcd7f32,
};

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RaceScene extends Phaser.Scene {
  private room!: Room;
  private user!: UserInfo;
  private rng!: () => number;

  private segments: TrackSegment[] = [];
  private obstacles: Obstacle[] = [];

  private myMarble?: Phaser.Physics.Matter.Image;
  private remoteMarbles: Map<string, Phaser.GameObjects.Container> = new Map();
  private remotePositions: Map<string, { x: number; y: number }> = new Map();

  private walls: MatterJS.BodyType[] = [];
  private seesawBodies: Array<{ body: MatterJS.BodyType; gfx: Phaser.GameObjects.Graphics }> = [];

  private hasFinished = false;
  private cleanupFns: Array<() => void> = [];
  private positionLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private speedDisplay?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "RaceScene" });
  }

  init(data: { room: Room; user: UserInfo }) {
    this.room = data.room;
    this.user = data.user;
    this.rng = mulberry32(this.room.state.seed);
    this.hasFinished = false;
  }

  preload() {
    this.room.state.players.forEach((player: PlayerState) => {
      const key = `avatar_${player.id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, player.avatarUrl);
      }
    });
  }

  create() {
    this.matter.world.setBounds(0, -100, this.scale.width, TRACK_TOTAL_HEIGHT + 200, 64, true, true, false, true);
    this.matter.world.setGravity(0, 1.8);

    this.generateTrack();
    this.buildTrackGraphics();
    this.buildWalls();
    this.buildObstacles();
    this.buildFinishLine();
    this.buildMarbles();
    this.buildHUD();
    this.setupCamera();
    this.setupRoomListeners();

    this.time.addEvent({
      delay: SEND_INTERVAL_MS,
      loop: true,
      callback: this.sendPosition,
      callbackScope: this,
    });

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: this.updateRemoteMarbles,
      callbackScope: this,
    });
  }

  private generateTrack() {
    const centerX = this.scale.width / 2;
    let currentLeft = centerX - TRACK_WIDTH / 2;
    let currentRight = centerX + TRACK_WIDTH / 2;

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const y = 100 + i * SEGMENT_HEIGHT;
      const segType = this.pickSegmentType(i);
      const drift = (this.rng() - 0.5) * 60;

      currentLeft = Phaser.Math.Clamp(currentLeft + drift, 20, centerX - 80);
      currentRight = Phaser.Math.Clamp(currentRight + drift, centerX + 80, this.scale.width - 20);

      let width = currentRight - currentLeft;
      if (segType === "funnel") {
        const squeeze = 60 + this.rng() * 80;
        currentLeft += squeeze / 2;
        currentRight -= squeeze / 2;
        width = currentRight - currentLeft;
      } else if (segType === "narrow") {
        const squeeze = 40 + this.rng() * 60;
        currentLeft += squeeze / 2;
        currentRight -= squeeze / 2;
        width = currentRight - currentLeft;
      }

      width = Math.max(width, 120);

      this.segments.push({
        type: segType,
        y,
        leftX: currentLeft,
        rightX: currentRight,
        width,
      });

      this.generateObstaclesForSegment(i, currentLeft, currentRight, y);
    }
  }

  private pickSegmentType(index: number): TrackSegment["type"] {
    if (index === 0) return "straight";
    const r = this.rng();
    if (r < 0.4) return "straight";
    if (r < 0.65) return "curve";
    if (r < 0.82) return "funnel";
    return "narrow";
  }

  private generateObstaclesForSegment(segIndex: number, leftX: number, rightX: number, topY: number) {
    if (segIndex === 0) return;

    const midX = (leftX + rightX) / 2;
    const segW = rightX - leftX;
    const baseY = topY + SEGMENT_HEIGHT / 2;

    const r = this.rng();

    if (r < 0.3) {
      const numPins = 3 + Math.floor(this.rng() * 3);
      for (let p = 0; p < numPins; p++) {
        const px = leftX + 20 + (p / (numPins - 1)) * (segW - 40);
        const py = baseY + (this.rng() - 0.5) * 60;
        this.obstacles.push({ type: "pin", x: px, y: py, radius: 10 });
      }
    } else if (r < 0.55) {
      this.obstacles.push({
        type: "bumper",
        x: midX + (this.rng() - 0.5) * (segW * 0.4),
        y: baseY,
        radius: 18,
      });
    } else if (r < 0.7) {
      this.obstacles.push({
        type: "seesaw",
        x: midX,
        y: baseY,
        width: segW * 0.6,
        rotation: 0,
      });
    }
  }

  private buildTrackGraphics() {
    const gfx = this.add.graphics();

    gfx.fillStyle(COLORS.floor, 1);
    gfx.fillRect(0, 100, this.scale.width, FINISH_Y);

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const nextSeg = this.segments[i + 1];

      gfx.fillStyle(COLORS.bg, 1);

      if (nextSeg) {
        const points = [
          { x: 0, y: seg.y },
          { x: seg.leftX, y: seg.y },
          { x: nextSeg.leftX, y: nextSeg.y },
          { x: 0, y: nextSeg.y },
        ];
        gfx.fillPoints(points, true);

        const pointsRight = [
          { x: seg.rightX, y: seg.y },
          { x: this.scale.width, y: seg.y },
          { x: this.scale.width, y: nextSeg.y },
          { x: nextSeg.rightX, y: nextSeg.y },
        ];
        gfx.fillPoints(pointsRight, true);
      }

      gfx.fillStyle(COLORS.wall, 1);
      gfx.fillRect(seg.leftX - 8, seg.y, 8, SEGMENT_HEIGHT);
      gfx.fillRect(seg.rightX, seg.y, 8, SEGMENT_HEIGHT);
    }
  }

  private buildWalls() {
    for (let i = 0; i < this.segments.length - 1; i++) {
      const seg = this.segments[i];
      const next = this.segments[i + 1];

      this.addWallBetween(
        seg.leftX,
        seg.y + SEGMENT_HEIGHT / 2,
        next.leftX,
        next.y + SEGMENT_HEIGHT / 2
      );
      this.addWallBetween(
        seg.rightX,
        seg.y + SEGMENT_HEIGHT / 2,
        next.rightX,
        next.y + SEGMENT_HEIGHT / 2
      );
    }

    const firstSeg = this.segments[0];
    if (firstSeg) {
      const topWall = this.matter.add.rectangle(
        this.scale.width / 2,
        firstSeg.y - 10,
        this.scale.width,
        20,
        { isStatic: true, friction: 0.1, restitution: 0.3 }
      );
      this.walls.push(topWall);
    }
  }

  private addWallBetween(x1: number, y1: number, x2: number, y2: number) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    const wall = this.matter.add.rectangle(cx, cy, len, 12, {
      isStatic: true,
      friction: 0.05,
      restitution: 0.3,
      angle,
    });
    this.walls.push(wall);
  }

  private buildObstacles() {
    this.obstacles.forEach((obs) => {
      if (obs.type === "pin" && obs.radius) {
        const gfx = this.add.graphics();
        gfx.fillStyle(COLORS.pin, 1);
        gfx.fillCircle(obs.x, obs.y, obs.radius);
        gfx.lineStyle(2, 0xd7bde2, 1);
        gfx.strokeCircle(obs.x, obs.y, obs.radius);

        this.matter.add.circle(obs.x, obs.y, obs.radius, {
          isStatic: true,
          friction: 0.05,
          restitution: 0.6,
        });
      }

      if (obs.type === "bumper" && obs.radius) {
        const gfx = this.add.graphics();
        gfx.fillStyle(COLORS.bumper, 1);
        gfx.fillCircle(obs.x, obs.y, obs.radius);
        gfx.fillStyle(COLORS.bumperGlow, 0.5);
        gfx.fillCircle(obs.x, obs.y, obs.radius * 0.6);

        this.matter.add.circle(obs.x, obs.y, obs.radius, {
          isStatic: true,
          friction: 0,
          restitution: 1.2,
          label: "bumper",
        });

        this.tweens.add({
          targets: gfx,
          alpha: 0.7,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      if (obs.type === "seesaw" && obs.width) {
        const gfx = this.add.graphics();
        gfx.fillStyle(COLORS.seesaw, 1);
        gfx.fillRect(-obs.width / 2, -6, obs.width, 12);
        gfx.x = obs.x;
        gfx.y = obs.y;

        const body = this.matter.add.rectangle(obs.x, obs.y, obs.width, 12, {
          isStatic: false,
          friction: 0.1,
          restitution: 0.2,
          frictionAir: 0.05,
          label: "seesaw",
        });

        const pivot = this.matter.add.rectangle(obs.x, obs.y, 8, 20, {
          isStatic: true,
          friction: 0,
        });

        this.matter.add.constraint(body, pivot, 0, 1, {
          pointA: { x: 0, y: 0 },
          pointB: { x: 0, y: 0 },
        });

        this.seesawBodies.push({ body, gfx });
      }
    });
  }

  private buildFinishLine() {
    const gfx = this.add.graphics();
    const { width } = this.scale;

    const lastSeg = this.segments[this.segments.length - 1];
    if (!lastSeg) return;

    const finishLeft = lastSeg.leftX;
    const finishRight = lastSeg.rightX;
    const finishW = finishRight - finishLeft;

    const checkerSize = 16;
    const cols = Math.floor(finishW / checkerSize);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 2; r++) {
        const isWhite = (c + r) % 2 === 0;
        gfx.fillStyle(isWhite ? 0xffffff : 0x000000, 1);
        gfx.fillRect(finishLeft + c * checkerSize, FINISH_Y + r * checkerSize, checkerSize, checkerSize);
      }
    }

    gfx.lineStyle(3, COLORS.finishLine, 1);
    gfx.strokeRect(finishLeft, FINISH_Y, finishW, checkerSize * 2);

    this.add
      .text(width / 2, FINISH_Y - 30, "ARRIVEE", {
        fontSize: "22px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#f1c40f",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const groundBody = this.matter.add.rectangle(
      (finishLeft + finishRight) / 2,
      FINISH_Y + 100,
      finishW + 20,
      20,
      { isStatic: true, friction: 0.5, restitution: 0.2 }
    );
    this.walls.push(groundBody);
  }

  private buildMarbles() {
    const players = Array.from(this.room.state.players.values()) as PlayerState[];
    const count = players.length;
    const firstSeg = this.segments[0];
    if (!firstSeg) return;

    const segW = firstSeg.rightX - firstSeg.leftX;
    const spacing = segW / (count + 1);

    players.forEach((player, i) => {
      const startX = firstSeg.leftX + spacing * (i + 1);
      const startY = firstSeg.y + 40;

      if (player.id === this.user.id) {
        this.myMarble = this.matter.add.image(startX, startY, `avatar_${player.id}`) as Phaser.Physics.Matter.Image;
        this.myMarble.setCircle(MARBLE_RADIUS);
        this.myMarble.setFriction(0.05);
        this.myMarble.setFrictionAir(0.01);
        this.myMarble.setBounce(0.4);
        this.myMarble.setMass(1);
        this.myMarble.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);

        const mask = this.make.graphics({ x: startX, y: startY });
        mask.fillStyle(0xffffff);
        mask.fillCircle(0, 0, MARBLE_RADIUS);
        this.myMarble.setMask(mask.createGeometryMask());

        const forceX = (this.rng() - 0.5) * 0.005;
        this.time.delayedCall(100, () => {
          this.myMarble?.applyForce(new Phaser.Math.Vector2(forceX, 0));
        });
      } else {
        const container = this.buildRemoteMarble(player, startX, startY);
        this.remoteMarbles.set(player.id, container);
        this.remotePositions.set(player.id, { x: startX, y: startY });
      }

      const label = this.add
        .text(startX, startY - MARBLE_RADIUS - 6, player.username, {
          fontSize: "11px",
          fontFamily: "Segoe UI, sans-serif",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          backgroundColor: "#00000066",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(5);

      this.positionLabels.set(player.id, label);
    });
  }

  private buildRemoteMarble(player: PlayerState, x: number, y: number): Phaser.GameObjects.Container {
    const key = `avatar_${player.id}`;
    const items: Phaser.GameObjects.GameObject[] = [];

    if (this.textures.exists(key)) {
      const rt = this.add.renderTexture(0, 0, MARBLE_RADIUS * 2, MARBLE_RADIUS * 2).setOrigin(0.5);
      const maskGfx = this.make.graphics({ x, y });
      maskGfx.fillStyle(0xffffff);
      maskGfx.fillCircle(0, 0, MARBLE_RADIUS);
      rt.setMask(maskGfx.createGeometryMask());
      rt.draw(key, 0, 0, MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
      items.push(rt);
    } else {
      const gfx = this.add.graphics();
      gfx.fillStyle(COLORS.bumper, 1);
      gfx.fillCircle(0, 0, MARBLE_RADIUS);
      items.push(gfx);
    }

    const ring = this.add.graphics();
    ring.lineStyle(2, 0xffffff, 0.6);
    ring.strokeCircle(0, 0, MARBLE_RADIUS);
    items.push(ring);

    const container = this.add.container(x, y, items);
    container.setDepth(3);
    return container;
  }

  private buildHUD() {
    const { width } = this.scale;
    const hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(20);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.5);
    hudBg.fillRoundedRect(10, 10, 160, 60, 8);

    this.speedDisplay = this.add.text(20, 20, "", {
      fontSize: "13px",
      fontFamily: "Segoe UI, sans-serif",
      color: "#ffffff",
    });

    const phaseBg = this.add.graphics();
    phaseBg.fillStyle(0x000000, 0.5);
    phaseBg.fillRoundedRect(width - 170, 10, 160, 60, 8);

    hudContainer.add([hudBg, this.speedDisplay, phaseBg]);
  }

  private setupCamera() {
    this.cameras.main.setBounds(0, 0, this.scale.width, TRACK_TOTAL_HEIGHT);
    if (this.myMarble) {
      this.cameras.main.startFollow(this.myMarble, true, 0.1, 0.1);
    }
  }

  private sendPosition() {
    if (!this.myMarble || this.hasFinished) return;
    this.room.send("update_position", {
      x: Math.round(this.myMarble.x),
      y: Math.round(this.myMarble.y),
    });
  }

  private updateRemoteMarbles() {
    this.remoteMarbles.forEach((container, playerId) => {
      const targetPos = this.remotePositions.get(playerId);
      if (!targetPos) return;

      container.x = Phaser.Math.Linear(container.x, targetPos.x, 0.15);
      container.y = Phaser.Math.Linear(container.y, targetPos.y, 0.15);

      const label = this.positionLabels.get(playerId);
      if (label) {
        label.setPosition(container.x, container.y - MARBLE_RADIUS - 6);
      }
    });
  }

  update() {
    if (!this.myMarble) return;

    const marble = this.myMarble;
    const label = this.positionLabels.get(this.user.id);
    if (label) {
      label.setPosition(marble.x, marble.y - MARBLE_RADIUS - 6);
    }

    this.seesawBodies.forEach(({ body, gfx }) => {
      gfx.x = (body.position as { x: number; y: number }).x;
      gfx.y = (body.position as { x: number; y: number }).y;
      gfx.rotation = body.angle;
    });

    if (!this.hasFinished && marble.y >= FINISH_Y) {
      this.hasFinished = true;
      this.room.send("finish");
      this.showFinishEffect();
    }

    if (this.speedDisplay) {
      const vel = marble.body as MatterJS.BodyType;
      const speed = Math.round(Math.sqrt(vel.velocity.x ** 2 + vel.velocity.y ** 2) * 10);
      this.speedDisplay.setText(`Vitesse: ${speed}\nPos: ${Math.round(marble.y)}`);
    }
  }

  private showFinishEffect() {
    const { width, height } = this.scale;

    const banner = this.add
      .text(width / 2, height / 2, "ARRIVEE!", {
        fontSize: "60px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#f1c40f",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30)
      .setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 400,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(2000, () => {
      this.tweens.add({ targets: banner, alpha: 0, duration: 300 });
    });
  }

  private setupRoomListeners() {
    const onStateChange = (state: { players: Map<string, PlayerState>; phase: string }) => {
      state.players.forEach((player: PlayerState) => {
        if (player.id !== this.user.id) {
          this.remotePositions.set(player.id, { x: player.x, y: player.y });
        }
      });

      if (state.phase === "finished") {
        this.time.delayedCall(1000, () => this.showPodium());
      }
    };

    this.room.onStateChange(onStateChange);
    this.cleanupFns.push(() => this.room.onStateChange.remove(onStateChange));
  }

  private showPodium() {
    const { width, height } = this.scale;
    const players = Array.from(this.room.state.players.values()) as PlayerState[];
    const finished = players
      .filter((p) => p.finished && p.finishPosition > 0)
      .sort((a, b) => a.finishPosition - b.finishPosition);

    const overlay = this.add.graphics().setScrollFactor(0).setDepth(40);
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, 40, "CLASSEMENT", {
        fontSize: "36px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#f1c40f",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(41);

    const medalColors = [COLORS.gold, COLORS.silver, COLORS.bronze];
    const medals = ["1er", "2eme", "3eme"];

    finished.slice(0, 3).forEach((player, i) => {
      const podiumY = 120 + i * 110;
      const podiumX = width / 2;

      const row = this.add.graphics().setScrollFactor(0).setDepth(41);
      row.fillStyle(COLORS.podiumBg, 0.8);
      row.fillRoundedRect(podiumX - 180, podiumY - 30, 360, 90, 12);
      row.lineStyle(2, medalColors[i] ?? COLORS.silver, 1);
      row.strokeRoundedRect(podiumX - 180, podiumY - 30, 360, 90, 12);

      this.add
        .text(podiumX - 150, podiumY + 15, medals[i] ?? "", {
          fontSize: "22px",
          fontFamily: "Segoe UI, sans-serif",
          color: "#" + (medalColors[i] ?? COLORS.silver).toString(16).padStart(6, "0"),
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(42);

      const avatarKey = `avatar_${player.id}`;
      if (this.textures.exists(avatarKey)) {
        const avatar = this.add
          .image(podiumX - 70, podiumY + 15, avatarKey)
          .setDisplaySize(50, 50)
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(42);

        const maskGfx = this.make.graphics({ x: avatar.x, y: avatar.y });
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillCircle(0, 0, 25);
        avatar.setMask(maskGfx.createGeometryMask());
      }

      this.add
        .text(podiumX, podiumY + 15, player.username, {
          fontSize: "20px",
          fontFamily: "Segoe UI, sans-serif",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(42);
    });

    const restartBtn = this.add
      .text(width / 2, height - 60, "Retour au lobby", {
        fontSize: "20px",
        fontFamily: "Segoe UI, sans-serif",
        color: "#ffffff",
        backgroundColor: "#e94560",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(42)
      .setInteractive({ cursor: "pointer" });

    restartBtn.on("pointerdown", () => {
      this.scene.start("LobbyScene", { room: this.room, user: this.user });
    });
  }

  shutdown() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
