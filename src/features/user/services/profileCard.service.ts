import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { IGuildUser } from '../models/guild-user.model';
import layoutConfig from './profileCard.layout.json';
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
};

const CARD_WIDTH = 1280;
const CARD_HEIGHT = 720;
const DEFAULT_BACKGROUND_PATH = path.resolve(process.cwd(), 'canva/template.png');
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
};

type LayoutConfigFile = {
  avatar?: { x: number; y: number; radius: number };
  voiceChart?: { x: number; y: number; width: number; height: number };
  xpBar?: { x: number; y: number; width: number; height: number; radius: number; backgroundColor: string; fillColor: string };
  info?: LayoutConfigItem[];
};

type LayoutItem = LayoutConfigItem & {
  text: (data: RenderData) => string | null | undefined;
};

type VoiceDailyTotal = {
  label: string;
  seconds: number;
};

const TEXT_RESOLVERS: Record<string, (data: RenderData) => string | null | undefined> = {
  xpPercent: data => data.xpPercent,
  xpValue: data => data.xpValue,
  username: data => data.username,
  bio: data => data.bio,
  ridgecoinValue: data => data.ridgecoin,
  levelValue: data => data.level,
  birthdayValue: data => data.birthday,
  joinedValue: data => data.joined,
  messagesValue: data => data.messages,
  voiceValue: data => data.voiceTotal,
  voiceChartLegend: data => (data.lastActive !== '-' ? `Dernière activité : ${data.lastActive}` : ''),
  joinedTimeline: () => null,
  lastActiveTimeline: () => null,
};

const layoutFile = layoutConfig as LayoutConfigFile;
const AVATAR_CENTER_X = layoutFile.avatar?.x ?? 1100;
const AVATAR_CENTER_Y = layoutFile.avatar?.y ?? 210;
const AVATAR_RADIUS = layoutFile.avatar?.radius ?? 105;
const AVATAR_SIZE = AVATAR_RADIUS * 2;
const VOICE_CHART_CONFIG = layoutFile.voiceChart ?? { x: 140, y: 400, width: 640, height: 260 };
const XP_BAR_CONFIG = layoutFile.xpBar ?? { x: 200, y: 215, width: 520, height: 42, radius: 24, backgroundColor: 'rgba(20, 28, 45, 0.6)', fillColor: '#8ad3f4' };
const voiceChartLegendLayout = (layoutFile.info ?? []).find(item => item.key === 'voiceChartLegend');
const VOICE_CHART_CENTER = voiceChartLegendLayout?.align === 'center' ? voiceChartLegendLayout.x : undefined;

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
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function renderLayout(ctx: SKRSContext2D, layout: LayoutItem[], data: RenderData): void {
  layout.forEach(item => {
    const content = item.text(data);
    if (!content) return;
    drawText(ctx, content, item.x, item.y, {
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

  const startOfWeek = new Date(today);
  const weekday = startOfWeek.getDay(); // 0 dimanche ... 6 samedi
  const diff = weekday === 0 ? -6 : 1 - weekday; // lundi
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const totals: VoiceDailyTotal[] = [];
  for (let i = 0; i < daysCount; i += 1) {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

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

    const label = dayStart
      .toLocaleDateString('fr-FR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();

    totals.push({ label, seconds });
  }

  return totals;
}

function drawVoiceChart(
  ctx: SKRSContext2D,
  config: { x: number; y: number; width: number; height: number },
  totals: VoiceDailyTotal[],
  centerX?: number
): void {
  if (!config) return;
  const { x, y, width, height } = config;
  ctx.save();
  const offset = centerX !== undefined ? centerX - (x + width / 2) : 0;
  const containerX = x + offset;
  // ctx.fillStyle = 'rgba(12, 18, 31, 0.65)';
  // ctx.fillRect(containerX, y, width, height);

  const maxSeconds = Math.max(...totals.map(t => t.seconds), 0);

  if (maxSeconds === 0) {
    const offset = centerX !== undefined ? centerX - (x + width / 2) : 0;
    drawText(ctx, 'Aucune activité vocale récente', x + width / 2 + offset, y + height / 2, {
      size: 22,
      color: '#FFFFFF',
      align: 'center',
      fontWeight: '500',
    });
    ctx.restore();
    return;
  }

  const paddingBottom = 40;
  const paddingTop = 30;
  const usableHeight = height - paddingBottom - paddingTop;

  let gapBetween = Math.min(40, width * 0.06);
  let barWidth = (width - gapBetween * (totals.length - 1)) / totals.length;
  if (barWidth > 70) {
    barWidth = 70;
    gapBetween = (width - barWidth * totals.length) / Math.max(totals.length - 1, 1);
  } else if (barWidth < 28) {
    barWidth = 28;
    gapBetween = Math.max(12, (width - barWidth * totals.length) / Math.max(totals.length - 1, 1));
  }

  const totalWidth = barWidth * totals.length + gapBetween * Math.max(totals.length - 1, 0);
  const desiredCenter = centerX ?? (containerX + width / 2);
  let startX = desiredCenter - totalWidth / 2;
  startX = Math.max(containerX, Math.min(startX, containerX + width - totalWidth));

  totals.forEach((item, index) => {
    const barHeight = (item.seconds / maxSeconds) * usableHeight;
    const barX = startX + index * (barWidth + gapBetween);
    const barY = y + paddingTop + (usableHeight - barHeight);

    const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    gradient.addColorStop(0, '#8ad3f4');
    gradient.addColorStop(1, '#7fc1df');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    drawText(ctx, item.label, barX + barWidth / 2, y + height - paddingBottom / 2, {
      size: 18,
      color: '#FFFFFF',
      align: 'center',
      fontWeight: '600',
    });

    drawText(ctx, formatDuration(item.seconds), barX + barWidth / 2, barY - 14, {
      size: 18,
      color: '#FFFFFF',
      align: 'center',
      fontWeight: '500',
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

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 1) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
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
    lastActive: guildUser?.infos?.updatedAt ? formatDateFR(guildUser.infos.updatedAt) : '-',
    voiceTotal: formatDuration(voiceTime),
    voiceDailyTotals: computeVoiceDailyTotals(guildUser?.stats?.voiceHistory ?? []),
  };
}

export class ProfileCardService {
  static async generate(options: ProfileCardOptions): Promise<{ buffer: Buffer; filename: string }> {
    registerFontOnce();

    const { view, discordUser, guildUser, guildName } = options;
    const data = getContext(guildUser);
    const renderData = buildRenderData(discordUser, data, guildName);

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    await this.renderBackground(ctx, resolveBackgroundPath(options.backgroundUrl));

    await this.renderCard(ctx, discordUser, renderData);

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
    renderData: RenderData
  ) {
    const avatarUrl = discordUser.displayAvatarURL({ size: 256, extension: 'png' });
    await drawAvatarCircle(ctx, avatarUrl, AVATAR_CENTER_X, AVATAR_CENTER_Y, AVATAR_RADIUS);

    drawProgressBar(
      ctx,
      XP_BAR_CONFIG.x,
      XP_BAR_CONFIG.y,
      XP_BAR_CONFIG.width,
      XP_BAR_CONFIG.height,
      renderData.xpPercentValue,
      {
        backgroundColor: XP_BAR_CONFIG.backgroundColor,
        fillColor: XP_BAR_CONFIG.fillColor,
        radius: XP_BAR_CONFIG.radius,
      }
    );

    drawVoiceChart(ctx, VOICE_CHART_CONFIG, renderData.voiceDailyTotals, VOICE_CHART_CENTER);

    renderLayout(ctx, CARD_LAYOUT, renderData);
  }
}
