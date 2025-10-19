/**
 * Service de rendu universel pour templates PSD + Canvas
 * Architecture hybride : PSD pour les textes statiques + Canvas pour éléments dynamiques
 */

import { renderFromPsdToBuffer } from '../features/test/services/psd-render.service';
import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';

export type TemplateConfig = {
  name: string;
  description?: string;
  psd: string;
  background: string;
  dimensions: {
    width: number;
    height: number;
  };
  psdVariables: Record<string, string>; // Mapping: {{PSD_VAR}} -> dataKey
  canvasOverlays?: {
    avatar?: AvatarOverlay;
    xpBar?: XpBarOverlay;
    voiceChart?: VoiceChartOverlay;
    roleBadges?: RoleBadgesOverlay;
  };
  testData?: Record<string, any>;
};

type AvatarOverlay = {
  enabled: boolean;
  x: number;
  y: number;
  radius: number;
};

type XpBarOverlay = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  backgroundColor?: string;
  fillColor?: string;
};

type VoiceChartOverlay = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX?: number | null;
};

type RoleBadgesOverlay = {
  enabled: boolean;
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
  badgeHeight: number;
  gap: number;
};

export type RenderData = Record<string, any> & {
  avatarUrl?: string;
  xpPercent?: number;
  voiceDailyTotals?: any[];
  roles?: { name: string; color: string }[];
};

export class TemplateRenderService {
  private static readonly TEMPLATES_DIR = path.resolve(process.cwd(), 'canva/templates');

  /**
   * Liste tous les templates disponibles
   */
  static listTemplates(): string[] {
    if (!fs.existsSync(this.TEMPLATES_DIR)) {
      return [];
    }
    return fs.readdirSync(this.TEMPLATES_DIR).filter(name => {
      const configPath = path.join(this.TEMPLATES_DIR, name, `${name}-config.json`);
      return fs.existsSync(configPath);
    });
  }

  /**
   * Charge la configuration d'un template
   */
  static loadTemplateConfig(templateName: string): TemplateConfig {
    const configPath = path.join(this.TEMPLATES_DIR, templateName, `${templateName}-config.json`);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TemplateConfig;
    return config;
  }

  /**
   * Rendu complet d'un template : PSD + Canvas overlays
   */
  static async render(templateName: string, data: RenderData): Promise<Buffer> {
    const config = this.loadTemplateConfig(templateName);
    const templateDir = path.join(this.TEMPLATES_DIR, templateName);

    // 1️⃣ Rendre le PSD avec les variables textuelles
    const psdReplacements = this.mapPsdVariables(config, data);
    const psdBuffer = await renderFromPsdToBuffer({
      psdPath: path.join(templateDir, config.psd),
      backgroundPng: path.join(templateDir, config.background),
      replacements: psdReplacements,
    });

    // 2️⃣ Charger le PSD rendu dans un canvas
    const canvas = createCanvas(config.dimensions.width, config.dimensions.height);
    const ctx = canvas.getContext('2d');
    const psdImage = await loadImage(psdBuffer);
    ctx.drawImage(psdImage, 0, 0);

    // 3️⃣ Dessiner les overlays canvas par-dessus
    if (config.canvasOverlays) {
      await this.renderCanvasOverlays(ctx, config.canvasOverlays, data);
    }

    // 4️⃣ Retourner le buffer final
    return canvas.toBuffer('image/png');
  }

  /**
   * Mappe les données vers les variables PSD
   */
  private static mapPsdVariables(config: TemplateConfig, data: RenderData): Record<string, string> {
    const replacements: Record<string, string> = {};

    for (const [psdVar, dataKey] of Object.entries(config.psdVariables)) {
      const value = data[dataKey];
      if (value !== undefined && value !== null) {
        replacements[psdVar] = String(value);
      }
    }

    return replacements;
  }

  /**
   * Rendu des overlays canvas (avatar, xpBar, etc.)
   */
  private static async renderCanvasOverlays(
    ctx: SKRSContext2D,
    overlays: NonNullable<TemplateConfig['canvasOverlays']>,
    data: RenderData
  ): Promise<void> {
    // Avatar
    if (overlays.avatar?.enabled && data.avatarUrl) {
      await this.drawAvatar(ctx, data.avatarUrl, overlays.avatar);
    }

    // Barre XP
    if (overlays.xpBar?.enabled && data.xpPercent !== undefined) {
      this.drawXpBar(ctx, overlays.xpBar, data.xpPercent);
    }

    // Graphique voice (TODO: implémenter si nécessaire)
    // if (overlays.voiceChart?.enabled && data.voiceDailyTotals) {
    //   this.drawVoiceChart(ctx, overlays.voiceChart, data.voiceDailyTotals);
    // }

    // Badges de rôles (TODO: implémenter si nécessaire)
    // if (overlays.roleBadges?.enabled && data.roles) {
    //   this.drawRoleBadges(ctx, overlays.roleBadges, data.roles);
    // }
  }

  /**
   * Dessine un avatar circulaire
   */
  private static async drawAvatar(
    ctx: SKRSContext2D,
    avatarUrl: string,
    config: AvatarOverlay
  ): Promise<void> {
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(config.x, config.y, config.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        avatar,
        config.x - config.radius,
        config.y - config.radius,
        config.radius * 2,
        config.radius * 2
      );
      ctx.restore();
    } catch (error) {
      console.error('[TemplateRender] Error loading avatar:', error);
    }
  }

  /**
   * Dessine une barre de progression XP
   */
  private static drawXpBar(ctx: SKRSContext2D, config: XpBarOverlay, percent: number): void {
    const { x, y, width, height, radius = height / 2 } = config;
    const backgroundColor = config.backgroundColor || 'rgba(20, 28, 45, 0.6)';
    const fillColor = config.fillColor || '#8ad3f4';
    const clampedPercent = Math.max(0, Math.min(1, percent));

    // Background
    this.drawRoundedRect(ctx, x, y, width, height, radius, backgroundColor);

    // Fill
    this.drawRoundedRect(ctx, x, y, width * clampedPercent, height, radius, fillColor);
  }

  /**
   * Utilitaire : dessine un rectangle arrondi
   */
  private static drawRoundedRect(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
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
}
