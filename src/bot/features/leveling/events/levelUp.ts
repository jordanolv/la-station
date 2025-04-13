import { IGuildUser } from '@/database/models/GuildUser';
import { BotClient } from '../../../BotClient';
import { EmbedBuilder, Message, TextChannel } from 'discord.js';
export default {
  name: 'levelUp',
  once: false,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   * @param user L'utilisateur qui a atteint le niveau
   * @param message Le message qui a été envoyé
   */
  async execute(client: BotClient, user: IGuildUser, message: Message) {
    console.log(`${user.name} a atteint le niveau ${user.profil.lvl}`);

    const embed = new EmbedBuilder()
      .setColor(user.guild.config.colors.primary)
      .setTitle(`<a:tadaled:797945456511811624> Level Up !`)
      .setDescription(`${user.name} a atteint le niveau ${user.profil.lvl} !`)
      .setThumbnail('https://cdn.discordapp.com/attachments/1360760238348964022/1360760293839470673/levelUp.gif?ex=67fc4a47&is=67faf8c7&hm=d933e2c8637a5f43ed0bff7c06f84a241775462d55d8bfdf3f5366f66a2c8e6e&')
      .setTimestamp();

    const messageToSend = await message.reply({ embeds: [embed] });

    setTimeout(() => {
      messageToSend.delete();
    }, 7500);


  }
};