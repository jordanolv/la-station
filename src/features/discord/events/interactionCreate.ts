import { Events, Interaction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { GuildService } from '../services/guild.service';
import { SuggestionsService } from '../../suggestions/suggestions.service';

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(client: BotClient, interaction: Interaction) {
    try {
      // S'assurer que la guilde est en BDD
      if (interaction.guild) {
        await GuildService.getOrCreateGuild(interaction.guild.id, interaction.guild.name);
      }

      // Gestion des commandes slash
      if (interaction.isCommand && interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command) {
          return;
        }
        
        try {
          await command.execute(client, interaction);
        } catch (error) {
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
              content: 'Une erreur est survenue lors de l\'exécution de cette commande.', 
              ephemeral: true 
            });
          } else {
            await interaction.reply({ 
              content: 'Une erreur est survenue lors de l\'exécution de cette commande.', 
              ephemeral: true 
            });
          }
        }
      }
      
      // Gestion des boutons
      else if (interaction.isButton && interaction.isButton()) {
        if (interaction.customId === 'create_suggestion') {
          await SuggestionsService.handleButtonInteraction(interaction);
        } else {
        }
      }
      
      // Gestion des menus de sélection
      else if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      }
      
      // Gestion des modals
      else if (interaction.isModalSubmit && interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('suggestion_modal_')) {
          await SuggestionsService.handleModalSubmit(interaction);
        } else {
        }
      }
    } catch (error) {
    }
  }
};