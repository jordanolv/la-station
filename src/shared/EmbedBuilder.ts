import { EmbedBuilder as DiscordEmbedBuilder, ColorResolvable } from 'discord.js';

export class EmbedBuilder {
  private static readonly COLORS = {
    DEFAULT: '#2B2D31' as ColorResolvable, // Discord Dark Theme Background
    SUCCESS: '#10B981' as ColorResolvable, // Emerald 500
    ERROR: '#EF4444' as ColorResolvable,   // Red 500
    WARNING: '#F59E0B' as ColorResolvable, // Amber 500
    INFO: '#3B82F6' as ColorResolvable,    // Blue 500
    PRIMARY: '#FFFFFF' as ColorResolvable, // White
  };

  public static create(title?: string, description?: string): DiscordEmbedBuilder {
    const embed = new DiscordEmbedBuilder()
      .setColor(this.COLORS.DEFAULT)
      .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);

    return embed;
  }

  public static success(description: string, title: string = 'Success'): DiscordEmbedBuilder {
    return new DiscordEmbedBuilder()
      .setColor(this.COLORS.SUCCESS)
      .setTitle(`✅ ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  public static error(description: string, title: string = 'Error'): DiscordEmbedBuilder {
    return new DiscordEmbedBuilder()
      .setColor(this.COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setTimestamp();
  }

  public static info(description: string, title?: string): DiscordEmbedBuilder {
    const embed = new DiscordEmbedBuilder()
      .setColor(this.COLORS.INFO)
      .setDescription(description)
      .setTimestamp();

    if (title) embed.setTitle(`ℹ️ ${title}`);
    
    return embed;
  }

  public static warning(description: string, title: string = 'Warning'): DiscordEmbedBuilder {
    return new DiscordEmbedBuilder()
      .setColor(this.COLORS.WARNING)
      .setTitle(`⚠️ ${title}`)
      .setDescription(description)
      .setTimestamp();
  }
}
