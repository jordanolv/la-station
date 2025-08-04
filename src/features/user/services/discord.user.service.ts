import { 
  Client, 
  EmbedBuilder, 
  TextChannel, 
  ChannelType, 
  PermissionsBitField,
  ColorResolvable 
} from 'discord.js';
import { BirthdayNotificationDTO } from './user.types';
import { emojis } from '../../../utils/emojis';

export class DiscordUserService {

  // ===== BIRTHDAY NOTIFICATIONS =====
  async sendBirthdayNotification(
    client: Client,
    notification: BirthdayNotificationDTO
  ): Promise<boolean> {
    try {
      const guild = client.guilds.cache.get(notification.guild.id);
      if (!guild) {
        console.error(`Guild ${notification.guild.id} not found`);
        return false;
      }

      const channel = guild.channels.cache.get(notification.channel.id) as TextChannel;
      if (!channel) {
        console.error(`Channel ${notification.channel.id} not found in guild ${guild.name}`);
        return false;
      }

      if (channel.type !== ChannelType.GuildText) {
        console.error(`Channel ${channel.name} is not a text channel`);
        return false;
      }

      // Vérifier les permissions
      const botMember = guild.members.me;
      if (!botMember || !channel.permissionsFor(botMember)?.has([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks
      ])) {
        console.error(`Missing permissions in channel ${channel.name}`);
        return false;
      }

      const embed = this.createBirthdayEmbed(notification);
      await channel.send({ embeds: [embed] });

      return true;
    } catch (error) {
      console.error('Error sending birthday notification:', error);
      return false;
    }
  }

  private createBirthdayEmbed(notification: BirthdayNotificationDTO): EmbedBuilder {
    const user = notification.user;
    const ageText = user.age ? ` (${user.age} ans)` : '';
    
    const embed = new EmbedBuilder()
      .setColor('#FF6B9D' as ColorResolvable)
      .setTitle(`${emojis.birthday} Joyeux Anniversaire ! ${emojis.birthday}`)
      .setDescription(
        `🎂 C'est l'anniversaire de **${user.name}**${ageText} !\n\n` +
        `${emojis.party} Souhaitons-lui un très bon anniversaire ! ${emojis.party}`
      )
      .setThumbnail('https://cdn.discordapp.com/emojis/823699833029902366.gif') // Emoji gâteau animé
      .setFooter({
        text: `Serveur: ${notification.guild.name}`,
        iconURL: undefined
      })
      .setTimestamp();

    return embed;
  }

  // ===== CHANNEL VALIDATION =====
  async validateBirthdayChannel(client: Client, guildId: string, channelId: string): Promise<{
    isValid: boolean;
    error?: string;
    channel?: TextChannel;
  }> {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return { isValid: false, error: 'Serveur non trouvé' };
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return { isValid: false, error: 'Canal non trouvé' };
      }

      if (channel.type !== ChannelType.GuildText) {
        return { isValid: false, error: 'Le canal doit être un canal textuel' };
      }

      const textChannel = channel as TextChannel;
      const botMember = guild.members.me;
      
      if (!botMember || !textChannel.permissionsFor(botMember)?.has([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks
      ])) {
        return { 
          isValid: false, 
          error: 'Le bot n\'a pas les permissions nécessaires dans ce canal (Envoyer des messages, Intégrer des liens)' 
        };
      }

      return { isValid: true, channel: textChannel };
    } catch (error) {
      console.error('Error validating birthday channel:', error);
      return { isValid: false, error: 'Erreur lors de la validation du canal' };
    }
  }
}