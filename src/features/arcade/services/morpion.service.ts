export type MorpionCell = '❌' | '⭕' | '⬜';
export type MorpionResult = 'player1' | 'player2' | 'draw' | 'continue';

export class MorpionService {
  static readonly PLAYER1_SYMBOL = '❌';
  static readonly PLAYER2_SYMBOL = '⭕';
  static readonly EMPTY_CELL = '⬜';

  /**
   * Crée une grille vide
   */
  static createEmptyGrid(): MorpionCell[][] {
    return [
      [this.EMPTY_CELL, this.EMPTY_CELL, this.EMPTY_CELL],
      [this.EMPTY_CELL, this.EMPTY_CELL, this.EMPTY_CELL],
      [this.EMPTY_CELL, this.EMPTY_CELL, this.EMPTY_CELL]
    ];
  }

  /**
   * Place un symbole sur la grille
   * @returns true si le placement est valide, false sinon
   */
  static placeSymbol(grid: MorpionCell[][], row: number, col: number, symbol: MorpionCell): boolean {
    if (grid[row][col] !== this.EMPTY_CELL) return false;

    grid[row][col] = symbol;
    return true;
  }

  /**
   * Vérifie s'il y a un gagnant ou match nul
   */
  static checkWinner(grid: MorpionCell[][]): MorpionResult {
    // Vérifier les lignes
    for (let row = 0; row < 3; row++) {
      if (grid[row][0] !== this.EMPTY_CELL &&
          grid[row][0] === grid[row][1] &&
          grid[row][1] === grid[row][2]) {
        return grid[row][0] === this.PLAYER1_SYMBOL ? 'player1' : 'player2';
      }
    }

    // Vérifier les colonnes
    for (let col = 0; col < 3; col++) {
      if (grid[0][col] !== this.EMPTY_CELL &&
          grid[0][col] === grid[1][col] &&
          grid[1][col] === grid[2][col]) {
        return grid[0][col] === this.PLAYER1_SYMBOL ? 'player1' : 'player2';
      }
    }

    // Vérifier diagonale principale
    if (grid[0][0] !== this.EMPTY_CELL &&
        grid[0][0] === grid[1][1] &&
        grid[1][1] === grid[2][2]) {
      return grid[0][0] === this.PLAYER1_SYMBOL ? 'player1' : 'player2';
    }

    // Vérifier diagonale inverse
    if (grid[0][2] !== this.EMPTY_CELL &&
        grid[0][2] === grid[1][1] &&
        grid[1][1] === grid[2][0]) {
      return grid[0][2] === this.PLAYER1_SYMBOL ? 'player1' : 'player2';
    }

    // Vérifier match nul (grille pleine)
    if (this.isGridFull(grid)) return 'draw';

    return 'continue';
  }

  /**
   * Vérifie si la grille est pleine
   */
  private static isGridFull(grid: MorpionCell[][]): boolean {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (grid[row][col] === this.EMPTY_CELL) return false;
      }
    }
    return true;
  }

  /**
   * Convertit la grille en string pour l'affichage
   */
  static gridToString(grid: MorpionCell[][]): string {
    let result = '';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        result += grid[row][col];
      }
      if (row < 2) result += '\n';
    }
    return result;
  }
}
