import { Events, Message, ChannelType, EmbedBuilder } from 'discord.js';
import { BotClient } from '../client';
import { GuildService } from '../services/guild.service';
import { UserService } from '../services/guildUser.service';

export default {
  name: Events.MessageCreate,
  once: false,
  
  /**
   * Gère l'événement messageCreate pour exécuter les commandes
   * @param client Le client Discord
   * @param message Le message reçu
   */
  async execute(client: BotClient, message: Message) {
    // Ignorer les messages des bots et les messages privés
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.channel.type !== ChannelType.GuildText) return;
    
    // Vérifier et créer la guilde si nécessaire
    const guildData = await GuildService.getOrCreateGuild(message.guild.id, message.guild.name);
    if (!guildData) return;

    // Vérifier et créer l'utilisateur si nécessaire
    let guildUser = await UserService.getGuildUserByDiscordId(message.author.id, message.guild.id);
    if (!guildUser) {
      guildUser = await UserService.createGuildUser(message.author, message.guild);
    }

    // Incrémentation du nombre de messages total
    await UserService.incrementTotalMsg(message.author.id, message.guild.id);

    // Donne de l'xp aléatoire entre 6 et 10
    const randomXp = Math.floor(Math.random() * (10 - 6 + 1)) + 6;
    await UserService.giveXpToUser(client, message, randomXp);

    // Récupérer le préfixe de la guilde
    const prefix = guildData.config?.prefix || '!';
    
    // Vérifie si c'est une commande
    if (!message.content.startsWith(prefix)) return;
    
    // Extraction du nom de la commande et des arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    
    if (!commandName) return;
    
    // Recherche de la commande dans la collection
    const command = client.commands.get(commandName);
    
    if (!command) return;

    // Vérification des rôles requis (si la propriété existe)
    if ('roles' in command && Array.isArray(command.roles) && command.roles.length > 0) {
      const hasRole = message.member?.roles.cache.some(role => command.roles.includes(role.id));
      if (!hasRole) {
        const embed = new EmbedBuilder()
          .setTitle('Permission refusée')
          .setDescription('Vous n\'avez pas les rôles requis pour utiliser cette commande.')
          .setColor(0xFF0000);
        return message.reply({ embeds: [embed] });
      }
    }
    
    // Exécution de la commande
    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
      await message.reply('Une erreur est survenue lors de l\'exécution de cette commande.');
    }
  }
};