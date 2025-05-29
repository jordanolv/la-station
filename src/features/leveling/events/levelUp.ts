import { IGuildUser } from '../../../bot/models/guild-user.model';
import { BotClient } from '../../../bot/client';
import { EmbedBuilder, Message, TextChannel } from 'discord.js';
import { LevelingService } from '../leveling.service';

export default {
  name: 'levelUp',
  once: false,
  
  /**
   * Gère l'événement de montée de niveau
   * @param client Le client Discord
   * @param user L'utilisateur qui a atteint le niveau
   * @param message Le message qui a été envoyé
   */
  async execute(client: BotClient, user: IGuildUser, message: Message) {
    console.log(`${user.name} a atteint le niveau ${user.profil.lvl}`);

    try {
      // Récupération des données de leveling pour cette guild
      const guildId = message.guild?.id;
      if (!guildId) return;
      
      const levelingData = await LevelingService.getLeveling(guildId);
      if (!levelingData || !levelingData.enabled || !levelingData.notifLevelUp) return;

      // Création de l'embed de level up
      const embed = new EmbedBuilder()
        .setColor('#dac1ff') // Utiliser la couleur primaire si disponible
        .setTitle(`<a:tadaled:797945456511811624> Level Up !`)
        .setDescription(`${user.name} a atteint le niveau ${user.profil.lvl} !`)
        .setThumbnail('https://cdn.discordapp.com/attachments/1360760238348964022/1360760293839470673/levelUp.gif?ex=67fc4a47&is=67faf8c7&hm=d933e2c8637a5f43ed0bff7c06f84a241775462d55d8bfdf3f5366f66a2c8e6e&')
        .setTimestamp();

      // Envoi de la notification
      if (levelingData.channelNotif) {
        try {
          const channel = await client.channels.fetch(levelingData.channelNotif);
          if (channel && channel instanceof TextChannel) {
            await channel.send({ embeds: [embed] });
            return;
          }
        } catch (error) {
          console.error('Erreur lors de l\'envoi dans le canal de notification:', error);
        }
      }

      // Si pas de canal spécifique ou erreur, répondre au message
      const messageToSend = await message.reply({ embeds: [embed] });

      // Supprimer après un délai
      setTimeout(() => {
        messageToSend.delete().catch(console.error);
      }, 7500);
      
    } catch (error) {
      console.error('Erreur dans l\'événement levelUp:', error);
    }
  }
}; 