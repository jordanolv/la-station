export type ShifumiChoice = 'pierre' | 'feuille' | 'ciseaux';
export type ShifumiResult = 'win' | 'lose' | 'draw';

export interface ShifumiGameResult {
  playerChoice: ShifumiChoice;
  botChoice: ShifumiChoice;
  result: ShifumiResult;
  emoji: {
    player: string;
    bot: string;
  };
}

export class ShifumiService {
  private static readonly CHOICES: ShifumiChoice[] = ['pierre', 'feuille', 'ciseaux'];

  private static readonly EMOJIS: Record<ShifumiChoice, string> = {
    pierre: '🪨',
    feuille: '📄',
    ciseaux: '✂️'
  };

  private static readonly WIN_CONDITIONS: Record<ShifumiChoice, ShifumiChoice> = {
    pierre: 'ciseaux',    // Pierre bat Ciseaux
    feuille: 'pierre',    // Feuille bat Pierre
    ciseaux: 'feuille'    // Ciseaux bat Feuille
  };

  /**
   * Joue une partie de shifumi
   */
  static play(playerChoice: ShifumiChoice): ShifumiGameResult {
    const botChoice = this.getBotChoice();
    const result = this.determineWinner(playerChoice, botChoice);

    return {
      playerChoice,
      botChoice,
      result,
      emoji: {
        player: this.EMOJIS[playerChoice],
        bot: this.EMOJIS[botChoice]
      }
    };
  }

  /**
   * Choix aléatoire du bot
   */
  private static getBotChoice(): ShifumiChoice {
    const randomIndex = Math.floor(Math.random() * this.CHOICES.length);
    return this.CHOICES[randomIndex];
  }

  /**
   * Détermine le gagnant
   */
  private static determineWinner(playerChoice: ShifumiChoice, botChoice: ShifumiChoice): ShifumiResult {
    if (playerChoice === botChoice) {
      return 'draw';
    }

    if (this.WIN_CONDITIONS[playerChoice] === botChoice) {
      return 'win';
    }

    return 'lose';
  }

  /**
   * Obtient l'emoji pour un choix
   */
  static getEmoji(choice: ShifumiChoice): string {
    return this.EMOJIS[choice];
  }

  /**
   * Obtient tous les choix possibles
   */
  static getChoices(): ShifumiChoice[] {
    return [...this.CHOICES];
  }
}
