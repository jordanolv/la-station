/**
 * Service de rendu pour le template /me
 * Combine PSD (pour les textes variables) + Canvas (pour les overlays dynamiques)
 */

import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas';
import { TemplateRenderService } from '../../../shared/template-render.service';
import { extractReferenceLayersFromPsd, LayerPosition } from '../../test/services/psd-render.service';
import { IGuildUser } from '../models/guild-user.model';
import layoutConfig from './meCard.layout.json';
import path from 'path';

type LayoutConfigItem = {
  key: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: 'left' | 'right' | 'center' | 'start' | 'end';
  group?: string;
};

type VoiceDailyTotal = {
  label: string;
  dateLabel: string;
  seconds: number;
  previousSeconds: number;
};

type MeCardOptions = {
  discordUser: {
    username: string;
    displayAvatarURL: (options?: { size?: number; extension?: string }) => string;
  };
  guildUser: IGuildUser | (IGuildUser & { toObject?: () => IGuildUser });
  guildName: string;
  roles?: { name: string; color: string }[];
};

type MeRenderData = {
  username: string;
  guildName: string;
  xpPercent: string;
  xpPercentValue: number;
  xpValue: string;
  xpValueWithPercent: string;
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
  joinedTimeline: string;
  avatarUrl?: string;
  roles?: { name: string; color: string }[];
};

const layoutFile = layoutConfig as any;

// Text resolvers pour les textes additionnels (non gérés par le PSD)
const TEXT_RESOLVERS: Record<string, (data: MeRenderData) => string | null> = {
  xpPercent: data => data.xpPercent,
  xpValue: data => data.xpValue,
  xpValueWithPercent: data => `${data.xpValue} (${data.xpPercent})`,
  username: data => data.username,
  joinedTimeline: () => null, // Géré par le graphique
  lastActivity: data => (data.lastActive !== '-' ? `Dernière activité : ${data.lastActive}` : ''),
  voiceChartLegend: () => null, // Géré par le graphique
};

export class MeTemplateService {
  private static readonly TEMPLATE_NAME = 'me';
  private static psdPositionsCache: Record<string, LayerPosition> | null = null;

  /**
   * Vide le cache des positions PSD (utile en dev quand tu modifies le PSD)
   */
  static clearCache(): void {
    this.psdPositionsCache = null;
    console.log('[MeTemplate] Cache cleared');
  }

  /**
   * Charge les positions des calques de référence depuis le PSD (avec cache)
   */
  private static async loadPsdPositions(): Promise<Record<string, LayerPosition>> {
    // En mode dev, désactiver le cache pour voir les changements immédiatement
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

    if (this.psdPositionsCache && !isDev) {
      return this.psdPositionsCache;
    }

    const config = TemplateRenderService.loadTemplateConfig(this.TEMPLATE_NAME);
    const templatesDir = path.resolve(process.cwd(), 'canva/templates', this.TEMPLATE_NAME);
    const psdPath = path.join(templatesDir, config.psd);

    console.log('[MeTemplate] Loading PSD positions from:', psdPath);
    this.psdPositionsCache = await extractReferenceLayersFromPsd(psdPath);
    return this.psdPositionsCache;
  }

  /**
   * Génère la carte /me avec le système PSD hybride
   */
  static async generate(options: MeCardOptions): Promise<{ buffer: Buffer; filename: string }> {
    const { discordUser, guildUser, guildName, roles } = options;
    const data = this.getContext(guildUser);
    const renderData = this.buildRenderData(discordUser, data, guildName);

    // Charger la config du template
    const config = TemplateRenderService.loadTemplateConfig(this.TEMPLATE_NAME);

    // Charger les positions des calques de référence depuis le PSD
    const psdPositions = await this.loadPsdPositions();

    // 1️⃣ Rendre le PSD avec les variables textuelles (RC, LVL, BIRTHDAY, etc.)
    const psdData = this.mapPsdData(renderData);
    const buffer = await TemplateRenderService.render(this.TEMPLATE_NAME, {
      ...psdData,
      avatarUrl: discordUser.displayAvatarURL({ size: 256, extension: 'png' }),
      xpPercent: renderData.xpPercentValue,
      voiceDailyTotals: renderData.voiceDailyTotals,
      roles,
    });

    // 2️⃣ Charger l'image rendue et ajouter les overlays spécifiques à /me
    const canvas = createCanvas(config.dimensions.width, config.dimensions.height);
    const ctx = canvas.getContext('2d');
    const renderedImage = await loadImage(buffer);
    ctx.drawImage(renderedImage, 0, 0);

    // 3️⃣ Dessiner les overlays canvas additionnels (badges, graphique, textes)
    const avatarUrl = discordUser.displayAvatarURL({ size: 256, extension: 'png' });
    await this.renderAdditionalOverlays(ctx, renderData, roles, psdPositions, avatarUrl);

    const finalBuffer = canvas.toBuffer('image/png');
    return { buffer: finalBuffer, filename: 'profile-me.png' };
  }

  /**
   * Mappe les données vers les variables PSD
   */
  private static mapPsdData(data: MeRenderData): Record<string, string> {
    return {
      ridgecoin: data.ridgecoin,
      level: data.level,
      birthday: data.birthday,
      joinedDate: data.joined,
      messages: data.messages,
      voiceTime: data.voiceTotal,
      dailyStreak: data.dailyStreak,
      username: data.username,
      lastActivity: data.lastActive !== '-' ? `Dernière activité : ${data.lastActive}` : '',
    };
  }

  /**
   * Dessine les overlays additionnels (badges, graphique, textes non-PSD)
   */
  private static async renderAdditionalOverlays(
    ctx: SKRSContext2D,
    data: MeRenderData,
    roles?: { name: string; color: string }[],
    psdPositions?: Record<string, LayerPosition>,
    avatarUrl?: string
  ): Promise<void> {
    const config = layoutFile;

    // Utiliser les positions du PSD si disponibles, sinon fallback sur le config
    const avatarConfig = psdPositions?.AVATAR
      ? {
          x: psdPositions.AVATAR.centerX!,
          y: psdPositions.AVATAR.centerY!,
          radius: psdPositions.AVATAR.radius!
        }
      : config.avatar;


    const xpBarConfig = psdPositions?.XP_BAR
      ? {
          x: psdPositions.XP_BAR.x,
          y: psdPositions.XP_BAR.y,
          width: psdPositions.XP_BAR.width,
          height: psdPositions.XP_BAR.height,
          radius: psdPositions.XP_BAR.height / 2,
          backgroundColor: config.xpBar?.backgroundColor || 'rgba(20, 28, 45, 0.8)',
          fillColor: config.xpBar?.fillColor || '#8ad3f4'
        }
      : config.xpBar;

    const roleBadgesConfig = psdPositions?.ROLE_BADGES
      ? {
          x: psdPositions.ROLE_BADGES.x,
          y: psdPositions.ROLE_BADGES.y,
          maxWidth: psdPositions.ROLE_BADGES.width,
          maxHeight: psdPositions.ROLE_BADGES.height,
          badgeHeight: config.roleBadges?.badgeHeight || 28,
          gap: config.roleBadges?.gap || 8
        }
      : config.roleBadges;

    // Voice chart et légende
    const voiceChartConfig = psdPositions?.VOICE_CHART
      ? {
          x: psdPositions.VOICE_CHART.x,
          y: psdPositions.VOICE_CHART.y,
          width: psdPositions.VOICE_CHART.width,
          height: psdPositions.VOICE_CHART.height,
          centerX: psdPositions.VOICE_CHART.centerX,
          legendOffsetX: config.voiceChart?.legendOffsetX || 20,
          legendOffsetY: config.voiceChart?.legendOffsetY || 37,
          // Si LEGEND est défini, calculer les offsets depuis la position de la légende
          ...(psdPositions?.LEGEND ? {
            legendOffsetX: psdPositions.LEGEND.x - psdPositions.VOICE_CHART.x,
            legendOffsetY: psdPositions.LEGEND.y - psdPositions.VOICE_CHART.y - psdPositions.VOICE_CHART.height
          } : {})
        }
      : config.voiceChart;

    // Avatar circulaire
    if (avatarUrl && avatarConfig) {
      await this.drawAvatarCircle(ctx, avatarUrl, avatarConfig.x, avatarConfig.y, avatarConfig.radius);
    }

    // Barre XP
    if (xpBarConfig) {
      this.drawProgressBar(
        ctx,
        xpBarConfig.x,
        xpBarConfig.y,
        xpBarConfig.width,
        xpBarConfig.height,
        data.xpPercentValue,
        {
          backgroundColor: xpBarConfig.backgroundColor,
          fillColor: xpBarConfig.fillColor,
          radius: xpBarConfig.radius
        }
      );
    }

    // Badges de rôles
    if (roles && roles.length > 0 && roleBadgesConfig) {
      this.drawRoleBadges(ctx, roles, roleBadgesConfig);
    }

    // Graphique vocal
    if (voiceChartConfig) {
      this.drawVoiceChart(ctx, voiceChartConfig, data.voiceDailyTotals);
    }

    // Textes additionnels (username, xpValueWithPercent, lastActivity, etc.)
    if (config.info) {
      // Créer une version modifiée du layout avec les positions du PSD
      let modifiedInfo = [...config.info];

      // XP_BAR : centrer le texte XP dans la barre
      if (psdPositions?.XP_BAR && xpBarConfig) {
        const xpTextIndex = modifiedInfo.findIndex(item => item.key === 'xpValueWithPercent');
        if (xpTextIndex !== -1) {
          const barCenterX = xpBarConfig.x + xpBarConfig.width / 2;
          const barCenterY = xpBarConfig.y + xpBarConfig.height / 2;
          modifiedInfo[xpTextIndex] = {
            ...modifiedInfo[xpTextIndex],
            x: barCenterX,
            y: barCenterY,
            group: undefined
          };
        }
      }

      // USERNAME et LAST_ACTIVITY sont maintenant gérés par le PSD ({{USERNAME}} et {{LAST_ACTIVITY}})
      // On les enlève du rendu Canvas
      modifiedInfo = modifiedInfo.filter(item => item.key !== 'username' && item.key !== 'lastActivity');

      this.renderLayoutTexts(ctx, modifiedInfo, data, config.xpGroup);
    }

    // Log des positions trouvées dans le PSD
    if (psdPositions) {
      console.log('[MeTemplate] Positions loaded from PSD:', Object.keys(psdPositions));
    }
  }

  /**
   * Dessine les badges de rôles
   */
  private static drawRoleBadges(
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
      const cleanName = this.cleanRoleName(role.name);
      if (!cleanName) return;

      ctx.font = `500 ${fontSize}px Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
      const textMetrics = ctx.measureText(cleanName);
      const badgeWidth = paddingLeft + textMetrics.width + paddingX;

      if (currentX + badgeWidth > x + maxWidth && currentX > x) {
        currentX = x;
        currentY += badgeHeight + gap;
      }

      if (currentY + badgeHeight > y + maxHeight) {
        return;
      }

      const roleColor = role.color === '#000000' ? '#99aab5' : role.color;
      const darkBgColor = this.darkenColor(roleColor, 0.15);

      this.drawRoundedRect(ctx, currentX, currentY, badgeWidth, badgeHeight, badgeHeight / 2, darkBgColor, 0.9);

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

  /**
   * Dessine le graphique vocal
   */
  private static drawVoiceChart(
    ctx: SKRSContext2D,
    config: { x: number; y: number; width: number; height: number; centerX?: number; legendOffsetX?: number; legendOffsetY?: number },
    totals: VoiceDailyTotal[]
  ): void {
    if (!config || !totals || totals.length === 0) return;

    const { x, y, width, height, legendOffsetX = 0, legendOffsetY = 37 } = config;
    const effectiveCenterX = config.centerX !== undefined ? config.centerX : undefined;

    ctx.save();
    const offset = effectiveCenterX !== undefined ? effectiveCenterX - (x + width / 2) : 0;
    const containerX = x + offset;

    const maxSeconds = Math.max(...totals.map(t => Math.max(t.seconds, t.previousSeconds)), 0);

    if (maxSeconds === 0) {
      this.drawText(ctx, 'Aucune activité vocale récente', x + width / 2 + offset, y + height / 2, {
        size: 22,
        color: '#FFFFFF',
        align: 'center',
        fontWeight: '500',
      });
      ctx.restore();
      return;
    }

    // Draw legend
    const legendY = y + height + legendOffsetY;
    const legendStartX = containerX + legendOffsetX;
    const squareSize = 9;
    const legendGap = 5;
    const spaceBetweenItems = 79;

    ctx.fillStyle = 'rgba(220, 220, 230, 0.7)';
    ctx.fillRect(legendStartX, legendY - squareSize / 2, squareSize, squareSize);
    ctx.fillStyle = 'rgba(220, 220, 230, 0.8)';
    ctx.font = '400 11px "Montserrat", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem. dern.', legendStartX + squareSize + legendGap, legendY);

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

    // Grid lines
    const maxHours = Math.ceil(maxSeconds / 3600);
    const step = Math.max(1, Math.ceil(maxHours / 4));
    const gridValues: number[] = [];
    for (let h = 0; h <= maxHours; h += step) {
      gridValues.push(h * 3600);
    }

    gridValues.forEach(value => {
      const ratio = value / maxSeconds;
      const gridY = y + paddingTop + usableHeight * (1 - ratio);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartStartX, gridY);
      ctx.lineTo(chartStartX + usableWidth, gridY);
      ctx.stroke();
      ctx.restore();
    });

    // Points
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

    // Previous week area
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(previousPoints[0].x, y + paddingTop + usableHeight);
    previousPoints.forEach((point, index) => {
      if (index === 0) ctx.lineTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(previousPoints[previousPoints.length - 1].x, y + paddingTop + usableHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(220, 220, 230, 0.15)';
    ctx.fill();

    ctx.beginPath();
    previousPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = 'rgba(220, 220, 230, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Current week area
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(currentPoints[0].x, y + paddingTop + usableHeight);
    currentPoints.forEach((point, index) => {
      if (index === 0) ctx.lineTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(currentPoints[currentPoints.length - 1].x, y + paddingTop + usableHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(138, 211, 244, 0.4)';
    ctx.fill();

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

    // Dots and values
    currentPoints.forEach((point, index) => {
      if (totals[index].seconds > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#8ad3f4';
        ctx.fill();
        ctx.restore();

        const currentValue = this.formatDuration(totals[index].seconds, true);
        this.drawText(ctx, currentValue, point.x, point.y - 18, {
          size: 18,
          color: '#FFFFFF',
          align: 'center',
          fontWeight: '600',
        });

        if (totals[index].previousSeconds > 0) {
          const diff = totals[index].seconds - totals[index].previousSeconds;
          const percentChange = Math.round((diff / totals[index].previousSeconds) * 100);

          if (percentChange !== 0) {
            const sign = percentChange > 0 ? '+' : '';
            const percentText = `${sign}${percentChange}%`;
            const percentColor = percentChange > 0 ? '#2ecc71' : '#e74c3c';

            this.drawText(ctx, percentText, point.x, point.y - 35, {
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

    // Labels
    totals.forEach((item, index) => {
      const pointX = chartStartX + index * segmentWidth;
      this.drawText(ctx, item.label, pointX, y + height - 22, {
        size: 16,
        color: '#FFFFFF',
        align: 'center',
        fontWeight: '600',
      });
      this.drawText(ctx, item.dateLabel, pointX, y + height - 6, {
        size: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        align: 'center',
        fontWeight: '400',
      });
    });

    ctx.restore();
  }

  /**
   * Dessine les textes du layout (username, xpValue, lastActivity, etc.)
   */
  private static renderLayoutTexts(
    ctx: SKRSContext2D,
    layout: LayoutConfigItem[],
    data: MeRenderData,
    xpGroupOffset = { offsetX: 0, offsetY: 0 }
  ): void {
    layout.forEach(item => {
      const resolver = TEXT_RESOLVERS[item.key];
      if (!resolver) return;

      const content = resolver(data);
      if (!content) return;

      const offsetX = item.group === 'xpGroup' ? xpGroupOffset.offsetX : 0;
      const offsetY = item.group === 'xpGroup' ? xpGroupOffset.offsetY : 0;

      this.drawText(ctx, content, item.x + offsetX, item.y + offsetY, {
        size: item.fontSize,
        color: item.color,
        align: item.align,
        fontWeight: item.fontWeight,
      });
    });
  }

  // ============ UTILITY FUNCTIONS ============

  private static async drawAvatarCircle(ctx: SKRSContext2D, url: string, centerX: number, centerY: number, radius: number): Promise<void> {
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

  private static drawProgressBar(
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

    this.drawRoundedRect(ctx, x, y, width, height, radius, backgroundColor, 1);
    this.drawRoundedRect(ctx, x, y, width * clampedPercent, height, radius, fillColor, 1);
  }

  private static drawRoundedRect(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string,
    opacity = 1
  ): void {
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

  private static drawText(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    options: { size?: number; color?: string; align?: 'left' | 'right' | 'center' | 'start' | 'end'; fontWeight?: string } = {}
  ): void {
    const { size = 32, color = '#FFFFFF', align = 'left', fontWeight = '600' } = options;
    const fontFamily = 'Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

    ctx.save();
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;

    const hasEmojis = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
    const fontStack = hasEmojis
      ? `${fontWeight} ${size}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", ${fontFamily}`
      : `${fontWeight} ${size}px ${fontFamily}`;

    ctx.font = fontStack;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private static darkenColor(hex: string, factor: number = 0.15): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 'rgba(20, 28, 45, 0.8)';
    const r = Math.floor(rgb.r * factor);
    const g = Math.floor(rgb.g * factor);
    const b = Math.floor(rgb.b * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private static cleanRoleName(name: string): string {
    return name
      .replace(/:[a-zA-Z0-9_]+:/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();
  }

  private static formatDuration(seconds: number, compact: boolean = false): string {
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

  private static formatDurationHoursOnly(seconds: number): string {
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

  private static formatDateFR(date?: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private static getContext(guildUser: IGuildUser | (IGuildUser & { toObject?: () => IGuildUser })): IGuildUser {
    if (typeof (guildUser as any).toObject === 'function') {
      return (guildUser as any).toObject();
    }
    return guildUser;
  }

  private static calculateXpProgress(level: number, experience: number): { current: number; required: number; percent: number } {
    const xpForCurrentLevel = 5 * (level ** 2) + 110 * level + 100;
    const xpForPreviousLevel = level > 1 ? 5 * ((level - 1) ** 2) + 110 * (level - 1) + 100 : 0;
    const current = Math.max(0, experience - xpForPreviousLevel);
    const required = Math.max(1, xpForCurrentLevel - xpForPreviousLevel);
    const percent = Math.min(1, current / required);
    return { current, required, percent };
  }

  private static computeVoiceDailyTotals(history: any[]): VoiceDailyTotal[] {
    const daysCount = 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totals: VoiceDailyTotal[] = [];

    for (let i = daysCount - 1; i >= 0; i -= 1) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

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

  private static buildRenderData(
    discordUser: MeCardOptions['discordUser'],
    guildUser: IGuildUser,
    guildName: string
  ): MeRenderData {
    const level = guildUser?.profil?.lvl ?? 0;
    const experience = guildUser?.profil?.exp ?? 0;
    const money = guildUser?.profil?.money ?? 0;
    const totalMessages = guildUser?.stats?.totalMsg ?? 0;
    const voiceTime = guildUser?.stats?.voiceTime ?? 0;
    const dailyStreak = guildUser?.stats?.dailyStreak ?? 0;

    const { current, required, percent } = this.calculateXpProgress(level, experience);

    const safeBio = guildUser?.bio && guildUser.bio.trim().length > 0 ? guildUser.bio : 'Aucune bio définie.';

    return {
      username: discordUser.username,
      guildName,
      xpPercent: `${Math.round(percent * 100)}%`,
      xpPercentValue: percent,
      xpValue: `${current.toLocaleString('fr-FR')}/${required.toLocaleString('fr-FR')} XP`,
      xpValueWithPercent: `${current.toLocaleString('fr-FR')}/${required.toLocaleString('fr-FR')} XP (${Math.round(percent * 100)}%)`,
      bio: safeBio,
      ridgecoin: money.toLocaleString('fr-FR'),
      birthday: guildUser?.infos?.birthDate ? this.formatDateFR(guildUser.infos.birthDate) : '-',
      messages: totalMessages.toLocaleString('fr-FR'),
      level: String(level),
      joined: guildUser?.infos?.registeredAt ? this.formatDateFR(guildUser.infos.registeredAt) : '-',
      lastActive: guildUser?.stats?.lastActivityDate ? this.formatDateFR(guildUser.stats.lastActivityDate) : '-',
      voiceTotal: this.formatDurationHoursOnly(voiceTime),
      dailyStreak: String(dailyStreak),
      voiceDailyTotals: this.computeVoiceDailyTotals(guildUser?.stats?.voiceHistory ?? []),
      joinedTimeline: '', // Non utilisé pour l'instant
    };
  }
}
