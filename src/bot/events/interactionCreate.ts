import { Events, Interaction, ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../client';
import { GuildService } from '../services/guild.service';
import { UserService } from '../services/guildUser.service';

export default {
  name: Events.InteractionCreate,
  once: false,
  
  async execute(client: BotClient, interaction: Interaction) {
    // Ne traiter que les slash commands
    if (!interaction.isChatInputCommand()) return;
    
    if (!interaction.guild) return;

    // Vérifier et créer la guilde si nécessaire
    const guildData = await GuildService.getOrCreateGuild(interaction.guild.id, interaction.guild.name);
    if (!guildData) return;

    // Vérifier et créer l'utilisateur si nécessaire
    let guildUser = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!guildUser) {
      guildUser = await UserService.createGuildUser(interaction.user, interaction.guild);
    }
    
    console.log(interaction.commandName);
    console.log(client.slashCommands);
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;
    
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
      const errorMessage = 'Une erreur est survenue lors de l\'exécution de cette commande.';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};
