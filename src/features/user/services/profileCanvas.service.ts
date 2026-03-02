import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import * as path from 'path';

// Essayer de charger une police custom (optionnel)
try {
  GlobalFonts.registerFromPath(path.join(process.cwd(), 'assets/fonts/Inter-Bold.ttf'), 'Inter');
  GlobalFonts.registerFromPath(path.join(process.cwd(), 'assets/fonts/Inter-Regular.ttf'), 'Inter');
} catch {
  // Police non trouvée, on utilisera les polices système
}

export interface ProfileCanvasData {
  username: string;
  visibleName: string;
  bio: string;
  avatarUrl: string;
  level: number;
  xpCurrent: number;
  xpRequired: number;
  money: number;
  messages: number;
  voiceTime: number; // en secondes
  dailyStreak: number;
  roles: { name: string; color: string }[];
  // Activité des 7 derniers jours (messages par jour)
  weeklyActivity?: number[];
}

export class ProfileCanvasService {
  private static readonly WIDTH = 900;
  private static readonly HEIGHT = 500;

  static async generateCard(data: ProfileCanvasData): Promise<Buffer> {
    const canvas = createCanvas(this.WIDTH, this.HEIGHT);
    const ctx = canvas.getContext('2d');

    // Fond avec dégradé
    this.drawBackground(ctx);

    // Avatar
    await this.drawAvatar(ctx, data.avatarUrl);

    // Infos utilisateur
    this.drawUserInfo(ctx, data);

    // Barre XP
    this.drawXpBar(ctx, data);

    // Stats
    this.drawStats(ctx, data);

    // Graphique d'activité
    this.drawActivityChart(ctx, data.weeklyActivity || [0, 0, 0, 0, 0, 0, 0]);

    // Rôles
    this.drawRoles(ctx, data.roles);

    return canvas.toBuffer('image/png');
  }

  private static drawBackground(ctx: SKRSContext2D): void {
    // Dégradé de fond
    const gradient = ctx.createLinearGradient(0, 0, this.WIDTH, this.HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Cercles décoratifs
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#36E0BE';
    ctx.beginPath();
    ctx.arc(this.WIDTH - 50, 50, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4facfe';
    ctx.beginPath();
    ctx.arc(50, this.HEIGHT - 50, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ligne accent en haut
    const accentGradient = ctx.createLinearGradient(0, 0, this.WIDTH, 0);
    accentGradient.addColorStop(0, '#36E0BE');
    accentGradient.addColorStop(1, '#4facfe');
    ctx.fillStyle = accentGradient;
    ctx.fillRect(0, 0, this.WIDTH, 4);
  }

  private static async drawAvatar(ctx: SKRSContext2D, avatarUrl: string): Promise<void> {
    const x = 60;
    const y = 50;
    const size = 120;

    try {
      const avatar = await loadImage(avatarUrl);

      // Ombre
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;

      // Cercle de fond
      ctx.fillStyle = '#36E0BE';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Clip circulaire pour l'avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, x, y, size, size);
      ctx.restore();
    } catch {
      // Avatar par défaut si erreur
      ctx.fillStyle = '#2a2a4e';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static drawUserInfo(ctx: SKRSContext2D, data: ProfileCanvasData): void {
    const x = 200;

    // Nom d'utilisateur
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter, Arial, sans-serif';
    ctx.fillText(data.visibleName, x, 90);

    // Username
    ctx.fillStyle = '#8892b0';
    ctx.font = '16px Inter, Arial, sans-serif';
    ctx.fillText(`@${data.username}`, x, 115);

    // Bio
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '14px Inter, Arial, sans-serif';
    const bioTruncated = data.bio.length > 50 ? data.bio.substring(0, 47) + '...' : data.bio;
    ctx.fillText(bioTruncated, x, 145);

    // Badge niveau
    this.drawLevelBadge(ctx, 130, 145, data.level);
  }

  private static drawLevelBadge(ctx: SKRSContext2D, x: number, y: number, level: number): void {
    const radius = 22;

    // Cercle de fond
    const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, '#36E0BE');
    gradient.addColorStop(1, '#4facfe');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Texte niveau
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.toString(), x, y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private static drawXpBar(ctx: SKRSContext2D, data: ProfileCanvasData): void {
    const x = 200;
    const y = 165;
    const width = 350;
    const height = 16;
    const progress = Math.min(data.xpCurrent / data.xpRequired, 1);

    // Fond de la barre
    ctx.fillStyle = '#2a2a4e';
    this.roundRect(ctx, x, y, width, height, 8);
    ctx.fill();

    // Progression
    if (progress > 0) {
      const gradient = ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, '#f093fb');
      gradient.addColorStop(1, '#f5576c');
      ctx.fillStyle = gradient;
      this.roundRect(ctx, x, y, width * progress, height, 8);
      ctx.fill();
    }

    // Texte XP
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    const xpText = `${data.xpCurrent.toLocaleString('fr-FR')} / ${data.xpRequired.toLocaleString('fr-FR')} XP`;
    ctx.fillText(xpText, x + width / 2, y + height / 2 + 4);
    ctx.textAlign = 'left';
  }

  private static drawStats(ctx: SKRSContext2D, data: ProfileCanvasData): void {
    const startX = 60;
    const startY = 210;
    const boxWidth = 130;
    const boxHeight = 70;
    const gap = 15;

    const stats = [
      { label: 'RIDGECOIN', value: data.money.toLocaleString('fr-FR'), color: '#36E0BE', icon: '💰' },
      { label: 'MESSAGES', value: data.messages.toLocaleString('fr-FR'), color: '#4facfe', icon: '💬' },
      { label: 'VOCAL', value: this.formatDuration(data.voiceTime), color: '#f093fb', icon: '🎙️' },
      { label: 'STREAK', value: `${data.dailyStreak}j`, color: '#f5576c', icon: '🔥' },
    ];

    stats.forEach((stat, i) => {
      const x = startX + (boxWidth + gap) * i;
      const y = startY;

      // Box de fond
      ctx.fillStyle = 'rgba(42, 42, 78, 0.8)';
      this.roundRect(ctx, x, y, boxWidth, boxHeight, 12);
      ctx.fill();

      // Label
      ctx.fillStyle = '#8892b0';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.fillText(stat.label, x + 12, y + 22);

      // Valeur
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 18px Inter, Arial, sans-serif';
      ctx.fillText(stat.value, x + 12, y + 50);
    });
  }

  private static drawActivityChart(ctx: SKRSContext2D, weeklyActivity: number[]): void {
    const x = 60;
    const y = 310;
    const width = 280;
    const height = 100;

    // Titre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.fillText('📊 Activité (7 derniers jours)', x, y - 10);

    // Fond du graphique
    ctx.fillStyle = 'rgba(42, 42, 78, 0.6)';
    this.roundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    const maxActivity = Math.max(...weeklyActivity, 1);
    const barWidth = 30;
    const gap = 10;
    const chartPadding = 15;
    const chartHeight = height - 30;

    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    weeklyActivity.forEach((activity, i) => {
      const barX = x + chartPadding + (barWidth + gap) * i;
      const barHeight = (activity / maxActivity) * (chartHeight - 20);
      const barY = y + chartHeight - barHeight;

      // Barre
      const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
      gradient.addColorStop(0, '#4facfe');
      gradient.addColorStop(1, '#36E0BE');
      ctx.fillStyle = gradient;
      this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.fill();

      // Label jour
      ctx.fillStyle = '#8892b0';
      ctx.font = '10px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(days[i], barX + barWidth / 2, y + height - 8);
    });
    ctx.textAlign = 'left';
  }

  private static drawRoles(ctx: SKRSContext2D, roles: { name: string; color: string }[]): void {
    const x = 370;
    const y = 310;
    const maxRoles = 8;

    // Titre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, Arial, sans-serif';
    ctx.fillText(`🏷️ Rôles (${roles.length})`, x, y - 10);

    // Fond
    ctx.fillStyle = 'rgba(42, 42, 78, 0.6)';
    this.roundRect(ctx, x, y, 470, 100, 12);
    ctx.fill();

    let currentX = x + 15;
    let currentY = y + 30;
    const rowHeight = 30;
    const maxWidth = 450;

    roles.slice(0, maxRoles).forEach((role) => {
      ctx.font = '12px Inter, Arial, sans-serif';
      const textWidth = ctx.measureText(role.name).width + 20;

      // Nouvelle ligne si dépasse
      if (currentX + textWidth > x + maxWidth) {
        currentX = x + 15;
        currentY += rowHeight;
      }

      // Badge du rôle
      const roleColor = role.color === '#000000' ? '#5865F2' : role.color;
      ctx.fillStyle = roleColor + '40'; // Fond semi-transparent
      this.roundRect(ctx, currentX, currentY - 15, textWidth, 22, 11);
      ctx.fill();

      // Bordure
      ctx.strokeStyle = roleColor;
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, currentX, currentY - 15, textWidth, 22, 11);
      ctx.stroke();

      // Texte du rôle
      ctx.fillStyle = '#ffffff';
      ctx.fillText(role.name, currentX + 10, currentY);

      currentX += textWidth + 8;
    });

    // Afficher +X si plus de rôles
    if (roles.length > maxRoles) {
      ctx.fillStyle = '#8892b0';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.fillText(`+${roles.length - maxRoles} autres`, currentX, currentY);
    }
  }

  private static roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private static formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours >= 1) {
      return `${hours}h${minutes > 0 ? minutes + 'm' : ''}`;
    }
    if (minutes >= 1) {
      return `${minutes}m`;
    }
    return `${Math.floor(seconds)}s`;
  }
}
