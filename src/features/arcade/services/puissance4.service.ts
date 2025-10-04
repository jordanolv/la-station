export type Puissance4Cell = '🔴' | '🟡' | '⚪';
export type Puissance4Result = 'player1' | 'player2' | 'draw' | 'continue';

export class Puissance4Service {
  static readonly ROWS = 6;
  static readonly COLS = 7;
  static readonly PLAYER1_DISC = '🔴';
  static readonly PLAYER2_DISC = '🟡';
  static readonly EMPTY_CELL = '⚪';

  /**
   * Crée une grille vide
   */
  static createEmptyGrid(): Puissance4Cell[][] {
    return Array(this.ROWS).fill(null).map(() =>
      Array(this.COLS).fill(this.EMPTY_CELL) as Puissance4Cell[]
    );
  }

  /**
   * Vérifie si une colonne est pleine
   */
  static isColumnFull(grid: Puissance4Cell[][], col: number): boolean {
    return grid[0][col] !== this.EMPTY_CELL;
  }

  /**
   * Place un jeton dans une colonne
   * @returns La ligne où le jeton a été placé, ou -1 si la colonne est pleine
   */
  static dropDisc(grid: Puissance4Cell[][], col: number, disc: Puissance4Cell): number {
    if (this.isColumnFull(grid, col)) return -1;

    for (let row = this.ROWS - 1; row >= 0; row--) {
      if (grid[row][col] === this.EMPTY_CELL) {
        grid[row][col] = disc;
        return row;
      }
    }

    return -1;
  }

  /**
   * Vérifie s'il y a un gagnant ou match nul
   */
  static checkWinner(grid: Puissance4Cell[][], lastRow: number, lastCol: number): Puissance4Result {
    const disc = grid[lastRow][lastCol];

    // Vérifier horizontal
    if (this.checkLine(grid, lastRow, lastCol, 0, 1, disc)) return disc === this.PLAYER1_DISC ? 'player1' : 'player2';

    // Vérifier vertical
    if (this.checkLine(grid, lastRow, lastCol, 1, 0, disc)) return disc === this.PLAYER1_DISC ? 'player1' : 'player2';

    // Vérifier diagonale descendante
    if (this.checkLine(grid, lastRow, lastCol, 1, 1, disc)) return disc === this.PLAYER1_DISC ? 'player1' : 'player2';

    // Vérifier diagonale montante
    if (this.checkLine(grid, lastRow, lastCol, 1, -1, disc)) return disc === this.PLAYER1_DISC ? 'player1' : 'player2';

    // Vérifier match nul (grille pleine)
    if (this.isGridFull(grid)) return 'draw';

    return 'continue';
  }

  /**
   * Vérifie une ligne dans une direction donnée
   */
  private static checkLine(
    grid: Puissance4Cell[][],
    row: number,
    col: number,
    dRow: number,
    dCol: number,
    disc: Puissance4Cell
  ): boolean {
    let count = 1;

    // Compter dans la direction positive
    count += this.countDirection(grid, row, col, dRow, dCol, disc);

    // Compter dans la direction négative
    count += this.countDirection(grid, row, col, -dRow, -dCol, disc);

    return count >= 4;
  }

  /**
   * Compte le nombre de jetons consécutifs dans une direction
   */
  private static countDirection(
    grid: Puissance4Cell[][],
    row: number,
    col: number,
    dRow: number,
    dCol: number,
    disc: Puissance4Cell
  ): number {
    let count = 0;
    let r = row + dRow;
    let c = col + dCol;

    while (
      r >= 0 && r < this.ROWS &&
      c >= 0 && c < this.COLS &&
      grid[r][c] === disc
    ) {
      count++;
      r += dRow;
      c += dCol;
    }

    return count;
  }

  /**
   * Vérifie si la grille est pleine
   */
  private static isGridFull(grid: Puissance4Cell[][]): boolean {
    return grid[0].every(cell => cell !== this.EMPTY_CELL);
  }

  /**
   * Convertit la grille en string pour l'affichage
   */
  static gridToString(grid: Puissance4Cell[][]): string {
    let result = '';

    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        result += grid[row][col];
      }
      result += '\n';
    }

    // Ajouter les numéros de colonnes
    result += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';

    return result;
  }
}
