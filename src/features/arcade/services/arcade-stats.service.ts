import AppConfigModel from '../../discord/models/app-config.model';
import { getGuildId } from '../../../shared/guild';
import { ArcadeGameName } from '../types/arcade.types';

export class ArcadeStatsService {
  /**
   * Incrémente le nombre total de parties pour un jeu dans une guilde
   */
  static async incrementGameCount(gameName: ArcadeGameName) {
    const field = `features.arcade.${gameName}.stats.totalGames`;
    return AppConfigModel.findOneAndUpdate(
      {},
      { $inc: { [field]: 1 } },
      { new: true, upsert: true }
    );
  }

  /**
   * Récupère les statistiques d'un jeu pour une guilde
   */
  static async getGameStats(gameName: ArcadeGameName) {
    const guild = await AppConfigModel.findOne({});
    return guild?.features?.arcade?.[gameName]?.stats?.totalGames || 0;
  }

  /**
   * Récupère toutes les statistiques arcade d'une guilde
   */
  static async getAllStats() {
    const guild = await AppConfigModel.findOne({});
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
  static async isGameEnabled(gameName: ArcadeGameName): Promise<boolean> {
    const guild = await AppConfigModel.findOne({});
    return guild?.features?.arcade?.[gameName]?.enabled ?? true;
  }

  /**
   * Active ou désactive un jeu dans une guilde
   */
  static async toggleGame(gameName: ArcadeGameName, enabled: boolean) {
    const field = `features.arcade.${gameName}.enabled`;
    return AppConfigModel.findOneAndUpdate(
      {},
      { $set: { [field]: enabled } },
      { new: true, upsert: true }
    );
  }
}
