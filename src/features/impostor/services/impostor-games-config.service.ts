import gamesConfig from '../data/impostor-games-config.json';
import type { ImpostorGamesConfig, ImpostorGameConfig, ImpostorRole, ImpostorChallenge } from '../types/impostor.types';

class ImpostorGamesConfigService {
  private config: ImpostorGamesConfig;

  constructor() {
    this.config = gamesConfig as ImpostorGamesConfig;
  }

  getGames(): ImpostorGameConfig[] {
    return this.config.games;
  }

  getGame(gameId: string): ImpostorGameConfig | null {
    return this.config.games.find((g) => g.id === gameId) ?? null;
  }

  getRole(gameId: string, roleId: string): ImpostorRole | null {
    return this.getGame(gameId)?.roles.find((r) => r.id === roleId) ?? null;
  }

  /**
   * Returns a shuffled list of roleIds for a team of `playerCount` players.
   * Guarantees required roles first, then fills remaining slots by weighted random.
   */
  assignTeamRoles(playerCount: number, roles: ImpostorRole[]): string[] {
    const result: string[] = [];
    const counts: Record<string, number> = {};

    for (const role of roles) {
      const n = Math.min(role.required, playerCount);
      for (let i = 0; i < n; i++) {
        result.push(role.id);
        counts[role.id] = (counts[role.id] ?? 0) + 1;
      }
    }

    const remaining = playerCount - result.length;
    for (let i = 0; i < remaining; i++) {
      const available = roles.filter((r) => {
        if (r.weight === 0) return false;
        if (r.maxPerTeam !== null && (counts[r.id] ?? 0) >= r.maxPerTeam) return false;
        return true;
      });

      if (!available.length) {
        const fallback = roles.find((r) => r.weight > 0) ?? roles[roles.length - 1];
        result.push(fallback.id);
        counts[fallback.id] = (counts[fallback.id] ?? 0) + 1;
        continue;
      }

      const totalWeight = available.reduce((s, r) => s + r.weight, 0);
      let rand = Math.random() * totalWeight;
      let picked = available[available.length - 1];
      for (const role of available) {
        rand -= role.weight;
        if (rand <= 0) { picked = role; break; }
      }

      result.push(picked.id);
      counts[picked.id] = (counts[picked.id] ?? 0) + 1;
    }

    return result.sort(() => Math.random() - 0.5);
  }

  /**
   * Picks challenges matching the provided difficulty template (one slot per entry).
   * All players in a game share the same template — only the texts differ.
   * Excludes already-used texts. Falls back to any available challenge if a difficulty is exhausted.
   */
  getRandomChallenges(game: ImpostorGameConfig, difficultyTemplate: string[], usedTexts?: Set<string>): ImpostorChallenge[] {
    const pools: Record<string, ImpostorChallenge[]> = { easy: [], medium: [], hard: [] };

    for (const c of game.challenges) {
      if ((!usedTexts || !usedTexts.has(c.text)) && pools[c.difficulty]) {
        pools[c.difficulty].push(c);
      }
    }
    for (const key of Object.keys(pools)) {
      pools[key] = [...pools[key]].sort(() => Math.random() - 0.5);
    }

    const result: ImpostorChallenge[] = [];
    for (const diff of difficultyTemplate) {
      if (pools[diff]?.length > 0) {
        result.push(pools[diff].shift()!);
      } else {
        const fallback = Object.values(pools).find((p) => p.length > 0);
        if (fallback) result.push(fallback.shift()!);
      }
    }

    return result;
  }

  getColor(gameId: string): string {
    return this.getGame(gameId)?.color ?? '#5865F2';
  }

  getEmoji(gameId: string): string {
    return this.getGame(gameId)?.emoji ?? '🎮';
  }
}

export default new ImpostorGamesConfigService();
