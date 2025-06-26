import { IGuildUser } from '../../user/models/guild-user.model';
import { BotClient } from '../../../bot/client';
import { EmbedBuilder, Message, TextChannel } from 'discord.js';
import { LevelingService } from '../leveling.service';
import { emojis } from '../../../utils/emojis';

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
      if (!levelingData || !levelingData.enabled || !levelingData) return;

      message.react(emojis.levelUp).catch(console.error);

    } catch (error) {
      console.error('Erreur dans l\'événement levelUp:', error);
    }
  }
}; 