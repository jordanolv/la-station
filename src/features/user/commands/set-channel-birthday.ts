import { Message, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import AppConfigModel from '../../discord/models/app-config.model';
import { EmbedBuilder } from '../../../shared/EmbedBuilder';
import { getGuildId } from '../../../shared/guild';

export default {
  name: 'set-channel-birthday',
  description: 'Définit le salon pour les anniversaires',
  usage: 'set-channel-birthday #channel',
  
  async execute(message: Message, args: string[], client: BotClient) {
    try {
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
        let guild = await AppConfigModel.findOne({});

        if (!guild) {
          guild = new AppConfigModel({
            name: message.guild?.name,
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
        
        console.log(`[User] Canal d'anniversaire défini à ${channel.name} (${channel.id})`);
        
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