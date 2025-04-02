// src/bot/utils/EmbedUtils.ts
import { EmbedBuilder, ColorResolvable } from 'discord.js';

export class EmbedUtils {
  // Couleurs communes
  static readonly Colors = {
    SUCCESS: 0x43B581,
    ERROR: 0xF04747,
    WARNING: 0xFAA61A,
    INFO: 0x7289DA,
  };

  /**
   * Crée un embed simple avec un titre et une description
   */
  static createSimpleEmbed(title: string, description: string, color?: ColorResolvable) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color || this.Colors.INFO)
      .setTimestamp();
  }

  /**
   * Crée un embed de succès
   */
  static createSuccessEmbed(title: string, description: string) {
    return this.createSimpleEmbed(title, description, this.Colors.SUCCESS);
  }

  /**
   * Crée un embed d'erreur
   */
  static createErrorEmbed(title: string, description: string) {
    return this.createSimpleEmbed(title, description, this.Colors.ERROR);
  }

  /**
   * Crée un embed d'avertissement
   */
  static createWarningEmbed(title: string, description: string) {
    return this.createSimpleEmbed(title, description, this.Colors.WARNING);
  }
}