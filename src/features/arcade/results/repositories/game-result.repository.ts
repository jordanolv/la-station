import GameResultModel, { GameResult, ResultGame } from '../models/game-result.model';

export interface Champion {
  userId: string;
  wins: number;
  byGame: Partial<Record<ResultGame, number>>;
}

export class GameResultRepository {
  static async record(game: ResultGame, userId: string, rank = 1, details: GameResult['details'] = {}): Promise<void> {
    await GameResultModel.create({ game, userId, rank, details });
  }

  /** Victoires (rang 1) par joueur sur une période, triées. */
  static async championsBetween(from: Date, to: Date, limit = 3): Promise<{ top: Champion[]; total: number }> {
    const rows = await GameResultModel.find({ rank: 1, at: { $gte: from, $lt: to } }).select('game userId').lean();
    const byUser = new Map<string, Champion>();
    for (const { userId, game } of rows) {
      const c = byUser.get(userId) ?? { userId, wins: 0, byGame: {} };
      c.wins++;
      c.byGame[game] = (c.byGame[game] ?? 0) + 1;
      byUser.set(userId, c);
    }
    const top = [...byUser.values()].sort((a, b) => b.wins - a.wins).slice(0, limit);
    return { top, total: rows.length };
  }

  static async lastWinsOf(userId: string): Promise<Partial<Record<ResultGame, Date>>> {
    const rows = await GameResultModel.aggregate<{ _id: ResultGame; at: Date }>([
      { $match: { userId, rank: 1 } },
      { $group: { _id: '$game', at: { $max: '$at' } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.at]));
  }
}
