import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  User
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ShifumiService, ShifumiChoice } from '../services/shifumi.service';
import { ChallengeService } from '../services/challenge.service';
import { ArcadeStatsService } from '../services/arcade-stats.service';
import { UserService } from '../../user/services/guildUser.service';
import { ArcadeValidationService } from '../services/arcade-validation.service';

// Stockage temporaire des parties en cours
const pendingGames = new Map<string, {
  challenger: User;
  opponent: User;
  challengerChoice?: ShifumiChoice;
  opponentChoice?: ShifumiChoice;
  challengerScore: number;
  opponentScore: number;
  targetScore: number;
  bet: number;
  currentRound: number;
  timeout?: NodeJS.Timeout;
}>();

export default {
  data: new SlashCommandBuilder()
    .setName('shifumi')
    .setDescription('🎮 Défier quelqu\'un à Pierre-Feuille-Ciseaux')
    .addUserOption(option =>
      option
        .setName('adversaire')
        .setDescription('Le joueur à défier')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('mise')
        .setDescription('Montant de RidgeCoins à miser (0 par défaut)')
        .setRequired(false)
        .setMinValue(0)
    )
    .addIntegerOption(option =>
      option
        .setName('points')
        .setDescription('Nombre de points pour gagner (3 par défaut)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    try {
      const opponent = interaction.options.getUser('adversaire', true);
      const challenger = interaction.user;
      const bet = interaction.options.getInteger('mise') || 0;
      const targetScore = interaction.options.getInteger('points') || 3;

      // Validations mutualisées
      if (!await ArcadeValidationService.validatePvPGame(interaction, challenger, opponent, bet, 'shifumi')) {
        return;
      }

      // Demander confirmation à l'adversaire
      const accepted = await ChallengeService.requestChallenge(interaction, {
        challenger,
        opponent,
        gameName: 'Shifumi',
        gameEmoji: '✂️',
        bet,
        targetScore
      });

      if (!accepted) {
        return;
      }

      const gameId = `${challenger.id}-${opponent.id}-${Date.now()}`;

      // Créer les boutons de choix
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`shifumi_pierre_${gameId}`)
            .setLabel('Pierre')
            .setEmoji('🪨')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`shifumi_feuille_${gameId}`)
            .setLabel('Feuille')
            .setEmoji('📄')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`shifumi_ciseaux_${gameId}`)
            .setLabel('Ciseaux')
            .setEmoji('✂️')
            .setStyle(ButtonStyle.Danger)
        );

      const gameEmbed = new EmbedBuilder()
        .setTitle(`✂️ Manche 1`)
        .setDescription(
          `${challenger} **0** - **0** ${opponent}\n\n` +
          `Faites vos choix !`
        )
        .setColor(0x00aaff)
        .setFooter({
          text: `Premier à ${targetScore} points` +
                (bet > 0 ? ` • Mise: ${bet} RidgeCoins` : '') +
                ` • /shifumi`
        });

      const message = await interaction.editReply({
        content: '',
        embeds: [gameEmbed],
        components: [row]
      });

      // Stocker la partie
      pendingGames.set(gameId, {
        challenger,
        opponent,
        challengerScore: 0,
        opponentScore: 0,
        targetScore,
        bet,
        currentRound: 1,
        timeout: setTimeout(() => {
          this.cancelGame(gameId, interaction);
        }, 60000) // 60 secondes
      });

      // Créer le collecteur de boutons
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
      });

      collector.on('collect', async (buttonInteraction) => {
        const game = pendingGames.get(gameId);
        if (!game) return;

        const userId = buttonInteraction.user.id;
        const isChallenger = userId === challenger.id;
        const isOpponent = userId === opponent.id;

        if (!isChallenger && !isOpponent) {
          await buttonInteraction.reply({
            content: '❌ Vous ne participez pas à cette partie !',
            flags: ['Ephemeral']
          });
          return;
        }

        const choice = buttonInteraction.customId.split('_')[1] as ShifumiChoice;

        if (isChallenger) {
          game.challengerChoice = choice;
          await buttonInteraction.reply({
            content: `✅ Vous avez choisi ${ShifumiService.getEmoji(choice)} **${this.capitalize(choice)}** !`,
            flags: ['Ephemeral']
          });
        } else {
          game.opponentChoice = choice;
          await buttonInteraction.reply({
            content: `✅ Vous avez choisi ${ShifumiService.getEmoji(choice)} **${this.capitalize(choice)}** !`,
            flags: ['Ephemeral']
          });
        }

        // Vérifier si les deux ont joué
        if (game.challengerChoice && game.opponentChoice) {
          collector.stop('completed');
          await this.revealResults(game, interaction, gameId);
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          this.cancelGame(gameId, interaction);
        }
      });

    } catch (error) {
      console.error('Erreur dans la commande shifumi:', error);

      const errorMessage = {
        content: '❌ Une erreur est survenue lors du jeu.',
        flags: [4096] // MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },

  async revealResults(game: any, interaction: ChatInputCommandInteraction, gameId: string) {
    if (!game.challengerChoice || !game.opponentChoice) return;

    const result = this.determineWinner(game.challengerChoice, game.opponentChoice);

    // Mettre à jour le score
    if (result === 'player1') {
      game.challengerScore++;
    } else if (result === 'player2') {
      game.opponentScore++;
    }

    // Vérifier si quelqu'un a gagné
    if (game.challengerScore >= game.targetScore || game.opponentScore >= game.targetScore) {
      // Fin de partie - afficher directement l'embed de victoire
      await this.endGame(game, interaction, gameId);
    } else {
      // Afficher le résultat de la manche
      const winnerName = result === 'player1' ? game.challenger.username : game.opponent.username;
      const resultMsg = result === 'draw'
        ? '🤝 Égalité'
        : `✅ **${winnerName}** gagne la manche !`;

      const roundEmbed = new EmbedBuilder()
        .setTitle(`✂️ Manche ${game.currentRound}`)
        .setDescription(
          `${game.challenger} **${game.challengerScore}** - **${game.opponentScore}** ${game.opponent}\n\n` +
          `${ShifumiService.getEmoji(game.challengerChoice)} **VS** ${ShifumiService.getEmoji(game.opponentChoice)}\n\n` +
          `${resultMsg}`
        )
        .setColor(0x00aaff)
        .setFooter({
          text: `Premier à ${game.targetScore} points` +
                (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
                ` • /shifumi`
        });

      await interaction.editReply({
        embeds: [roundEmbed],
        components: []
      });

      // Préparer la prochaine manche après 3 secondes
      setTimeout(async () => {
        await this.startNextRound(game, interaction, gameId);
      }, 3000);
    }
  },

  async startNextRound(game: any, interaction: ChatInputCommandInteraction, gameId: string) {
    game.currentRound++;
    game.challengerChoice = undefined;
    game.opponentChoice = undefined;

    // Réinitialiser le timeout
    if (game.timeout) clearTimeout(game.timeout);
    game.timeout = setTimeout(() => {
      this.cancelGame(gameId, interaction);
    }, 60000);

    // Créer les nouveaux boutons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`shifumi_pierre_${gameId}_${game.currentRound}`)
          .setLabel('Pierre')
          .setEmoji('🪨')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`shifumi_feuille_${gameId}_${game.currentRound}`)
          .setLabel('Feuille')
          .setEmoji('📄')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`shifumi_ciseaux_${gameId}_${game.currentRound}`)
          .setLabel('Ciseaux')
          .setEmoji('✂️')
          .setStyle(ButtonStyle.Danger)
      );

    const nextRoundEmbed = new EmbedBuilder()
      .setTitle(`✂️ Manche ${game.currentRound}`)
      .setDescription(
        `${game.challenger} **${game.challengerScore}** - **${game.opponentScore}** ${game.opponent}\n\n` +
        `Faites vos choix !`
      )
      .setColor(0x00aaff)
      .setFooter({
        text: `Premier à ${game.targetScore} points` +
              (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
              ` • /shifumi`
      });

    const message = await interaction.editReply({
      embeds: [nextRoundEmbed],
      components: [row]
    });

    // Recréer le collecteur pour cette manche
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (buttonInteraction) => {
      const currentGame = pendingGames.get(gameId);
      if (!currentGame) return;

      const userId = buttonInteraction.user.id;
      const isChallenger = userId === game.challenger.id;
      const isOpponent = userId === game.opponent.id;

      if (!isChallenger && !isOpponent) {
        await buttonInteraction.reply({
          content: '❌ Vous ne participez pas à cette partie !',
          flags: ['Ephemeral']
        });
        return;
      }

      const choice = buttonInteraction.customId.split('_')[1] as ShifumiChoice;

      if (isChallenger) {
        currentGame.challengerChoice = choice;
        await buttonInteraction.reply({
          content: `✅ Vous avez choisi ${ShifumiService.getEmoji(choice)} **${this.capitalize(choice)}** !`,
          flags: ['Ephemeral']
        });
      } else {
        currentGame.opponentChoice = choice;
        await buttonInteraction.reply({
          content: `✅ Vous avez choisi ${ShifumiService.getEmoji(choice)} **${this.capitalize(choice)}** !`,
          flags: ['Ephemeral']
        });
      }

      if (currentGame.challengerChoice && currentGame.opponentChoice) {
        collector.stop('completed');
        await this.revealResults(currentGame, interaction, gameId);
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        this.cancelGame(gameId, interaction);
      }
    });
  },

  async endGame(game: any, interaction: ChatInputCommandInteraction, gameId: string) {
    const winner = game.challengerScore >= game.targetScore ? game.challenger : game.opponent;
    const loser = winner.id === game.challenger.id ? game.opponent : game.challenger;

    let victoryMsg = `🏆 **${winner.username}** remporte la partie !`;

    // Gérer les RidgeCoins et statistiques
    if (interaction.guildId) {
      try {
        // Enregistrer les stats utilisateurs
        await UserService.recordArcadeWin(winner.id, interaction.guildId, 'shifumi');
        await UserService.recordArcadeLoss(loser.id, interaction.guildId, 'shifumi');

        // Incrémenter le compteur global de parties
        await ArcadeStatsService.incrementGameCount(interaction.guildId, 'shifumi');

        // Transférer les RidgeCoins si mise > 0
        if (game.bet > 0) {
          await UserService.updateGuildUserMoney(loser.id, interaction.guildId, -game.bet);
          await UserService.updateGuildUserMoney(winner.id, interaction.guildId, game.bet);

          victoryMsg += `\n\n💰 **+${game.bet}** RidgeCoins pour ${winner.username}`;
        }
      } catch (error) {
        console.error('Erreur lors de la fin de partie:', error);
      }
    }

    const finalEmbed = new EmbedBuilder()
      .setTitle(`✂️ Partie terminée`)
      .setDescription(
        `${game.challenger} **${game.challengerScore}** - **${game.opponentScore}** ${game.opponent}\n\n` +
        victoryMsg
      )
      .setColor(0xffd700)
      .setFooter({
        text: `Premier à ${game.targetScore} points` +
              (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
              ` • /shifumi`
      });

    await interaction.editReply({
      embeds: [finalEmbed],
      components: []
    });

    if (game.timeout) clearTimeout(game.timeout);
    pendingGames.delete(gameId);
  },

  getRoundResultMessage(result: 'player1' | 'player2' | 'draw', player1: User, player2: User): string {
    if (result === 'draw') {
      return '🤝 **Égalité !** Aucun point marqué.';
    }

    const winner = result === 'player1' ? player1 : player2;
    return `🎉 **${winner.username}** remporte la manche ! (+1 point)`;
  },

  async cancelGame(gameId: string, interaction: ChatInputCommandInteraction) {
    const game = pendingGames.get(gameId);
    if (!game) return;

    const cancelEmbed = new EmbedBuilder()
      .setDescription('⏱️ Temps écoulé - Partie annulée')
      .setColor(0xff0000);

    await interaction.editReply({
      embeds: [cancelEmbed],
      components: []
    });

    if (game.timeout) clearTimeout(game.timeout);
    pendingGames.delete(gameId);
  },

  determineWinner(choice1: ShifumiChoice, choice2: ShifumiChoice): 'player1' | 'player2' | 'draw' {
    if (choice1 === choice2) return 'draw';

    const winConditions: Record<ShifumiChoice, ShifumiChoice> = {
      pierre: 'ciseaux',
      feuille: 'pierre',
      ciseaux: 'feuille'
    };

    return winConditions[choice1] === choice2 ? 'player1' : 'player2';
  },

  getWinnerMessage(result: 'player1' | 'player2' | 'draw', player1: User, player2: User): string {
    if (result === 'draw') {
      return '🤝 **Égalité !** Vous avez tous les deux choisi la même chose !';
    }

    const winner = result === 'player1' ? player1 : player2;
    return `🎉 **${winner} a gagné !** Félicitations !`;
  },

  getColorForWinner(result: 'player1' | 'player2' | 'draw', challengerId: string): number {
    if (result === 'draw') return 0xffaa00;
    return 0x00ff00;
  },


  /**
   * Met la première lettre en majuscule
   */
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};
