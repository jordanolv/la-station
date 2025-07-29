import { Canvas, createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { User } from 'discord.js';
import fs from 'fs';
import path from 'path';

interface ImageTemplate {
  templatePath: string;
  avatar: {
    x: number;
    y: number;
    size: number;
    borderColor: string;
    borderWidth: number;
  };
  username: {
    x: number;
    y: number;
    font: string;
    color: string;
    maxWidth: number;
  };
  guildName: {
    x: number;
    y: number;
    font: string;
    color: string;
    maxWidth: number;
  };
}

/**
 * Service de génération d'images pour la feature Welcome
 * Responsabilité: création d'images avec Canvas
 */
export class WelcomeImageService {
  private static readonly CANVAS_WIDTH = 800;
  private static readonly CANVAS_HEIGHT = 300;

  private static readonly WELCOME_TEMPLATE: ImageTemplate = {
    templatePath: 'templates/welcome-template.png',
    avatar: {
      x: 400,
      y: 150,
      size: 128,
      borderColor: '#ffffff',
      borderWidth: 6
    },
    username: {
      x: 400,
      y: 250,
      font: 'bold 28px Arial',
      color: '#ffffff',
      maxWidth: 600
    },
    guildName: {
      x: 400,
      y: 280,
      font: '20px Arial',
      color: '#b8c5d6',
      maxWidth: 600
    }
  };

  private static readonly GOODBYE_TEMPLATE: ImageTemplate = {
    templatePath: 'templates/goodbye-template.png',
    avatar: {
      x: 400,
      y: 150,
      size: 128,
      borderColor: '#ff6b6b',
      borderWidth: 6
    },
    username: {
      x: 400,
      y: 250,  
      font: 'bold 28px Arial',
      color: '#ffffff',
      maxWidth: 600
    },
    guildName: {
      x: 400,
      y: 280,
      font: '20px Arial',
      color: '#b8c5d6',
      maxWidth: 600
    }
  };

  /**
   * Génère une image de bienvenue
   */
  static async generateWelcomeImage(user: User, guildName: string): Promise<Buffer> {
    return this.generateImageWithTemplate(user, guildName, this.WELCOME_TEMPLATE, 'welcome');
  }

  /**
   * Génère une image d'au revoir
   */
  static async generateGoodbyeImage(user: User, guildName: string): Promise<Buffer> {
    return this.generateImageWithTemplate(user, guildName, this.GOODBYE_TEMPLATE, 'goodbye');
  }

  /**
   * Génère une image avec un template spécifique
   */
  private static async generateImageWithTemplate(
    user: User,
    guildName: string,
    template: ImageTemplate,
    type: 'welcome' | 'goodbye'
  ): Promise<Buffer> {
    const canvas = createCanvas(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    try {
      // Charger le template de fond s'il existe
      const templatePath = path.join(process.cwd(), 'src', template.templatePath);
      
      if (fs.existsSync(templatePath)) {
        const templateImage = await loadImage(templatePath);
        ctx.drawImage(templateImage, 0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
      } else {
        // Utiliser un fond par défaut si pas de template
        await this.drawDefaultBackground(ctx, type);
      }

      // Dessiner l'avatar
      await this.drawUserAvatar(ctx, user, template.avatar);

      // Dessiner le nom d'utilisateur
      this.drawText(ctx, user.displayName || user.username, template.username);

      // Dessiner le texte du serveur
      const serverText = type === 'welcome' 
        ? `Bienvenue sur ${guildName}` 
        : `Merci d'avoir fait partie de ${guildName}`;
      this.drawText(ctx, serverText, template.guildName);

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error(`[WELCOME_IMAGE] Erreur lors de la génération d'image ${type}:`, error);
      // Retourner une image fallback en cas d'erreur
      return this.generateFallbackImage(user, guildName, type);
    }
  }

  /**
   * Dessine un fond par défaut avec dégradé
   */
  private static async drawDefaultBackground(ctx: CanvasRenderingContext2D, type: 'welcome' | 'goodbye'): Promise<void> {
    const gradient = ctx.createLinearGradient(0, 0, this.CANVAS_WIDTH, 0);
    
    if (type === 'welcome') {
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
    } else {
      gradient.addColorStop(0, '#434343');
      gradient.addColorStop(1, '#000000');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
  }

  /**
   * Dessine l'avatar de l'utilisateur avec bordure circulaire
   */
  private static async drawUserAvatar(
    ctx: CanvasRenderingContext2D, 
    user: User, 
    avatarConfig: ImageTemplate['avatar']
  ): Promise<void> {
    try {
      const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
      const avatar = await loadImage(avatarUrl);

      // Créer un masque circulaire pour l'avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarConfig.x, avatarConfig.y, avatarConfig.size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Dessiner l'avatar
      ctx.drawImage(
        avatar,
        avatarConfig.x - avatarConfig.size / 2,
        avatarConfig.y - avatarConfig.size / 2,
        avatarConfig.size,
        avatarConfig.size
      );
      
      ctx.restore();

      // Dessiner la bordure
      ctx.beginPath();
      ctx.arc(
        avatarConfig.x, 
        avatarConfig.y, 
        avatarConfig.size / 2 + avatarConfig.borderWidth / 2, 
        0, 
        Math.PI * 2
      );
      ctx.strokeStyle = avatarConfig.borderColor;
      ctx.lineWidth = avatarConfig.borderWidth;
      ctx.stroke();

    } catch (error) {
      console.error('[WELCOME_IMAGE] Erreur lors du chargement de l\'avatar:', error);
      // Avatar par défaut en cas d'erreur
      await this.drawDefaultAvatar(ctx, avatarConfig);
    }
  }

  /**
   * Dessine un avatar par défaut
   */
  private static async drawDefaultAvatar(
    ctx: CanvasRenderingContext2D, 
    avatarConfig: ImageTemplate['avatar']
  ): Promise<void> {
    ctx.beginPath();
    ctx.arc(avatarConfig.x, avatarConfig.y, avatarConfig.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#7289da';
    ctx.fill();
    ctx.strokeStyle = avatarConfig.borderColor;
    ctx.lineWidth = avatarConfig.borderWidth;
    ctx.stroke();
  }

  /**
   * Dessine du texte avec redimensionnement automatique
   */
  private static drawText(
    ctx: CanvasRenderingContext2D, 
    text: string, 
    textConfig: ImageTemplate['username'] | ImageTemplate['guildName']
  ): void {
    ctx.font = textConfig.font;
    ctx.fillStyle = textConfig.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Ajuster la taille de police si le texte est trop long
    let currentFont = textConfig.font;
    let textMetrics = ctx.measureText(text);
    
    if (textMetrics.width > textConfig.maxWidth) {
      const ratio = textConfig.maxWidth / textMetrics.width * 0.9; // Marge de sécurité
      const fontSize = parseInt(textConfig.font.match(/\d+/)?.[0] || '20') * ratio;
      currentFont = textConfig.font.replace(/\d+/, Math.floor(fontSize).toString());
      ctx.font = currentFont;
    }

    ctx.fillText(text, textConfig.x, textConfig.y);
  }

  /**
   * Génère une image fallback simple en cas d'erreur
   */
  private static async generateFallbackImage(
    user: User, 
    guildName: string, 
    type: 'welcome' | 'goodbye'
  ): Promise<Buffer> {
    const canvas = createCanvas(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Fond uni
    ctx.fillStyle = type === 'welcome' ? '#5865f2' : '#747f8d';
    ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Titre
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const title = type === 'welcome' ? 'Bienvenue !' : 'Au revoir !';
    ctx.fillText(title, this.CANVAS_WIDTH / 2, 100);

    // Nom d'utilisateur
    ctx.font = 'bold 24px Arial';
    ctx.fillText(user.displayName || user.username, this.CANVAS_WIDTH / 2, 150);

    // Nom du serveur
    ctx.font = '18px Arial';
    ctx.fillStyle = '#b9bbbe';
    const serverText = type === 'welcome' 
      ? `sur ${guildName}` 
      : `de ${guildName}`;
    ctx.fillText(serverText, this.CANVAS_WIDTH / 2, 200);

    return canvas.toBuffer('image/png');
  }

  /**
   * Vérifie si un template existe
   */
  static templateExists(templatePath: string): boolean {
    const fullPath = path.join(process.cwd(), 'src', templatePath);
    return fs.existsSync(fullPath);
  }

  /**
   * Obtient les informations d'un template
   */
  static getTemplateInfo(): { welcome: boolean; goodbye: boolean } {
    return {
      welcome: this.templateExists(this.WELCOME_TEMPLATE.templatePath),
      goodbye: this.templateExists(this.GOODBYE_TEMPLATE.templatePath)
    };
  }

  /**
   * Génère une image de test pour vérifier la configuration
   */
  static async generateTestImage(type: 'welcome' | 'goodbye'): Promise<Buffer> {
    const testUser = {
      id: '123456789',
      username: 'TestUser',
      displayName: 'Test User',
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
    } as User;

    if (type === 'welcome') {
      return this.generateWelcomeImage(testUser, 'Test Server');
    } else {
      return this.generateGoodbyeImage(testUser, 'Test Server');
    }
  }
}