import mongoose, { Schema, Document } from 'mongoose';
import GuildModel, { IGuild } from '../models/guild.model';

// Service pour les opérations liées aux guildes
export class GuildService {
  static async getGuild(guildId: string): Promise<IGuild | null> {
    return GuildModel.findOne({ guildId });
  }

  /**
   * Crée une guilde
   */
  static async createGuild(guildId: string, name?: string): Promise<IGuild> {
    return GuildModel.create({
      guildId,
      name,
    });
  }

  /**
   * Récupère une guilde existante ou en crée une nouvelle
   */
  static async getOrCreateGuild(guildId: string, name?: string): Promise<IGuild> {
    const guild = await this.getGuild(guildId);
    if (guild) {
      return guild;
    }
    
    return this.createGuild(guildId, name);
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