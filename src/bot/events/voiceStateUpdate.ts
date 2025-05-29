import { Events, VoiceState, ChannelType } from 'discord.js';
import { BotClient } from '../client';
import { GuildService } from '../services/guild.service';
import { UserService } from '../services/guildUser.service';

// Map pour stocker les temps de début de session vocale
const voiceStartTimes = new Map<string, number>();

export default {
  name: Events.VoiceStateUpdate,
  once: false,

  async execute(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    // Ignorer les bots
    if (oldState.member?.user.bot) return;
    if (!oldState.guild || !newState.guild) return;

    const guildId = oldState.guild.id;
    const userId = oldState.member?.id;

    if (!userId) return;

    // Vérifier et créer l'utilisateur si nécessaire
    let guildUser = await UserService.getGuildUserByDiscordId(userId, guildId);
    if (!guildUser) {
      guildUser = await UserService.createGuildUser(oldState.member.user, oldState.guild);
    }

    const guildData = await GuildService.getGuild(guildId);
    if (!guildData) return;

    // Gestion du temps passé en vocal
    if (oldState.channelId && !newState.channelId) {
      // Quitte un salon
      const joinTime = voiceStartTimes.get(userId);
      if (joinTime) {
        const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
        await UserService.incrementVoiceTime(userId, guildId, timeSpent);
        voiceStartTimes.delete(userId);
        console.log(`Utilisateur ${userId} a quitté le canal vocal ${oldState.channelId} après ${timeSpent} secondes`);
      }
    } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      // Change de salon
      const joinTime = voiceStartTimes.get(userId);
      if (joinTime) {
        const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
        await UserService.incrementVoiceTime(userId, guildId, timeSpent);
        voiceStartTimes.set(userId, Date.now());
        console.log(`Utilisateur ${userId} a changé de canal vocal: ${oldState.channelId} -> ${newState.channelId}`);
      }
    } else if (!oldState.channelId && newState.channelId) {
      // Rejoint un salon
      voiceStartTimes.set(userId, Date.now());
      console.log(`Utilisateur ${userId} a rejoint le canal vocal ${newState.channelId}`);
    }

    // La logique pour la création/suppression de salons vocaux personnalisés peut être ajoutée ici
    // Cette partie dépendra fortement de la structure de vos données et fonctionnalités
  }
};
