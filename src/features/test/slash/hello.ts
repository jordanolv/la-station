import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Salue l\'utilisateur qui a lancé la commande')
    .addStringOption(option => 
      option
        .setName('nom')
        .setDescription('Votre nom (optionnel)')
        .setRequired(false)
    ),
    
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const userName = interaction.options.getString('nom') || interaction.user.username;
      
      await interaction.reply({
        content: `👋 Bonjour ${userName}! Bienvenue dans le test de La Station!`,
        ephemeral: false
      });
    } catch (error) {
      console.error('Erreur dans la slash command hello:', error);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'Une erreur est survenue lors de l\'exécution de la commande.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'Une erreur est survenue lors de l\'exécution de la commande.', 
          ephemeral: true 
        });
      }
    }
  }
}; 