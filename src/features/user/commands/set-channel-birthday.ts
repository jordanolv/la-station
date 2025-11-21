import { Message, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import GuildModel from '../../discord/models/guild.model';
import { EmbedBuilder } from '../../../shared/EmbedBuilder';

export default {
  name: 'set-channel-birthday',
  description: 'Définit le salon pour les anniversaires',
  usage: 'set-channel-birthday #channel',
  
  async execute(message: Message, args: string[], client: BotClient) {
    try {
      if (!message.guild) {
        return message.reply({
          embeds: [EmbedBuilder.error('Cette commande ne peut être utilisée que dans un serveur.')]
        });
      }

      // Vérifier les permissions
      if (!message.member?.permissions.has('ManageGuild')) {
        return message.reply({
          embeds: [EmbedBuilder.error('Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.')]
        });
      }

      if (!args.length || !message.mentions.channels.first()) {
        return message.reply({
          embeds: [EmbedBuilder.warning('Veuillez mentionner un salon textuel.\nExemple: `set-channel-birthday #birthday`', 'Paramètre manquant')]
        });
      }

      const channel = message.mentions.channels.first() as TextChannel;
      
      if (!channel || channel.type !== 0) {
        return message.reply({
          embeds: [EmbedBuilder.error('Veuillez mentionner un salon textuel valide.')]
        });
      }

      try {
        // Récupérer ou créer la configuration d'anniversaire pour cette guilde
        let guild = await GuildModel.findOne({ guildId: message.guild.id });
        
        if (!guild) {
          guild = new GuildModel({
            guildId: message.guild.id,
            name: message.guild.name,
            features: {
              birthday: {
                enabled: true,
                channel: channel.id
              }
            }
          });
        } else {
          // Mettre à jour la configuration existante
          guild.features = guild.features || {};
          guild.features.birthday = {
            channel: channel.id,
            enabled: true
          };
        }
        
        // Enregistrer la mise à jour
        await guild.save();
        
        console.log(`[User] Canal d'anniversaire défini à ${channel.name} (${channel.id}) pour le serveur ${message.guild.name}`);
        
        const reply = await message.reply({
          embeds: [EmbedBuilder.success(`Le salon ${channel} a été défini comme salon d'anniversaire!`, 'Configuration mise à jour')]
        });

        setTimeout(() => {
          reply.delete().catch(console.error);
          message.delete().catch(console.error);
        }, 5000);
      } catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres d\'anniversaire:', error);
        await message.reply({
          embeds: [EmbedBuilder.error('Une erreur est survenue lors de la mise à jour des paramètres d\'anniversaire.')]
        });
      }
    } catch (error) {
      console.error('Erreur dans la commande set-channel-birthday:', error);
      await message.reply({
        embeds: [EmbedBuilder.error('Une erreur est survenue lors de l\'exécution de la commande.')]
      });
    }
  }
}; 