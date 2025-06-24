import { Events, Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LevelingService } from '../leveling.service';

export default {
  name: Events.MessageCreate,
  once: false,
  
  /**
   * Gère l'événement de réception de message pour attribuer de l'XP
   * @param client Le client Discord
   * @param message Le message reçu
   */
  async execute(client: BotClient, message: Message) {
    try {
      // Ignorer les messages des bots
      if (message.author.bot) return;
      
      // Ignorer les messages privés
      if (!message.guild) return;
      
      // Récupérer les données de leveling pour cette guild
      const levelingData = await LevelingService.getLeveling(message.guild.id);
      
      // Si le leveling n'est pas activé pour cette guild, ne rien faire
      if (!levelingData || !levelingData.enabled) return;
      
      // Donner de l'XP à l'utilisateur
      await LevelingService.giveXpToUser(client, message);
      
    } catch (error) {
      console.error('Erreur lors de l\'attribution d\'XP:', error);
    }
  }
}; 