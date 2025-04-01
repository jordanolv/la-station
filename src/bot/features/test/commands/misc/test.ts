import { Message } from 'discord.js';

export default {
  name: 'test',
  description: 'Une commande de test simple',
  usage: 'test',
  
  /**
   * Exécute la commande test
   * @param message Le message Discord
   * @param args Les arguments de la commande
   */
  async execute(message: Message, args: string[]) {
    try {
      await message.reply({
        content: '✅ La commande test fonctionne correctement!'
      });
    } catch (error) {
      console.error('Erreur dans la commande test:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};