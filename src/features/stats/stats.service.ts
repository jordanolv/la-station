import { VoiceState } from 'discord.js';
import GuildUserModel from '../user/models/guild-user.model';
import { LogService } from '../../shared/logs/logs.service';

// Stockage temporaire des états vocaux
const voiceStates: Map<string, { joinTime: number }> = new Map();

export class StatsService {
  /**
   * Enregistre le début d'une session vocale pour un utilisateur
   */
  static startVoiceSession(userId: string, guildId: string): void {
    const userKey = `${userId}-${guildId}`;
    voiceStates.set(userKey, { joinTime: Date.now() });
  }

  /**
   * Termine une session vocale et met à jour les statistiques
   */
  static async endVoiceSession(userId: string, guildId: string, username: string): Promise<void> {
    const userKey = `${userId}-${guildId}`;
    const userState = voiceStates.get(userKey);
    
    if (!userState) return;
    
    const voiceTime = Math.floor((Date.now() - userState.joinTime) / 1000); // Temps en secondes
    voiceStates.delete(userKey);
    
    try {
      await this.updateVoiceStats(userId, guildId, username, voiceTime);
      
      // Ajout du log de session vocale
      await LogService.info(
        guildId,
        `${username} a passé ${this.formatVoiceTime(voiceTime)} en vocal`,
        { 
          feature: 'stats',
          title: 'Session vocale terminée'
        }
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques vocales:', error);
      await LogService.error(
        guildId,
        `Erreur lors de l'enregistrement de la session vocale pour ${username}: ${error}`,
        { 
          feature: 'stats',
          title: 'Erreur de statistiques' 
        }
      );
    }
  }

  /**
   * Met à jour les statistiques vocales d'un utilisateur
   */
  static async updateVoiceStats(
    userId: string, 
    guildId: string, 
    username: string, 
    voiceTime: number
  ): Promise<void> {
    try {
      const guildUser = await GuildUserModel.findOne({
        discordId: userId,
        guildId: guildId
      });
      
      if (guildUser) {
        // Ajouter le temps passé en vocal
        guildUser.stats.voiceTime += voiceTime;
        
        // Ajouter une entrée dans l'historique vocal
        guildUser.stats.voiceHistory.push({
          date: new Date(),
          time: voiceTime
        });
        
        // Limiter l'historique à 100 entrées
        if (guildUser.stats.voiceHistory.length > 100) {
          guildUser.stats.voiceHistory = guildUser.stats.voiceHistory.slice(-100);
        }
        
        await guildUser.save();
      } else {
        // Créer un nouvel utilisateur s'il n'existe pas
        await GuildUserModel.create({
          discordId: userId,
          name: username || 'Unknown User',
          guildId: guildId,
          stats: {
            totalMsg: 0,
            voiceTime: voiceTime,
            voiceHistory: [{
              date: new Date(),
              time: voiceTime
            }]
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques utilisateur:', error);
      throw error;
    }
  }

  /**
   * Incrémente le compteur de messages pour un utilisateur
   */
  static async incrementMessageCount(userId: string, guildId: string, username: string): Promise<void> {
    try {
      const guildUser = await GuildUserModel.findOne({
        discordId: userId,
        guildId: guildId
      });
      
      if (guildUser) {
        guildUser.stats.totalMsg += 1;
        await guildUser.save();
      } else {
        // Créer un nouvel utilisateur s'il n'existe pas
        await GuildUserModel.create({
          discordId: userId,
          name: username || 'Unknown User',
          guildId: guildId,
          stats: {
            totalMsg: 1,
            voiceTime: 0,
            voiceHistory: []
          }
        });
      }
      
      // Log du message uniquement tous les 100 messages pour éviter de surcharger les logs
      if (guildUser && guildUser.stats.totalMsg % 100 === 0) {
        await LogService.info(
          guildId,
          `${username} a atteint ${guildUser.stats.totalMsg} messages`,
          {
            feature: 'stats',
            title: 'Statistiques de messages'
          }
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du compteur de messages:', error);
      await LogService.error(
        guildId,
        `Erreur lors de l'incrémentation du compteur de messages pour ${username}: ${error}`,
        {
          feature: 'stats',
          title: 'Erreur de statistiques'
        }
      );
      throw error;
    }
  }

  /**
   * Gère l'événement quand un utilisateur rejoint un canal vocal
   */
  static handleUserJoinVoice(oldState: VoiceState, newState: VoiceState): void {
    const userId = newState.id;
    const guildId = newState.guild.id;
    
    this.startVoiceSession(userId, guildId);
  }

  /**
   * Gère l'événement quand un utilisateur quitte un canal vocal
   */
  static async handleUserLeaveVoice(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const userId = oldState.id;
    const guildId = oldState.guild.id;
    const username = oldState.member?.user.username || 'Unknown User';
    
    await this.endVoiceSession(userId, guildId, username);
  }
  
  /**
   * Formate le temps vocal en heures, minutes et secondes
   */
  private static formatVoiceTime(seconds: number): string {
    if (seconds < 60) return `${seconds} secondes`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} heure${hours > 1 ? 's' : ''} et ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
  }
} 