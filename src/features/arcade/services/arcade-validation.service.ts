import { ChatInputCommandInteraction, User } from 'discord.js';
import { UserService } from '../../user/services/user.service';
import { ArcadeStatsService } from './arcade-stats.service';
import { ArcadeGameName } from '../types/arcade.types';
import { getGuildId } from '../../../shared/guild';

export class ArcadeValidationService {
  static async checkGameEnabled(
    interaction: ChatInputCommandInteraction,
    gameName: ArcadeGameName
  ): Promise<boolean> {
    const isEnabled = await ArcadeStatsService.isGameEnabled(gameName);

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

  static async checkOpponentValid(
    interaction: ChatInputCommandInteraction,
    challenger: User,
    opponent: User
  ): Promise<boolean> {
    if (opponent.id === challenger.id) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas jouer contre vous-même !',
        flags: ['Ephemeral']
      });
      return false;
    }

    if (opponent.bot) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas jouer contre un bot !',
        flags: ['Ephemeral']
      });
      return false;
    }

    return true;
  }

  static async checkRidgeCoins(
    interaction: ChatInputCommandInteraction,
    challenger: User,
    opponent: User,
    bet: number
  ): Promise<boolean> {
    if (bet <= 0) return true;

    const challengerMoney = await UserService.getUserMoney(challenger.id);
    const opponentMoney = await UserService.getUserMoney(opponent.id);

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

  static async validatePvPGame(
    interaction: ChatInputCommandInteraction,
    challenger: User,
    opponent: User,
    bet: number,
    gameName: ArcadeGameName
  ): Promise<boolean> {
    if (!await this.checkGameEnabled(interaction, gameName)) return false;
    if (!await this.checkOpponentValid(interaction, challenger, opponent)) return false;
    if (!await this.checkRidgeCoins(interaction, challenger, opponent, bet)) return false;
    return true;
  }
}
