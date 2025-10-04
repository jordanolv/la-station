import GuildModel from '../../discord/models/guild.model';
import { ArcadeGameName } from '../types/arcade.types';

export class ArcadeStatsService {
  /**
   * Incrémente le nombre total de parties pour un jeu dans une guilde
   */
  static async incrementGameCount(guildId: string, gameName: ArcadeGameName) {
    const field = `features.arcade.${gameName}.stats.totalGames`;
    return GuildModel.findOneAndUpdate(
      { guildId },
      { $inc: { [field]: 1 } },
      { new: true, upsert: true }
    );
  }

  /**
   * Récupère les statistiques d'un jeu pour une guilde
   */
  static async getGameStats(guildId: string, gameName: ArcadeGameName) {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.arcade?.[gameName]?.stats?.totalGames || 0;
  }

  /**
   * Récupère toutes les statistiques arcade d'une guilde
   */
  static async getAllStats(guildId: string) {
    const guild = await GuildModel.findOne({ guildId });
    if (!guild?.features?.arcade) {
      return { shifumi: 0, puissance4: 0, morpion: 0, battle: 0 };
    }

    return {
      shifumi: guild.features.arcade.shifumi?.stats?.totalGames || 0,
      puissance4: guild.features.arcade.puissance4?.stats?.totalGames || 0,
      morpion: guild.features.arcade.morpion?.stats?.totalGames || 0,
      battle: guild.features.arcade.battle?.stats?.totalGames || 0
    };
  }

  /**
   * Vérifie si un jeu est activé dans une guilde
   */
  static async isGameEnabled(guildId: string, gameName: ArcadeGameName): Promise<boolean> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.arcade?.[gameName]?.enabled ?? true;
  }

  /**
   * Active ou désactive un jeu dans une guilde
   */
  static async toggleGame(guildId: string, gameName: ArcadeGameName, enabled: boolean) {
    const field = `features.arcade.${gameName}.enabled`;
    return GuildModel.findOneAndUpdate(
      { guildId },
      { $set: { [field]: enabled } },
      { new: true, upsert: true }
    );
  }
}
