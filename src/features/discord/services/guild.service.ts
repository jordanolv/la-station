import mongoose, { Schema, Document } from 'mongoose';
import GuildModel, { IGuild } from '../models/guild.model';
import { LevelingService } from '../../leveling/services/leveling.service';
import { VocManagerService } from '../../voc-manager/services/vocManager.service';
import { ChatGamingService } from '../../chat-gaming/services/chatGaming.service';
import { SuggestionsService } from '../../suggestions/services/suggestions.service';

// Service pour les opérations liées aux guildes
export class GuildService {
  static async getGuild(guildId: string): Promise<IGuild | null> {
    return GuildModel.findOne({ guildId });
  }

  /**
   * Initialise toutes les features pour une guilde
   */
  static async initializeAllFeatures(guildId: string, initEnabled: boolean = false): Promise<void> {
    try {
      // Initialisation du leveling
      await LevelingService.getOrCreateLeveling(guildId, initEnabled);
      
      // Initialisation du gestionnaire de canaux vocaux
      await VocManagerService.getOrCreateVocManager(guildId, initEnabled);
      
      // Initialisation du chat gaming
      await ChatGamingService.getOrCreateChatGaming(guildId, initEnabled);
      
      // Initialisation du système de suggestions
      await SuggestionsService.getOrCreateSuggestionsConfig(guildId);
      
      // Ajoutez ici l'initialisation d'autres features au fur et à mesure de leur développement
      
    } catch (error) {
    }
  }

  /**
   * Crée une guilde et initialise automatiquement toutes ses features
   */
  static async createGuild(
    guildId: string, 
    name?: string, 
    initFeaturesEnabled: boolean = false
  ): Promise<IGuild> {
    // Créer la guilde
    const guild = await GuildModel.create({
      guildId,
      name,
    });
    
    // Initialiser automatiquement toutes les features
    await this.initializeAllFeatures(guildId, initFeaturesEnabled);
    
    return guild;
  }

  /**
   * Récupère une guilde existante ou en crée une nouvelle avec toutes ses features
   */
  static async getOrCreateGuild(
    guildId: string, 
    name?: string, 
    initFeaturesEnabled: boolean = false
  ): Promise<IGuild> {
    const guild = await this.getGuild(guildId);
    if (guild) {
      return guild;
    }
    
    // Créer la guilde avec toutes ses features
    return this.createGuild(guildId, name, initFeaturesEnabled);
  }

  /**
   * Met à jour les paramètres de la guilde
   */
  static async updateSettings(guildId: string, config: any): Promise<IGuild | null> {
    return GuildModel.findOneAndUpdate(
      { guildId },
      { $set: { config } },
      { new: true }
    );
  }
} 