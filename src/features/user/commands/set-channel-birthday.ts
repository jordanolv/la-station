import { Message, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import BirthdayModel from '../models/birthday.model';

export default {
  name: 'set-channel-birthday',
  description: 'Définit le salon pour les anniversaires',
  usage: 'set-channel-birthday #channel',
  
  async execute(message: Message, args: string[], client: BotClient) {
    try {
      if (!message.guild) {
        return message.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.'
        });
      }

      // Vérifier les permissions
      if (!message.member?.permissions.has('ManageGuild')) {
        return message.reply({
          content: '❌ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.'
        });
      }

      if (!args.length || !message.mentions.channels.first()) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel. Exemple: `set-channel-birthday #birthday`'
        });
      }

      const channel = message.mentions.channels.first() as TextChannel;
      
      if (!channel || channel.type !== 0) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel valide.'
        });
      }

      try {
        // Récupérer ou créer la configuration d'anniversaire pour cette guilde
        let birthdayConfig = await BirthdayModel.findOne({ guildId: message.guild.id });
        
        if (!birthdayConfig) {
          birthdayConfig = new BirthdayModel({
            guildId: message.guild.id,
            enabled: true,
            channel: channel.id
          });
        } else {
          birthdayConfig.channel = channel.id;
          if (!birthdayConfig.enabled) {
            birthdayConfig.enabled = true;
          }
        }
        
        // Enregistrer la mise à jour
        await birthdayConfig.save();
        
        console.log(`[User] Canal d'anniversaire défini à ${channel.name} (${channel.id}) pour le serveur ${message.guild.name}`);
        
        const reply = await message.reply({
          content: `✅ Le salon ${channel} a été défini comme salon d'anniversaire!`
        });

        setTimeout(() => {
          reply.delete().catch(console.error);
          message.delete().catch(console.error);
        }, 5000);
      } catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres d\'anniversaire:', error);
        await message.reply({
          content: '❌ Une erreur est survenue lors de la mise à jour des paramètres d\'anniversaire.'
        });
      }
    } catch (error) {
      console.error('Erreur dans la commande set-channel-birthday:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 