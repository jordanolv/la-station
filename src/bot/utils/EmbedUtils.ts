// src/bot/utils/EmbedUtils.ts
import { EmbedBuilder, ColorResolvable } from 'discord.js';

export class EmbedUtils {
  // Couleurs communes
  static readonly Colors = {
    SUCCESS: 0x00FF00,  // Vert
    ERROR: 0xFF0000,    // Rouge
    WARNING: 0xFFA500,  // Orange
    INFO: 0x0099FF,     // Bleu
    DEBUG: 0x808080     // Gris
  };

  /**
   * Crée un embed de log avec des informations détaillées
   */
  static createLogEmbed(
    type: 'info' | 'warning' | 'error' | 'success' | 'debug',
    content: string,
    options: {
      feature?: string;
      file?: string;
      line?: number;
      timestamp?: boolean;
      footer?: string;
    } = {}
  ) {
    const { feature, file, line, timestamp = true, footer } = options;

    // Définir les icônes et titres selon le type
    const typeConfig = {
      info: { icon: 'ℹ️', title: 'Information' },
      warning: { icon: '⚠️', title: 'Avertissement' },
      error: { icon: '❌', title: 'Erreur' },
      success: { icon: '✅', title: 'Succès' },
      debug: { icon: '🔍', title: 'Debug' }
    }[type];

    // Créer l'embed de base
    const embed = new EmbedBuilder()
      .setColor(this.Colors[type.toUpperCase() as keyof typeof this.Colors])
      .setTitle(`${typeConfig.icon} ${typeConfig.title}`)
      .setDescription(content);

    // Ajouter les champs supplémentaires si présents
    if (feature) {
      embed.addFields({ name: 'Fonctionnalité', value: feature, inline: true });
    }

    if (file) {
      const fileInfo = line ? `${file}:${line}` : file;
      embed.addFields({ name: 'Source', value: `\`${fileInfo}\``, inline: true });
    }

    // Ajouter le timestamp si demandé
    if (timestamp) {
      embed.setTimestamp();
    }

    // Ajouter le footer si présent
    if (footer) {
      embed.setFooter({ text: footer });
    }

    return embed;
  }

  /**
   * Crée un embed simple avec un titre et une description
   */
  static createSimpleEmbed(
    title: string,
    description: string,
    color?: ColorResolvable,
    feature?: string
  ) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color || this.Colors.INFO);

    if (feature) {
      embed.setFooter({ text: feature });
    }

    return embed;
  }

  /**
   * Crée un embed de succès
   */
  static createSuccessEmbed(
    title: string,
    description: string,
    options: {
      feature?: string;
      file?: string;
      line?: number;
    } = {}
  ) {
    return this.createLogEmbed('success', description, {
      ...options,
      footer: title
    });
  }

  /**
   * Crée un embed d'erreur
   */
  static createErrorEmbed(
    title: string,
    description: string,
    options: {
      feature?: string;
      file?: string;
      line?: number;
    } = {}
  ) {
    return this.createLogEmbed('error', description, {
      ...options,
      footer: title
    });
  }

  /**
   * Crée un embed d'avertissement
   */
  static createWarningEmbed(
    title: string,
    description: string,
    options: {
      feature?: string;
      file?: string;
      line?: number;
    } = {}
  ) {
    return this.createLogEmbed('warning', description, {
      ...options,
      footer: title
    });
  }
}