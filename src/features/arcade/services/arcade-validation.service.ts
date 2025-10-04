import { ChatInputCommandInteraction, User } from 'discord.js';
import { UserService } from '../../user/services/guildUser.service';
import { ArcadeStatsService } from './arcade-stats.service';
import { ArcadeGameName } from '../types/arcade.types';

export class ArcadeValidationService {
  /**
   * Vérifie si un jeu est activé dans la guilde
   */
  static async checkGameEnabled(
    interaction: ChatInputCommandInteraction,
    gameName: ArcadeGameName
  ): Promise<boolean> {
    if (!interaction.guildId) return true;

    const isEnabled = await ArcadeStatsService.isGameEnabled(interaction.guildId, gameName);

    if (!isEnabled) {
      const gameNames: Record<ArcadeGameName, string> = {
        shifumi: 'Le shifumi',
        puissance4: 'Le puissance 4',
        battle: 'La battle',
        morpion: 'Le morpion'
      };

      await interaction.reply({
        content: `❌ ${gameNames[gameName]} est actuellement désactivé sur ce serveur.`,
        flags: ['Ephemeral']
      });
      return false;
    }

    return true;
  }

  /**
   * Vérifie que l'adversaire est valide
   */
  static async checkOpponentValid(
    interaction: ChatInputCommandInteraction,
    challenger: User,
    opponent: User
  ): Promise<boolean> {
    // Vérifier qu'on ne joue pas contre soi-même
    if (opponent.id === challenger.id) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas jouer contre vous-même !',
        flags: ['Ephemeral']
      });
      return false;
    }

    // Vérifier qu'on ne joue pas contre un bot
    if (opponent.bot) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas jouer contre un bot !',
        flags: ['Ephemeral']
      });
      return false;
    }

    return true;
  }

  /**
   * Vérifie que les deux joueurs ont assez de RidgeCoins
   */
  static async checkRidgeCoins(
    interaction: ChatInputCommandInteraction,
    challenger: User,
    opponent: User,
    bet: number
  ): Promise<boolean> {
    if (bet <= 0) return true;

    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
        flags: ['Ephemeral']
      });
      return false;
    }

    const challengerMoney = await UserService.getGuildUserMoney(challenger.id, interaction.guildId);
    const opponentMoney = await UserService.getGuildUserMoney(opponent.id, interaction.guildId);

    if (challengerMoney < bet) {
      await interaction.reply({
        content: `❌ Vous n'avez pas assez de RidgeCoins ! (${challengerMoney}/${bet})`,
        flags: ['Ephemeral']
      });
      return false;
    }

    if (opponentMoney < bet) {
      await interaction.reply({
        content: `❌ ${opponent.username} n'a pas assez de RidgeCoins ! (${opponentMoney}/${bet})`,
        flags: ['Ephemeral']
      });
      return false;
    }

    return true;
  }

  /**
   * Effectue toutes les validations de base pour un jeu PvP
   */
  static async validatePvPGame(
    interaction: ChatInputCommandInteraction,
    challenger: User,
    opponent: User,
    bet: number,
    gameName: ArcadeGameName
  ): Promise<boolean> {
    // Vérifier si le jeu est activé
    if (!await this.checkGameEnabled(interaction, gameName)) {
      return false;
    }

    // Vérifier l'adversaire
    if (!await this.checkOpponentValid(interaction, challenger, opponent)) {
      return false;
    }

    // Vérifier les RidgeCoins
    if (!await this.checkRidgeCoins(interaction, challenger, opponent, bet)) {
      return false;
    }

    return true;
  }
}
