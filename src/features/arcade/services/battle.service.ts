export interface BattleChallenge {
  type: 'math' | 'sequence' | 'comparison' | 'emoji';
  question: string;
  choices: string[];
  correctAnswer: number;
}

export class BattleService {
  /**
   * Génère un défi aléatoire parmi les 4 types disponibles
   */
  static generateChallenge(): BattleChallenge {
    const types: BattleChallenge['type'][] = ['math', 'sequence', 'comparison', 'emoji'];
    const randomType = types[Math.floor(Math.random() * types.length)];

    switch (randomType) {
      case 'math':
        return this.generateMathChallenge();
      case 'sequence':
        return this.generateSequenceChallenge();
      case 'comparison':
        return this.generateComparisonChallenge();
      case 'emoji':
        return this.generateEmojiChallenge();
      default:
        return this.generateMathChallenge();
    }
  }

  /**
   * Génère un défi mathématique simple
   */
  private static generateMathChallenge(): BattleChallenge {
    const operations = ['+', '-', '*'] as const;
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let num1: number, num2: number, correctAnswer: number;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        correctAnswer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 20;
        num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
        correctAnswer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        correctAnswer = num1 * num2;
        break;
    }

    // Générer des réponses incorrectes proches
    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const wrong = correctAnswer + offset;
      if (wrong !== correctAnswer && wrong > 0) {
        wrongAnswers.add(wrong);
      }
    }

    const allAnswers = [correctAnswer, ...Array.from(wrongAnswers)];
    const shuffled = allAnswers.sort(() => Math.random() - 0.5);

    return {
      type: 'math',
      question: `Combien font **${num1} ${operation} ${num2}** ?`,
      choices: shuffled.map(n => n.toString()),
      correctAnswer: shuffled.indexOf(correctAnswer)
    };
  }

  /**
   * Génère un défi de suite logique
   */
  private static generateSequenceChallenge(): BattleChallenge {
    const sequenceTypes = ['increment', 'double', 'fibonacci'];
    const type = sequenceTypes[Math.floor(Math.random() * sequenceTypes.length)];

    let numbers: number[];
    let next: number;

    if (type === 'increment') {
      // Suite arithmétique (ex: 2, 4, 6, ? → 8)
      const increment = Math.floor(Math.random() * 5) + 1;
      const start = Math.floor(Math.random() * 10) + 1;
      numbers = [start, start + increment, start + increment * 2];
      next = start + increment * 3;
    } else if (type === 'double') {
      // Suite géométrique (ex: 2, 4, 8, ? → 16)
      const start = Math.floor(Math.random() * 3) + 1;
      numbers = [start, start * 2, start * 4];
      next = start * 8;
    } else {
      // Fibonacci (ex: 1, 1, 2, ? → 3)
      const a = Math.floor(Math.random() * 3) + 1;
      const b = Math.floor(Math.random() * 3) + 1;
      numbers = [a, b, a + b];
      next = b + (a + b);
    }

    // Générer des réponses incorrectes
    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const offset = Math.floor(Math.random() * 6) - 3;
      const wrong = next + offset;
      if (wrong !== next && wrong > 0) {
        wrongAnswers.add(wrong);
      }
    }

    const allAnswers = [next, ...Array.from(wrongAnswers)];
    const shuffled = allAnswers.sort(() => Math.random() - 0.5);

    return {
      type: 'sequence',
      question: `Quelle est la suite logique : **${numbers.join(', ')}, ?**`,
      choices: shuffled.map(n => n.toString()),
      correctAnswer: shuffled.indexOf(next)
    };
  }

  /**
   * Génère un défi de comparaison
   */
  private static generateComparisonChallenge(): BattleChallenge {
    const items = [
      { name: 'Tour Eiffel', value: 330, unit: 'm' },
      { name: 'Empire State Building', value: 443, unit: 'm' },
      { name: 'Burj Khalifa', value: 828, unit: 'm' },
      { name: 'Chat', value: 15, unit: 'ans' },
      { name: 'Chien', value: 13, unit: 'ans' },
      { name: 'Éléphant', value: 70, unit: 'ans' },
      { name: 'France', value: 67, unit: 'millions d\'habitants' },
      { name: 'Allemagne', value: 83, unit: 'millions d\'habitants' },
      { name: 'Espagne', value: 47, unit: 'millions d\'habitants' }
    ];

    // Choisir un groupe aléatoire
    const groupIndex = Math.floor(Math.random() * 3);
    const group = items.slice(groupIndex * 3, groupIndex * 3 + 3);

    // Trier par valeur
    const sorted = [...group].sort((a, b) => b.value - a.value);
    const correctAnswer = sorted[0];

    return {
      type: 'comparison',
      question: `Lequel est le plus grand/long/âgé ?`,
      choices: group.map(item => item.name),
      correctAnswer: group.indexOf(correctAnswer)
    };
  }

  /**
   * Génère un défi emoji (compter les emojis)
   */
  private static generateEmojiChallenge(): BattleChallenge {
    const emojis = ['🍎', '🍌', '🍇', '🍊', '🍓'];
    const targetEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const count = Math.floor(Math.random() * 8) + 3;

    // Générer une séquence avec des emojis aléatoires
    const sequence: string[] = [];
    for (let i = 0; i < count; i++) {
      sequence.push(targetEmoji);
    }

    // Ajouter des emojis différents
    const otherCount = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < otherCount; i++) {
      const otherEmoji = emojis.filter(e => e !== targetEmoji)[Math.floor(Math.random() * 4)];
      sequence.push(otherEmoji);
    }

    // Mélanger
    const shuffled = sequence.sort(() => Math.random() - 0.5);

    // Générer des réponses
    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const offset = Math.floor(Math.random() * 5) - 2;
      const wrong = count + offset;
      if (wrong !== count && wrong > 0 && wrong <= sequence.length) {
        wrongAnswers.add(wrong);
      }
    }

    const allAnswers = [count, ...Array.from(wrongAnswers)];
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

    return {
      type: 'emoji',
      question: `Combien y a-t-il de ${targetEmoji} ?\n\n${shuffled.join(' ')}`,
      choices: shuffledAnswers.map(n => n.toString()),
      correctAnswer: shuffledAnswers.indexOf(count)
    };
  }
}
