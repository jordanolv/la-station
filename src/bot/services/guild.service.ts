import mongoose, { Schema, Document } from 'mongoose';
import GuildModel, { IGuild } from '../models/guild.model';
import { LevelingService } from '../../features/leveling/leveling.service';
import { VocManagerService } from '../../features/voc-manager/vocManager.service';

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
      
      // Ajoutez ici l'initialisation d'autres features au fur et à mesure de leur développement
      
      console.log(`Toutes les features ont été initialisées pour la guilde ${guildId}`);
    } catch (error) {
      console.error(`Erreur lors de l'initialisation des features pour la guilde ${guildId}:`, error);
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
} 