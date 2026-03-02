import { Resvg } from '@resvg/resvg-js';
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';

export interface ProfileCardData {
  pseudo: string;
  bio: string;
  ridgecoin: string;
  level: string;
  messages: string;
  voc: string;
  birthday: string;
  joinedAt: string;
  avatarUrl: string;
  // Données dynamiques pour Canvas
  roles: { name: string; color: string }[];
  weeklyActivity: number[]; // 7 jours d'activité vocale en secondes
  mountains: { name: string; unlocked: boolean }[];
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ParsedPositions {
  roleBox: Box;
  mountainBox: Box;
  activityBox: Box;
  pseudoCenter: { x: number; y: number };
  bioCenter: { x: number; y: number };
  avatar: { cx: number; cy: number; rx: number; ry: number };
}

export class ProfileCardService {
  private static templatePath = path.join(process.cwd(), 'Groupd.svg');
  private static templateCache: string | null = null;
  private static positionsCache: ParsedPositions | null = null;

  private static readonly SVG_WIDTH = 1582;
  private static readonly SVG_HEIGHT = 900;

  // Valeurs par défaut si parsing échoue
  private static readonly DEFAULT_POSITIONS: ParsedPositions = {
    roleBox: { x: 65, y: 57, width: 813, height: 122 },
    mountainBox: { x: 65, y: 206, width: 813, height: 122 },
    activityBox: { x: 65, y: 473, width: 813, height: 370 },
    pseudoCenter: { x: 1211, y: 292 },
    bioCenter: { x: 1211, y: 328 },
    avatar: { cx: 1211, cy: 145, rx: 104, ry: 100 }
  };

  private static getTemplate(): string {
    if (!this.templateCache) {
      this.templateCache = fs.readFileSync(this.templatePath, 'utf-8');
      this.positionsCache = null; // Reset cache when template changes
    }
    return this.templateCache;
  }

  /**
   * Parse le SVG pour extraire dynamiquement les positions des blocs
   */
  private static getPositions(svg: string): ParsedPositions {
    if (this.positionsCache) {
      return this.positionsCache;
    }

    const boxes: Box[] = [];

    // Trouver tous les paths avec fill="#D9D9D9" (blocs gris)
    // Format: M65 473H878V843H65V473Z
    const pathRegex = /<path d="M(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)H(\d+(?:\.\d+)?)V(\d+(?:\.\d+)?)H\d+(?:\.\d+)?V\d+(?:\.\d+)?Z" fill="#D9D9D9"\/>/g;
    let pathMatch: RegExpExecArray | null;

    while ((pathMatch = pathRegex.exec(svg)) !== null) {
      const x = parseFloat(pathMatch[1]);
      const y = parseFloat(pathMatch[2]);
      const x2 = parseFloat(pathMatch[3]);
      const y2 = parseFloat(pathMatch[4]);

      const box: Box = {
        x,
        y,
        width: x2 - x,
        height: y2 - y
      };

      // Éviter les doublons
      if (!boxes.some(b => b.x === box.x && b.y === box.y && b.width === box.width && b.height === box.height)) {
        boxes.push(box);
      }
    }

    // Trier par position Y
    boxes.sort((a, b) => a.y - b.y);

    // Trouver l'ellipse de l'avatar
    let avatar = this.DEFAULT_POSITIONS.avatar;
    const ellipseMatch = svg.match(/<ellipse cx="(\d+(?:\.\d+)?)" cy="(\d+(?:\.\d+)?)" rx="(\d+(?:\.\d+)?)" ry="(\d+(?:\.\d+)?)" fill="#D9D9D9"\/>/);
    if (ellipseMatch) {
      avatar = {
        cx: parseFloat(ellipseMatch[1]),
        cy: parseFloat(ellipseMatch[2]),
        rx: parseFloat(ellipseMatch[3]),
        ry: parseFloat(ellipseMatch[4])
      };
    }

    // Trouver les positions du pseudo et de la bio pour calculer le centre
    let pseudoCenter = this.DEFAULT_POSITIONS.pseudoCenter;
    let bioCenter = this.DEFAULT_POSITIONS.bioCenter;

    const pseudoMatch = svg.match(/<tspan x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)">\{\{PSEUDO\}\}<\/tspan>/);
    if (pseudoMatch) {
      // Le centre X est basé sur l'avatar
      pseudoCenter = { x: avatar.cx, y: parseFloat(pseudoMatch[2]) };
    }

    const bioMatch = svg.match(/<tspan x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)">\{\{BIO\}\}<\/tspan>/);
    if (bioMatch) {
      bioCenter = { x: avatar.cx, y: parseFloat(bioMatch[2]) };
    }

    this.positionsCache = {
      roleBox: boxes[0] || this.DEFAULT_POSITIONS.roleBox,
      mountainBox: boxes[1] || this.DEFAULT_POSITIONS.mountainBox,
      activityBox: boxes[2] || this.DEFAULT_POSITIONS.activityBox,
      pseudoCenter,
      bioCenter,
      avatar
    };

    return this.positionsCache;
  }

  static async generateCard(data: ProfileCardData): Promise<Buffer> {
    const svg = this.getTemplate();
    const positions = this.getPositions(svg);

    // 1. Générer l'image SVG
    const svgBuffer = await this.generateSvgImage(data, svg, positions);

    // 2. Créer un canvas pour superposer les éléments dynamiques
    const canvas = createCanvas(this.SVG_WIDTH, this.SVG_HEIGHT);
    const ctx = canvas.getContext('2d');

    // 3. Dessiner le SVG comme fond
    const svgImage = await loadImage(svgBuffer);
    ctx.drawImage(svgImage, 0, 0, this.SVG_WIDTH, this.SVG_HEIGHT);

    // 4. Dessiner les éléments dynamiques avec positions dynamiques
    this.drawRoles(ctx, data.roles, positions.roleBox);
    this.drawActivityChart(ctx, data.weeklyActivity, positions.activityBox);
    this.drawMountains(ctx, data.mountains, positions.mountainBox);

    return canvas.toBuffer('image/png');
  }

  private static async generateSvgImage(data: ProfileCardData, svgTemplate: string, positions: ParsedPositions): Promise<Buffer> {
    let svg = svgTemplate;
    const { avatar, pseudoCenter, bioCenter } = positions;

    // Télécharger l'avatar et le convertir en base64
    const avatarBase64 = await this.fetchImageAsBase64(data.avatarUrl);

    // Remplacer l'ellipse avatar par une image avec clip-path circulaire (dynamique)
    const ellipseRegex = new RegExp(`<ellipse cx="${avatar.cx}" cy="${avatar.cy}" rx="${avatar.rx}" ry="${avatar.ry}" fill="#D9D9D9"\\/>`);
    svg = svg.replace(
      ellipseRegex,
      `<defs>
        <clipPath id="avatarClip">
          <ellipse cx="${avatar.cx}" cy="${avatar.cy}" rx="${avatar.rx}" ry="${avatar.ry}"/>
        </clipPath>
      </defs>
      <image
        x="${avatar.cx - avatar.rx}"
        y="${avatar.cy - avatar.ry}"
        width="${avatar.rx * 2}"
        height="${avatar.ry * 2}"
        href="${avatarBase64}"
        clip-path="url(#avatarClip)"
        preserveAspectRatio="xMidYMid slice"
      />`
    );

    // Centrer le pseudo (remplacer le tspan avec text-anchor middle)
    svg = svg.replace(
      /<text fill="white" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="40" font-weight="bold" letter-spacing="0em"><tspan x="\d+(?:\.\d+)?" y="(\d+(?:\.\d+)?)">\{\{PSEUDO\}\}<\/tspan><\/text>/,
      `<text fill="white" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="40" font-weight="bold" letter-spacing="0em" text-anchor="middle"><tspan x="${pseudoCenter.x}" y="${pseudoCenter.y}">${this.escapeXml(data.pseudo)}</tspan></text>`
    );

    // Centrer la bio
    svg = svg.replace(
      /<text fill="white" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="20" font-weight="bold" letter-spacing="0em"><tspan x="\d+(?:\.\d+)?" y="(\d+(?:\.\d+)?)">\{\{BIO\}\}<\/tspan><\/text>/,
      `<text fill="white" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="20" font-weight="bold" letter-spacing="0em" text-anchor="middle"><tspan x="${bioCenter.x}" y="${bioCenter.y}">${this.escapeXml(this.truncateBio(data.bio, 40))}</tspan></text>`
    );

    // Remplacer les placeholders avec auto-fit (utilise textLength pour adapter le texte)
    // Largeurs max estimées pour chaque zone (basées sur le design Figma)
    const textZones: Record<string, { value: string; maxWidth: number }> = {
      'RIDGECOIN': { value: data.ridgecoin, maxWidth: 180 },
      'LEVEL': { value: data.level, maxWidth: 180 },
      'MESSAGES': { value: data.messages, maxWidth: 180 },
      'VOC': { value: data.voc, maxWidth: 180 },
      'B': { value: data.birthday, maxWidth: 140 },
      'ICI': { value: data.joinedAt, maxWidth: 140 }
    };

    for (const [placeholder, { value, maxWidth }] of Object.entries(textZones)) {
      const escapedValue = this.escapeXml(value);
      // Estimer si le texte dépasse (environ 18px par caractère en font-size 32)
      const estimatedWidth = value.length * 18;

      if (estimatedWidth > maxWidth) {
        // Utiliser textLength pour compresser le texte
        svg = svg.replace(
          new RegExp(`(<text[^>]*>\\s*<tspan[^>]*>)\\{\\{${placeholder}\\}\\}(<\\/tspan>\\s*<\\/text>)`),
          `$1<tspan textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs">${escapedValue}</tspan>$2`.replace(/<tspan[^>]*>(<tspan)/, '$1')
        );
        // Méthode alternative: remplacer directement avec attribut sur le tspan
        svg = svg.replace(
          new RegExp(`\\{\\{${placeholder}\\}\\}`),
          escapedValue
        );
        // Ajouter textLength au tspan parent si possible
        svg = svg.replace(
          new RegExp(`(<tspan x="[^"]*" y="[^"]*")>(${this.escapeRegex(escapedValue)})<\\/tspan>`),
          `$1 textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs">${escapedValue}</tspan>`
        );
      } else {
        svg = svg.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), escapedValue);
      }
    }

    // Rendre le SVG en PNG
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: this.SVG_WIDTH
      },
      font: {
        loadSystemFonts: true
      }
    });

    const pngData = resvg.render();
    return pngData.asPng();
  }

  private static drawRoles(ctx: SKRSContext2D, roles: { name: string; color: string }[], box: Box): void {
    const { x, y, width, height } = box;

    // Tailles dynamiques basées sur la hauteur de la box
    const badgeHeight = height * 0.21; // ~21% de la hauteur de la box
    const fontSize = badgeHeight * 0.5; // Font proportionnelle à la hauteur du badge
    const badgeGap = width * 0.01; // 1% de la largeur
    const rowGap = height * 0.05; // 5% de la hauteur
    const padding = width * 0.025; // 2.5% de la largeur
    const badgePadding = fontSize * 1.5; // Padding interne du badge

    ctx.font = `${fontSize}px Inter, Arial, sans-serif`;

    // Organiser les rôles en lignes tant qu'on reste dans la zone
    const rows: { name: string; color: string; width: number }[][] = [];
    let currentRow: { name: string; color: string; width: number }[] = [];
    let currentRowWidth = 0;
    const maxRowWidth = width - padding * 2;
    const maxRows = Math.floor((height - padding) / (badgeHeight + rowGap));

    for (const role of roles) {
      const badgeWidth = ctx.measureText(role.name).width + badgePadding;

      if (currentRowWidth + badgeWidth + badgeGap > maxRowWidth && currentRow.length > 0) {
        rows.push(currentRow);
        if (rows.length >= maxRows) break;
        currentRow = [];
        currentRowWidth = 0;
      }

      currentRow.push({ ...role, width: badgeWidth });
      currentRowWidth += badgeWidth + badgeGap;
    }

    if (currentRow.length > 0 && rows.length < maxRows) {
      rows.push(currentRow);
    }

    const displayedRoles = rows.reduce((sum, row) => sum + row.length, 0);
    const remainingRoles = roles.length - displayedRoles;

    const totalHeight = rows.length * badgeHeight + (rows.length - 1) * rowGap;
    let currentY = y + (height - totalHeight) / 2 + badgeHeight / 2;

    rows.forEach((row) => {
      const rowWidth = row.reduce((sum, r) => sum + r.width, 0) + (row.length - 1) * badgeGap;
      let currentX = x + (width - rowWidth) / 2;

      row.forEach((role) => {
        const roleColor = role.color === '#000000' ? '#5865F2' : role.color;
        const borderRadius = badgeHeight / 2;

        // Fond semi-transparent
        ctx.fillStyle = roleColor + '40';
        this.roundRect(ctx, currentX, currentY - badgeHeight / 2, role.width, badgeHeight, borderRadius);
        ctx.fill();

        // Bordure
        ctx.strokeStyle = roleColor;
        ctx.lineWidth = Math.max(1, badgeHeight * 0.06);
        this.roundRect(ctx, currentX, currentY - badgeHeight / 2, role.width, badgeHeight, borderRadius);
        ctx.stroke();

        // Texte
        ctx.fillStyle = '#ffffff';
        ctx.font = `${fontSize}px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(role.name, currentX + role.width / 2, currentY + fontSize * 0.35);
        ctx.textAlign = 'left';

        currentX += role.width + badgeGap;
      });

      currentY += badgeHeight + rowGap;
    });

    // +X autres si des rôles restent
    if (remainingRoles > 0) {
      ctx.fillStyle = '#8892b0';
      ctx.font = `${fontSize * 0.9}px Inter, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${remainingRoles} autre${remainingRoles > 1 ? 's' : ''}`, x + width / 2, y + height - height * 0.06);
      ctx.textAlign = 'left';
    }
  }

  private static drawActivityChart(ctx: SKRSContext2D, weeklyActivity: number[], box: Box): void {
    const { x, y, width, height } = box;
    const centerX = x + width / 2;

    // Tailles dynamiques
    const titleFontSize = height * 0.06;
    const valueFontSize = height * 0.038;
    const dayFontSize = height * 0.043;

    // Titre centré
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('📊 Activité vocale (7 derniers jours)', centerX, y + height * 0.12);

    // Zone du graphique centrée - proportions dynamiques
    const chartTopMargin = height * 0.19;
    const chartBottomMargin = height * 0.135;
    const chartHeight = height - chartTopMargin - chartBottomMargin;
    const chartY = y + chartTopMargin;

    const maxActivity = Math.max(...weeklyActivity, 1);

    // Barres: largeur et gap proportionnels à la largeur de la box
    const barWidth = width * 0.098;
    const gap = width * 0.025;
    const totalBarsWidth = weeklyActivity.length * barWidth + (weeklyActivity.length - 1) * gap;
    const startX = centerX - totalBarsWidth / 2;
    const barRadius = barWidth * 0.1;

    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    weeklyActivity.forEach((activity, i) => {
      const barX = startX + (barWidth + gap) * i;
      const barH = Math.max((activity / maxActivity) * (chartHeight - height * 0.1), height * 0.016);
      const barY = chartY + chartHeight - barH;

      // Barre avec dégradé
      const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barH);
      gradient.addColorStop(0, '#4facfe');
      gradient.addColorStop(1, '#00f2fe');
      ctx.fillStyle = gradient;
      this.roundRect(ctx, barX, barY, barWidth, barH, barRadius);
      ctx.fill();

      // Valeur au-dessus si > 0
      if (activity > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${valueFontSize}px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(this.formatDuration(activity), barX + barWidth / 2, barY - height * 0.027);
      }

      // Label jour
      ctx.fillStyle = '#b0b0b0';
      ctx.font = `bold ${dayFontSize}px Inter, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(days[i], barX + barWidth / 2, y + height - height * 0.054);
    });

    ctx.textAlign = 'left';
  }

  private static drawMountains(ctx: SKRSContext2D, mountains: { name: string; unlocked: boolean }[], box: Box): void {
    const { x, y, width, height } = box;
    const centerX = x + width / 2;

    const unlockedCount = mountains.filter(m => m.unlocked).length;
    const totalCount = mountains.length;
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    // Tailles dynamiques
    const titleFontSize = height * 0.16;
    const percentFontSize = height * 0.11;
    const flagFontSize = height * 0.14;

    // Titre centré (en haut de la box)
    const titleY = y + height * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`⛰️ Montagnes: ${unlockedCount}/${totalCount}`, centerX, titleY);

    // Barre de progression centrée
    const barWidth = width * 0.62;
    const barHeight = height * 0.2;
    const barX = centerX - barWidth / 2;
    const barY = y + height * 0.35;
    const barRadius = barHeight / 2;

    // Fond de la barre
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();

    // Progression
    if (progress > 0) {
      const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
      gradient.addColorStop(0, '#36E0BE');
      gradient.addColorStop(1, '#4facfe');
      ctx.fillStyle = gradient;
      this.roundRect(ctx, barX, barY, barWidth * (progress / 100), barHeight, barRadius);
      ctx.fill();
    }

    // Pourcentage dans la barre
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${percentFontSize}px Inter, Arial, sans-serif`;
    ctx.fillText(`${Math.round(progress)}%`, centerX, barY + barHeight * 0.7);

    // Drapeaux des montagnes débloquées en dessous de la barre
    const unlockedMountains = mountains.filter(m => m.unlocked);
    if (unlockedMountains.length > 0) {
      // Extraire les drapeaux (emojis au début des noms)
      const flags = unlockedMountains
        .map(m => this.extractFlag(m.name))
        .filter((flag, index, self) => flag && self.indexOf(flag) === index); // Unique flags

      if (flags.length > 0) {
        const flagY = barY + barHeight + height * 0.18;
        const flagGap = width * 0.025;
        const totalFlagsWidth = flags.length * flagFontSize + (flags.length - 1) * flagGap;
        let flagX = centerX - totalFlagsWidth / 2 + flagFontSize / 2;

        ctx.font = `${flagFontSize}px Inter, Arial, sans-serif`;
        flags.forEach((flag) => {
          ctx.fillText(flag, flagX, flagY);
          flagX += flagFontSize + flagGap;
        });
      }
    }

    ctx.textAlign = 'left';
  }

  /**
   * Extrait le drapeau emoji au début du nom d'une montagne
   * Les drapeaux sont composés de 2 Regional Indicator Symbols (U+1F1E6 à U+1F1FF)
   */
  private static extractFlag(name: string): string | null {
    // Regional Indicator Symbols range: 🇦 (U+1F1E6) to 🇿 (U+1F1FF)
    const firstChar = name.codePointAt(0);
    const secondChar = name.codePointAt(2); // After first surrogate pair

    if (firstChar && secondChar &&
        firstChar >= 0x1F1E6 && firstChar <= 0x1F1FF &&
        secondChar >= 0x1F1E6 && secondChar <= 0x1F1FF) {
      return String.fromCodePoint(firstChar, secondChar);
    }
    return null;
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
    if (!seconds || seconds <= 0) return '0';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours >= 1) {
      return `${hours}h`;
    }
    if (minutes >= 1) {
      return `${minutes}m`;
    }
    return `${Math.floor(seconds)}s`;
  }

  private static truncateBio(bio: string, maxLength: number): string {
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength - 3) + '...';
  }

  private static async fetchImageAsBase64(url: string): Promise<string> {
    // Valider l'URL avant de fetch
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      console.warn(`[ProfileCard] URL d'avatar invalide: "${url}", utilisation d'un placeholder`);
      return this.getDefaultAvatarBase64();
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[ProfileCard] Erreur fetch avatar: ${response.status}, utilisation d'un placeholder`);
        return this.getDefaultAvatarBase64();
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.warn(`[ProfileCard] Erreur fetch avatar:`, error);
      return this.getDefaultAvatarBase64();
    }
  }

  private static getDefaultAvatarBase64(): string {
    // SVG simple gris comme placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#36393f"/>
      <circle cx="128" cy="100" r="50" fill="#5865F2"/>
      <ellipse cx="128" cy="220" rx="70" ry="50" fill="#5865F2"/>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static clearCache(): void {
    this.templateCache = null;
    this.positionsCache = null;
  }
}
