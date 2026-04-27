import { User } from 'discord.js';
import { UserService } from '../../user/services/user.service';
import { ArcadeStatsService } from './arcade-stats.service';
import { ArcadeGameName } from '../types/arcade.types';

const GAME_LABELS: Record<ArcadeGameName, string> = {
  shifumi: 'Le shifumi',
  puissance4: 'Le puissance 4',
  battle: 'La battle',
  morpion: 'Le morpion',
  bingo: 'Le bingo',
};

export class ArcadeValidationService {
  static async isGameEnabled(gameName: ArcadeGameName): Promise<string | null> {
    const enabled = await ArcadeStatsService.isGameEnabled(gameName);
    return enabled ? null : `❌ ${GAME_LABELS[gameName]} est actuellement désactivé sur ce serveur.`;
  }

  static checkOpponentValid(challenger: User, opponent: User): string | null {
    if (opponent.id === challenger.id) return '❌ Vous ne pouvez pas jouer contre vous-même !';
    if (opponent.bot) return '❌ Vous ne pouvez pas jouer contre un bot !';
    return null;
  }

  static async checkRidgeCoins(challenger: User, opponent: User, bet: number): Promise<string | null> {
    if (bet <= 0) return null;
    const [challengerMoney, opponentMoney] = await Promise.all([
      UserService.getUserMoney(challenger.id),
      UserService.getUserMoney(opponent.id),
    ]);
    if (challengerMoney < bet) return `❌ Vous n'avez pas assez de RidgeCoins ! (${challengerMoney}/${bet})`;
    if (opponentMoney < bet) return `❌ ${opponent.username} n'a pas assez de RidgeCoins ! (${opponentMoney}/${bet})`;
    return null;
  }

  static async validatePvPGame(
    challenger: User,
    opponent: User,
    bet: number,
    gameName: ArcadeGameName,
  ): Promise<string | null> {
    const opponentErr = this.checkOpponentValid(challenger, opponent);
    if (opponentErr) return opponentErr;

    const [enabledErr, coinErr] = await Promise.all([
      this.isGameEnabled(gameName),
      this.checkRidgeCoins(challenger, opponent, bet),
    ]);
    return enabledErr ?? coinErr;
  }
}
