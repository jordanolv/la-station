import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { IGuildUser } from '../models/guild-user.model';
import layoutConfig from './meCard.layout.json';
import path from 'path';

type ProfileCardView = 'info' | 'stats';

type ProfileCardOptions = {
  view: ProfileCardView;
  discordUser: {
    username: string;
    displayAvatarURL: (options?: { size?: number; extension?: string }) => string;
  };
  guildUser: IGuildUser | (IGuildUser & { toObject?: () => IGuildUser });
  guildName: string;
  backgroundUrl?: string;
  roles?: { name: string; color: string }[];
};

const CARD_WIDTH = 1280;
const CARD_HEIGHT = 720;
const DEFAULT_BACKGROUND_PATH = path.resolve(process.cwd(), 'canva/assets/me-template.png');
const DEFAULT_FONT_PATH = path.resolve(process.cwd(), 'src/assets/fonts/HelveticaNeueLTStd-Bd.otf');

type CanvasAlign = 'left' | 'right' | 'center' | 'start' | 'end';

type RenderData = {
  username: string;
  guildName: string;
  xpPercent: string;
  xpPercentValue: number;
  xpValue: string;
  bio: string;
  ridgecoin: string;
  birthday: string;
  messages: string;
  level: string;
  joined: string;
  lastActive: string;
  voiceTotal: string;
  dailyStreak: string;
  voiceDailyTotals: VoiceDailyTotal[];
};

type LayoutConfigItem = {
  key: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: CanvasAlign;
  group?: string;
};

type LayoutConfigFile = {
  avatar?: { x: number; y: number; radius: number };
  voiceChart?: { x: number; y: number; width: number; height: number; centerX?: number; legendOffsetX?: number; legendOffsetY?: number };
  xpBar?: { x: number; y: number; width: number; height: number; radius: number; backgroundColor: string; fillColor: string };
  xpGroup?: { offsetX: number; offsetY: number };
  roleBadges?: { x: number; y: number; maxWidth: number; maxHeight: number; badgeHeight: number; gap: number };
  info?: LayoutConfigItem[];
};

type LayoutItem = LayoutConfigItem & {
  text: (data: RenderData) => string | null | undefined;
};

type VoiceDailyTotal = {
  label: string;
  dateLabel: string;
  seconds: number;
  previousSeconds: number;
};

const TEXT_RESOLVERS: Record<string, (data: RenderData) => string | null | undefined> = {
  xpPercent: data => data.xpPercent,
  xpValue: data => data.xpValue,
  xpValueWithPercent: data => `${data.xpValue} (${data.xpPercent})`,
  username: data => data.username,
  bio: data => data.bio,
  ridgecoinValue: data => data.ridgecoin,
  levelValue: data => data.level,
  birthdayValue: data => data.birthday,
  joinedValue: data => data.joined,
  messagesValue: data => data.messages,
  voiceValue: data => data.voiceTotal,
  dailyStreakValue: data => data.dailyStreak,
  lastActivity: data => (data.lastActive !== '-' ? `Dernière activité : ${data.lastActive}` : ''),
  voiceChartLegend: () => null,
  joinedTimeline: () => null,
};

const layoutFile = layoutConfig as LayoutConfigFile;
const AVATAR_CENTER_X = layoutFile.avatar?.x ?? 1100;
const AVATAR_CENTER_Y = layoutFile.avatar?.y ?? 210;
const AVATAR_RADIUS = layoutFile.avatar?.radius ?? 105;
const AVATAR_SIZE = AVATAR_RADIUS * 2;
const VOICE_CHART_CONFIG = layoutFile.voiceChart ?? { x: 140, y: 400, width: 640, height: 260 };
const XP_BAR_CONFIG = layoutFile.xpBar ?? { x: 200, y: 215, width: 520, height: 42, radius: 24, backgroundColor: 'rgba(20, 28, 45, 0.6)', fillColor: '#8ad3f4' };
const XP_GROUP_OFFSET = layoutFile.xpGroup ?? { offsetX: 0, offsetY: 0 };
const ROLE_BADGES_CONFIG = layoutFile.roleBadges ?? { x: 100, y: 300, maxWidth: 600, maxHeight: 100, badgeHeight: 28, gap: 8 };
const VOICE_CHART_CENTER = layoutFile.voiceChart?.centerX;

const CARD_LAYOUT: LayoutItem[] = (layoutFile.info ?? []).map(item => ({
  ...item,
  text: TEXT_RESOLVERS[item.key] ?? (() => undefined),
}));

function resolveBackgroundPath(custom?: string): string | undefined {
  if (custom && custom.trim().length > 0) {
    return custom.trim();
  }

  const envPath = process.env.PROFILE_CARD_BACKGROUND_URL;
  if (envPath && envPath.trim().length > 0) {
    return envPath.trim();
  }

  return DEFAULT_BACKGROUND_PATH;
}

function registerEmojiFont() {
  if (GlobalFonts.has('NotoColorEmoji')) return;

  // Try to register Noto Color Emoji for emoji support
  try {
    // Try different possible locations for Noto Color Emoji
    const possiblePaths = [
      // macOS system font
      '/System/Library/Fonts/Apple Color Emoji.ttc',
      '/Library/Fonts/Apple Color Emoji.ttc',
      // Linux system fonts
      '/usr/share/fonts/truetype/noto-color-emoji/NotoColorEmoji.ttf',
      '/usr/share/fonts/noto-color-emoji/NotoColorEmoji.ttf',
      // Windows system font
      'C:\\Windows\\Fonts\\seguiemj.ttf',
      // Fallback to any Noto Color Emoji
      require.resolve('@fontsource/noto-color-emoji/files/noto-color-emoji-400-normal.ttf')
    ];

    for (const fontPath of possiblePaths) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'NotoColorEmoji');
        return;
      } catch {
        continue;
      }
    }
  } catch {
    // If all fail, continue without emoji font
  }
}

function registerFontOnce() {
  if (GlobalFonts.has('Inter')) return;

  // 0) Project default font path (user-defined)
  try {
    GlobalFonts.registerFromPath(DEFAULT_FONT_PATH, 'Inter');
    return;
  } catch {
    // ignore and try next sources
  }

  // 1) Environment override (supports multiple fonts per env without code changes)
  const envPath = process.env.PROFILE_CARD_FONT_PATH && process.env.PROFILE_CARD_FONT_PATH.trim().length > 0
    ? process.env.PROFILE_CARD_FONT_PATH.trim()
    : undefined;
  if (envPath) {
    try {
      GlobalFonts.registerFromPath(envPath, 'Inter');
      return;
    } catch {
      // ignore and try next sources
    }
  }

  // 2) Packaged font via @fontsource (no manual copy needed)
  try {
    const ttfPath = require.resolve('@fontsource/inter/files/inter-latin-600-normal.ttf');
    GlobalFonts.registerFromPath(ttfPath, 'Inter');
    return;
  } catch {
    // ignore and try fallbacks
  }

  // 3) Common deployment targets
  try {
    const distFontPath = path.resolve(process.cwd(), 'dist/assets/Inter-SemiBold.ttf');
    GlobalFonts.registerFromPath(distFontPath, 'Inter');
    return;
  } catch {
    // ignore
  }

  try {
    const distFontsDirPath = path.resolve(process.cwd(), 'dist/assets/fonts/Inter-SemiBold.ttf');
    GlobalFonts.registerFromPath(distFontsDirPath, 'Inter');
    return;
  } catch {
    // ignore
  }

  // 3b) Dist fallbacks for Helvetica default
  try {
    const distHelv = path.resolve(process.cwd(), 'dist/assets/HelveticaNeueLTStd-Bd.otf');
    GlobalFonts.registerFromPath(distHelv, 'Inter');
    return;
  } catch {
    // ignore
  }

  try {
    const distHelvDir = path.resolve(process.cwd(), 'dist/assets/fonts/HelveticaNeueLTStd-Bd.otf');
    GlobalFonts.registerFromPath(distHelvDir, 'Inter');
    return;
  } catch {
    // ignore
  }

  // 4) Local dev source
  try {
    const fontPath = path.resolve(process.cwd(), 'src/assets/fonts/Inter-SemiBold.ttf');
    GlobalFonts.registerFromPath(fontPath, 'Inter');
  } catch {
    // Fallback to system fonts if Inter not found
  }
}

function getContext(guildUser: IGuildUser | (IGuildUser & { toObject?: () => IGuildUser })): IGuildUser {
  if (typeof (guildUser as any).toObject === 'function') {
    return (guildUser as any).toObject();
  }
  return guildUser;
}

function drawRoundedRect(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number, color: string, opacity = 1): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  options: { size?: number; color?: string; align?: CanvasAlign; fontWeight?: string; fontFamily?: string } = {}
): void {
  const { size = 32, color = '#FFFFFF', align = 'left', fontWeight = '600', fontFamily = 'Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif' } = options;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  
  // Check if text contains emojis and use appropriate font stack
  const hasEmojis = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
  const fontStack = hasEmojis 
    ? `${fontWeight} ${size}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", ${fontFamily}`
    : `${fontWeight} ${size}px ${fontFamily}`;
  
  ctx.font = fontStack;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function darkenColor(hex: string, factor: number = 0.15): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(20, 28, 45, 0.8)';
  const r = Math.floor(rgb.r * factor);
  const g = Math.floor(rgb.g * factor);
  const b = Math.floor(rgb.b * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function cleanRoleName(name: string): string {
  // Supprimer les emojis Discord (:emoji:) et les emojis Unicode
  return name
    .replace(/:[a-zA-Z0-9_]+:/g, '') // Emojis Discord (:x:, :emoji:, etc.)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Emojis Unicode
    .trim();
}

function drawRoleBadges(
  ctx: SKRSContext2D,
  roles: { name: string; color: string }[],
  config: { x: number; y: number; maxWidth: number; maxHeight: number; badgeHeight: number; gap: number }
): void {
  if (!roles || roles.length === 0) return;

  ctx.save();
  const { x, y, maxWidth, maxHeight, badgeHeight, gap } = config;
  const fontSize = badgeHeight * 0.55;
  const circleRadius = badgeHeight * 0.25;
  const paddingX = badgeHeight * 0.5;
  const gapBetweenCircleAndText = badgeHeight * 0.35;
  const paddingLeft = paddingX + circleRadius * 2 + gapBetweenCircleAndText;

  let currentX = x;
  let currentY = y;

  roles.forEach(role => {
    const cleanName = cleanRoleName(role.name);
    if (!cleanName) return; // Skip si le nom est vide après nettoyage

    ctx.font = `500 ${fontSize}px Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    const textMetrics = ctx.measureText(cleanName);
    const badgeWidth = paddingLeft + textMetrics.width + paddingX;

    if (currentX + badgeWidth > x + maxWidth && currentX > x) {
      currentX = x;
      currentY += badgeHeight + gap;
    }

    // Vérifier si on dépasse la hauteur max
    if (currentY + badgeHeight > y + maxHeight) {
      return; // Stop rendering badges
    }

    const roleColor = role.color === '#000000' ? '#99aab5' : role.color;
    const darkBgColor = darkenColor(roleColor, 0.15);

    drawRoundedRect(ctx, currentX, currentY, badgeWidth, badgeHeight, badgeHeight / 2, darkBgColor, 0.9);

    ctx.beginPath();
    ctx.arc(currentX + paddingX + circleRadius, currentY + badgeHeight / 2, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = roleColor;
    ctx.fill();

    const textX = currentX + paddingX + circleRadius * 2 + gapBetweenCircleAndText;
    const textY = currentY + badgeHeight / 2;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `500 ${fontSize}px Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(cleanName, textX, textY);
    ctx.restore();

    currentX += badgeWidth + gap;
  });

  ctx.restore();
}

function renderLayout(ctx: SKRSContext2D, layout: LayoutItem[], data: RenderData, xpGroupOffset = { offsetX: 0, offsetY: 0 }): void {
  layout.forEach(item => {
    const content = item.text(data);
    if (!content) return;

    // Appliquer l'offset si l'item appartient au groupe xpGroup
    const offsetX = item.group === 'xpGroup' ? xpGroupOffset.offsetX : 0;
    const offsetY = item.group === 'xpGroup' ? xpGroupOffset.offsetY : 0;

    // Rendu standard
    drawText(ctx, content, item.x + offsetX, item.y + offsetY, {
      size: item.fontSize,
      color: item.color,
      align: item.align,
      fontWeight: item.fontWeight,
    });
  });
}

function computeVoiceDailyTotals(history: any[]): VoiceDailyTotal[] {
  const daysCount = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totals: VoiceDailyTotal[] = [];

  for (let i = daysCount - 1; i >= 0; i -= 1) {
    // Jour actuel (7 derniers jours glissants)
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Jour correspondant 7 jours avant (pour la comparaison)
    const previousDayStart = new Date(dayStart);
    previousDayStart.setDate(dayStart.getDate() - 7);
    const previousDayEnd = new Date(previousDayStart);
    previousDayEnd.setDate(previousDayEnd.getDate() + 1);

    const seconds = (history ?? []).reduce((sum, entry) => {
      if (!entry) return sum;
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return sum;
      if (entryDate >= dayStart && entryDate < dayEnd) {
        const time = typeof entry.time === 'number' ? entry.time : 0;
        return sum + time;
      }
      return sum;
    }, 0);

    const previousSeconds = (history ?? []).reduce((sum, entry) => {
      if (!entry) return sum;
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return sum;
      if (entryDate >= previousDayStart && entryDate < previousDayEnd) {
        const time = typeof entry.time === 'number' ? entry.time : 0;
        return sum + time;
      }
      return sum;
    }, 0);

    const label = dayStart
      .toLocaleDateString('fr-FR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();

    const dateLabel = dayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    totals.push({ label, dateLabel, seconds, previousSeconds });
  }

  return totals;
}

function drawVoiceChart(
  ctx: SKRSContext2D,
  config: { x: number; y: number; width: number; height: number; centerX?: number; legendOffsetX?: number; legendOffsetY?: number },
  totals: VoiceDailyTotal[],
  centerX?: number
): void {
  if (!config) return;
  const { x, y, width, height, legendOffsetX = 0, legendOffsetY = 20 } = config;
  // Use centerX from config if provided, otherwise use the parameter
  const effectiveCenterX = config.centerX !== undefined ? config.centerX : centerX;
  ctx.save();
  const offset = effectiveCenterX !== undefined ? effectiveCenterX - (x + width / 2) : 0;
  const containerX = x + offset;

  const maxSeconds = Math.max(...totals.map(t => Math.max(t.seconds, t.previousSeconds)), 0);

  if (maxSeconds === 0) {
    const offset = effectiveCenterX !== undefined ? effectiveCenterX - (x + width / 2) : 0;
    drawText(ctx, 'Aucune activité vocale récente', x + width / 2 + offset, y + height / 2, {
      size: 22,
      color: '#FFFFFF',
      align: 'center',
      fontWeight: '500',
    });
    ctx.restore();
    return;
  }

  // Draw legend at the bottom of the chart (left side)
  const legendY = y + height + legendOffsetY;
  const legendStartX = containerX + legendOffsetX;
  const squareSize = 9;
  const legendGap = 5;
  const spaceBetweenItems = 79;

  // Gray square (previous week)
  ctx.fillStyle = 'rgba(220, 220, 230, 0.7)';
  ctx.fillRect(legendStartX, legendY - squareSize / 2, squareSize, squareSize);
  ctx.fillStyle = 'rgba(220, 220, 230, 0.8)';
  ctx.font = '400 11px "Montserrat", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sem. dern.', legendStartX + squareSize + legendGap, legendY);

  // Blue square (current week)
  const legendBlueX = legendStartX + spaceBetweenItems;
  ctx.fillStyle = '#8ad3f4';
  ctx.fillRect(legendBlueX, legendY - squareSize / 2, squareSize, squareSize);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '500 11px "Montserrat", sans-serif';
  ctx.fillText('Cette sem.', legendBlueX + squareSize + legendGap, legendY);

  const paddingTop = 30;
  const paddingBottom = 45;
  const paddingLeft = 35;
  const paddingRight = 10;
  const usableHeight = height - paddingBottom - paddingTop;
  const usableWidth = width - paddingLeft - paddingRight;
  const chartStartX = containerX + paddingLeft;

  const segmentWidth = usableWidth / (totals.length - 1);

  // Draw Y-axis grid and labels with rounded values
  const maxHours = Math.ceil(maxSeconds / 3600);
  const step = Math.max(1, Math.ceil(maxHours / 4));
  const gridValues: number[] = [];

  for (let h = 0; h <= maxHours; h += step) {
    gridValues.push(h * 3600);
  }

  gridValues.forEach(value => {
    const ratio = value / maxSeconds;
    const gridY = y + paddingTop + usableHeight * (1 - ratio);

    // Draw grid line
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartStartX, gridY);
    ctx.lineTo(chartStartX + usableWidth, gridY);
    ctx.stroke();
    ctx.restore();
  });

  // Build points for continuous line chart
  const currentPoints = totals.map((item, index) => {
    const pointX = chartStartX + index * segmentWidth;
    const pointHeight = (item.seconds / maxSeconds) * usableHeight;
    const pointY = y + paddingTop + (usableHeight - pointHeight);
    return { x: pointX, y: pointY, value: item.seconds };
  });

  const previousPoints = totals.map((item, index) => {
    const pointX = chartStartX + index * segmentWidth;
    const pointHeight = (item.previousSeconds / maxSeconds) * usableHeight;
    const pointY = y + paddingTop + (usableHeight - pointHeight);
    return { x: pointX, y: pointY, value: item.previousSeconds };
  });

  // Draw previous week area chart (gray - behind current week)
  ctx.save();

  // Fill area under the curve
  ctx.beginPath();
  ctx.moveTo(previousPoints[0].x, y + paddingTop + usableHeight);
  previousPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.lineTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.lineTo(previousPoints[previousPoints.length - 1].x, y + paddingTop + usableHeight);
  ctx.closePath();
  ctx.fillStyle = 'rgba(220, 220, 230, 0.15)';
  ctx.fill();

  // Draw line
  ctx.beginPath();
  previousPoints.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = 'rgba(220, 220, 230, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Draw current week area chart (blue)
  ctx.save();

  // Fill area under the curve
  ctx.beginPath();
  ctx.moveTo(currentPoints[0].x, y + paddingTop + usableHeight);
  currentPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.lineTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.lineTo(currentPoints[currentPoints.length - 1].x, y + paddingTop + usableHeight);
  ctx.closePath();
  ctx.fillStyle = 'rgba(138, 211, 244, 0.4)';
  ctx.fill();

  // Draw line with glow effect
  ctx.save();
  ctx.shadowColor = '#8ad3f4';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  currentPoints.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = '#8ad3f4';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Draw dots and values for current week (blue) with percentage change
  currentPoints.forEach((point, index) => {
    if (totals[index].seconds > 0) {
      // Draw dot
      ctx.save();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#8ad3f4';
      ctx.fill();
      ctx.restore();

      // Draw value above dot
      const currentValue = formatDuration(totals[index].seconds, true);
      drawText(ctx, currentValue, point.x, point.y - 18, {
        size: 18,
        color: '#FFFFFF',
        align: 'center',
        fontWeight: '600',
      });

      // Calculate and draw percentage change
      if (totals[index].previousSeconds > 0) {
        const diff = totals[index].seconds - totals[index].previousSeconds;
        const percentChange = Math.round((diff / totals[index].previousSeconds) * 100);

        if (percentChange !== 0) {
          const sign = percentChange > 0 ? '+' : '';
          const percentText = `${sign}${percentChange}%`;
          const percentColor = percentChange > 0 ? '#2ecc71' : '#e74c3c';

          drawText(ctx, percentText, point.x, point.y - 35, {
            size: 14,
            color: percentColor,
            align: 'center',
            fontWeight: '600',
          });
        }
      }
    }
  });

  ctx.restore();

  // Draw labels below each point
  totals.forEach((item, index) => {
    const pointX = chartStartX + index * segmentWidth;

    // Draw day label (LUN, MAR, etc.)
    drawText(ctx, item.label, pointX, y + height - 22, {
      size: 16,
      color: '#FFFFFF',
      align: 'center',
      fontWeight: '600',
    });

    // Draw date label (13/10)
    drawText(ctx, item.dateLabel, pointX, y + height - 6, {
      size: 13,
      color: 'rgba(255, 255, 255, 0.6)',
      align: 'center',
      fontWeight: '400',
    });
  });

  ctx.restore();
}

function drawProgressBar(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  options: { backgroundColor?: string; fillColor?: string; radius?: number } = {}
): void {
  const { backgroundColor = 'rgba(13, 20, 31, 0.75)', fillColor = '#FFFFFF', radius = height / 2 } = options;
  const clampedPercent = Math.max(0, Math.min(1, percent));

  drawRoundedRect(ctx, x, y, width, height, radius, backgroundColor, 1);
  drawRoundedRect(ctx, x, y, width * clampedPercent, height, radius, fillColor, 1);
}

async function drawAvatarCircle(ctx: SKRSContext2D, url: string, centerX: number, centerY: number, radius: number): Promise<void> {
  if (!url) return;
  try {
    const avatar = await loadImage(url);
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();
  } catch {
    // ignore avatar errors
  }
}

function calculateXpProgress(level: number, experience: number): { current: number; required: number; percent: number } {
  const xpForCurrentLevel = 5 * (level ** 2) + 110 * level + 100;
  const xpForPreviousLevel = level > 1 ? 5 * ((level - 1) ** 2) + 110 * (level - 1) + 100 : 0;
  const current = Math.max(0, experience - xpForPreviousLevel);
  const required = Math.max(1, xpForCurrentLevel - xpForPreviousLevel);
  const percent = Math.min(1, current / required);
  return { current, required, percent };
}

function formatDuration(seconds: number, compact: boolean = false): string {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const separator = compact ? '' : ' ';
  if (hours >= 1) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h${separator}${rest}m` : `${hours}h`;
  }
  if (minutes >= 1) {
    const restSec = Math.floor(seconds % 60);
    return restSec > 0 ? `${minutes}m${separator}${restSec}s` : `${minutes}m`;
  }
  return `${Math.floor(seconds)}s`;
}

function formatDurationHoursOnly(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 1) {
    return `${hours}h`;
  }
  if (minutes >= 1) {
    const restSec = Math.floor(seconds % 60);
    return restSec > 0 ? `${minutes}m ${restSec}s` : `${minutes}m`;
  }
  return `${Math.floor(seconds)}s`;
}

function formatDateFR(date?: Date | string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildRenderData(
  discordUser: ProfileCardOptions['discordUser'],
  guildUser: IGuildUser,
  guildName: string
): RenderData {
  const level = guildUser?.profil?.lvl ?? 0;
  const experience = guildUser?.profil?.exp ?? 0;
  const money = guildUser?.profil?.money ?? 0;
  const totalMessages = guildUser?.stats?.totalMsg ?? 0;
  const voiceTime = guildUser?.stats?.voiceTime ?? 0;
  const dailyStreak = guildUser?.stats?.dailyStreak ?? 0;

  const { current, required, percent } = calculateXpProgress(level, experience);

  const safeBio = guildUser?.bio && guildUser.bio.trim().length > 0 ? guildUser.bio : 'Aucune bio définie.';

  return {
    username: discordUser.username,
    guildName,
    xpPercent: `${Math.round(percent * 100)}%`,
    xpPercentValue: percent,
    xpValue: `${current.toLocaleString('fr-FR')}/${required.toLocaleString('fr-FR')} XP`,
    bio: safeBio,
    ridgecoin: money.toLocaleString('fr-FR'),
    birthday: guildUser?.infos?.birthDate ? formatDateFR(guildUser.infos.birthDate) : '-',
    messages: totalMessages.toLocaleString('fr-FR'),
    level: String(level),
    joined: guildUser?.infos?.registeredAt ? formatDateFR(guildUser.infos.registeredAt) : '-',
    lastActive: guildUser?.stats?.lastActivityDate ? formatDateFR(guildUser.stats.lastActivityDate) : '-',
    voiceTotal: formatDurationHoursOnly(voiceTime),
    dailyStreak: String(dailyStreak),
    voiceDailyTotals: computeVoiceDailyTotals(guildUser?.stats?.voiceHistory ?? []),
  };
}

export class ProfileCardService {
  static async generate(options: ProfileCardOptions): Promise<{ buffer: Buffer; filename: string }> {
    registerFontOnce();
    registerEmojiFont();

    const { view, discordUser, guildUser, guildName, roles } = options;
    const data = getContext(guildUser);
    const renderData = buildRenderData(discordUser, data, guildName);

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    await this.renderBackground(ctx, resolveBackgroundPath(options.backgroundUrl));

    await this.renderCard(ctx, discordUser, renderData, roles);

    const buffer = canvas.toBuffer('image/png');
    const filename = `profile-${view}.png`;

    return { buffer, filename };
  }

  private static async renderBackground(ctx: SKRSContext2D, background?: string) {
    if (background) {
      try {
        const image = await loadImage(background);
        ctx.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
        return;
      } catch {
        // Fallback to gradient
      }
    }

    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, '#16233A');
    gradient.addColorStop(1, '#0B1220');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  }

  private static async renderCard(
    ctx: SKRSContext2D,
    discordUser: ProfileCardOptions['discordUser'],
    renderData: RenderData,
    roles?: { name: string; color: string }[]
  ) {
    const avatarUrl = discordUser.displayAvatarURL({ size: 256, extension: 'png' });
    await drawAvatarCircle(ctx, avatarUrl, AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS);

    drawProgressBar(
      ctx,
      XP_BAR_CONFIG.x + XP_GROUP_OFFSET.offsetX,
      XP_BAR_CONFIG.y + XP_GROUP_OFFSET.offsetY,
      XP_BAR_CONFIG.width,
      XP_BAR_CONFIG.height,
      renderData.xpPercentValue,
      {
        backgroundColor: XP_BAR_CONFIG.backgroundColor,
        fillColor: XP_BAR_CONFIG.fillColor,
        radius: XP_BAR_CONFIG.radius,
      }
    );

    if (roles && roles.length > 0) {
      drawRoleBadges(ctx, roles, ROLE_BADGES_CONFIG);
    }

    drawVoiceChart(ctx, VOICE_CHART_CONFIG, renderData.voiceDailyTotals, VOICE_CHART_CENTER);

    renderLayout(ctx, CARD_LAYOUT, renderData, XP_GROUP_OFFSET);
  }
}
