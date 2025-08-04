import { VoiceState } from 'discord.js';
import { LogService } from '../../../shared/logs/logs.service';
import { BotClient } from '../../../bot/client';
import { UserRepository } from '../../user/services/user.repository';

// Stockage temporaire des états vocaux
const voiceStates: Map<string, { joinTime: number }> = new Map();

export class StatsService {
  private static userRepo = new UserRepository();
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
  static async endVoiceSession(client: BotClient, userId: string, guildId: string, username: string): Promise<void> {
    const userKey = `${userId}-${guildId}`;
    const userState = voiceStates.get(userKey);
    
    if (!userState) return;
    
    const voiceTime = Math.floor((Date.now() - userState.joinTime) / 1000); // Temps en secondes
    voiceStates.delete(userKey);
    
    try {
      await this.updateVoiceStats(userId, guildId, username, voiceTime);
      
      // Ajout du log de session vocale
      await LogService.info(
        client,
        guildId,
        `${username} a passé ${this.formatVoiceTime(voiceTime)} en vocal`,
        { feature: 'stats', title: 'Session vocale terminée' }
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques vocales:', error);
      await LogService.error(
        client,
        guildId,
        `Erreur lors de l'enregistrement de la session vocale pour ${username}: ${error}`,
        { feature: 'stats', title: 'Erreur de statistiques' }
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
      const guildUser = await this.userRepo.findGuildUserById(userId, guildId);
      
      if (guildUser) {
        // Ajouter l'entrée dans l'historique vocal
        guildUser.stats.voiceHistory.push({
          date: new Date(),
          time: voiceTime
        });
        
        // Limiter l'historique à 100 entrées
        if (guildUser.stats.voiceHistory.length > 100) {
          guildUser.stats.voiceHistory = guildUser.stats.voiceHistory.slice(-100);
        }
        
        // Mettre à jour le temps total
        guildUser.stats.voiceTime += voiceTime;
        guildUser.infos.updatedAt = new Date();
        await guildUser.save();
      } else {
        // Créer un nouvel utilisateur s'il n'existe pas
        const newUser = await this.userRepo.createGuildUser({
          discordId: userId,
          name: username || 'Unknown User',
          guildId: guildId
        });
        
        // Puis mettre à jour avec les stats vocales
        newUser.stats.voiceTime = voiceTime;
        newUser.stats.voiceHistory.push({
          date: new Date(),
          time: voiceTime
        });
        await newUser.save();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques utilisateur:', error);
      throw error;
    }
  }

  /**
   * Incrémente le compteur de messages pour un utilisateur
   */
  static async incrementMessageCount(client: BotClient, userId: string, guildId: string, username: string): Promise<void> {
    try {
      const guildUser = await this.userRepo.findGuildUserById(userId, guildId);
      
      if (guildUser) {
        await this.userRepo.updateGuildUser(userId, guildId, {
          stats: { totalMsg: guildUser.stats.totalMsg + 1 }
        });
        
        // Log du message uniquement tous les 100 messages pour éviter de surcharger les logs
        if ((guildUser.stats.totalMsg + 1) % 100 === 0) {
          await LogService.info(
            client,
            guildId,
            `${username} a atteint ${guildUser.stats.totalMsg + 1} messages`,
            { feature: 'stats', title: 'Statistiques de messages' }
          );
        }
      } else {
        // Créer un nouvel utilisateur s'il n'existe pas
        const newUser = await this.userRepo.createGuildUser({
          discordId: userId,
          name: username || 'Unknown User',
          guildId: guildId
        });
        
        // Puis incrémenter le compteur de messages
        newUser.stats.totalMsg = 1;
        await newUser.save();
      }
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du compteur de messages:', error);
      await LogService.error(
        client,
        guildId,
        `Erreur lors de l'incrémentation du compteur de messages pour ${username}: ${error}`,
        { feature: 'stats', title: 'Erreur de statistiques' }
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
  static async handleUserLeaveVoice(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    const userId = oldState.id;
    const guildId = oldState.guild.id;
    const username = oldState.member?.user.username || 'Unknown User';
    
    await this.endVoiceSession(client, userId, guildId, username);
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