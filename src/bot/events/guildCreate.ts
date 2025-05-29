import { Events, Guild } from 'discord.js';
import { BotClient } from '../client';
import { GuildService } from '../services/guild.service';
import { LogService } from '../../shared/log.service';

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
      
      // Initialiser la guilde avec toutes ses features
      const guildData = await GuildService.getOrCreateGuild(
        guild.id, 
        guild.name, 
        true // Activer les features par défaut
      );
      
      // Log de l'événement
      await LogService.info(
        guild.id, 
        `Le bot a été ajouté à la guilde ${guild.name}. Toutes les features ont été initialisées.`,
        { feature: 'system' }
      );
      
      // Envoyer un message de bienvenue dans le premier canal texte disponible
      const channel = guild.channels.cache.find(
        channel => channel.isTextBased() && 
        !channel.isThread() && 
        channel.permissionsFor(client.user?.id || '').has('SendMessages')
      );
      
      if (channel && channel.isTextBased()) {
        await channel.send({
          content: `👋 Merci d'avoir ajouté **La Station** à votre serveur ! Toutes les fonctionnalités ont été initialisées par défaut.`
        });
      }
      
    } catch (error) {
      console.error(`Erreur lors de l'ajout à une nouvelle guilde:`, error);
    }
  }
}; 