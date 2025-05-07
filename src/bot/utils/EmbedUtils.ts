// src/bot/utils/EmbedUtils.ts
import { EmbedBuilder, ColorResolvable } from 'discord.js';
export class EmbedUtils {
  // Couleurs communes
  static readonly Colors = {
    SUCCESS: 0x00FF00,
    ERROR: 0xFF0000,
    WARNING: 0xFFA500,
    INFO: 0x0099FF,
    DEBUG: 0x808080  // Gris pour les logs de debug
  };

  /**
   * Crée un embed simple avec un titre et une description
   */
  static createSimpleEmbed(title: string, description: string, color?: ColorResolvable, feature?: string) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color || this.Colors.INFO)
      .setFooter({ text: feature || '' })
      .setTimestamp();
  }

  /**
   * Crée un embed de succès
   */
  static createSuccessEmbed(title: string, description: string, feature?: string) {
    return this.createSimpleEmbed(title, description, this.Colors.SUCCESS, feature);
  }

  /**
   * Crée un embed d'erreur
   */
  static createErrorEmbed(title: string, description: string, feature?: string) {
    return this.createSimpleEmbed(title, description, this.Colors.ERROR, feature);
  }

  /**
   * Crée un embed d'avertissement
   */
  static createWarningEmbed(title: string, description: string, feature?: string) {
    return this.createSimpleEmbed(title, description, this.Colors.WARNING, feature);
  }
}