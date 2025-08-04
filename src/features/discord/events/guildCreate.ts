import { Events, Guild } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { GuildService } from '../services/guild.service';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildCreate,
  once: false,
  
  /**
   * Gère l'événement de création de guilde
   * @param client Le client Discord
   * @param guild La guilde qui vient d'être ajoutée
   */
  async execute(client: BotClient, guild: Guild) {
    try {
      console.log(`Le bot a rejoint une nouvelle guilde: ${guild.name} (${guild.id})`);
      
      await GuildService.getOrCreateGuild(
        guild.id, 
        guild.name, 
      );
      
      await LogService.info(
        client,
        guild.id, 
        `Le bot a été ajouté à la guilde ${guild.name}. Toutes les features ont été initialisées.`,
        { feature: 'system', title: 'Guilde ajoutée' }
      );      
    } catch (error) {
      console.error(`Erreur lors de l'ajout à une nouvelle guilde:`, error);
    }
  }
}; 