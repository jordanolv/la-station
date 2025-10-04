import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  User
} from 'discord.js';
import { ChallengeService } from '../services/challenge.service';
import { BattleService } from '../services/battle.service';
import { ArcadeStatsService } from '../services/arcade-stats.service';
import { UserService } from '../../user/services/guildUser.service';
import { ArcadeValidationService } from '../services/arcade-validation.service';

interface BattleGame {
  player1: User;
  player2: User;
  ropePosition: number; // -3 à +3 (négatif = player2 gagne, positif = player1 gagne)
  bet: number;
  currentRound: number;
  timeout?: NodeJS.Timeout;
}

const pendingGames = new Map<string, BattleGame>();

export default {
  data: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Battle de mini-défis contre un adversaire')
    .addUserOption(option =>
      option
        .setName('adversaire')
        .setDescription('L\'adversaire à défier')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('mise')
        .setDescription('Montant des RidgeCoins à miser')
        .setRequired(false)
        .setMinValue(0)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser('adversaire', true);
    const challenger = interaction.user;
    const bet = interaction.options.getInteger('mise') || 0;

    // Validations mutualisées
    if (!await ArcadeValidationService.validatePvPGame(interaction, challenger, opponent, bet, 'battle')) {
      return;
    }

    // Demander confirmation
    const accepted = await ChallengeService.requestChallenge(interaction, {
      challenger,
      opponent,
      gameName: 'Battle',
      gameEmoji: '⚔️',
      bet
    });

    if (!accepted) return;

    // Démarrer la partie
    const gameId = `${challenger.id}-${opponent.id}-${Date.now()}`;
    const game: BattleGame = {
      player1: challenger,
      player2: opponent,
      ropePosition: 0, // Commence au milieu
      bet,
      currentRound: 1
    };

    pendingGames.set(gameId, game);

    // Lancer le premier défi
    await this.startChallenge(game, interaction, gameId);
  },

  getRopeVisual(position: number, player1: User, player2: User): string {
    // Position va de -3 à +3
    // -3 = player2 gagne, +3 = player1 gagne
    const segments = ['⬜', '⬜', '⬜', '🎯', '⬜', '⬜', '⬜'];
    const centerIndex = 3;
    const ropeIndex = centerIndex + position;

    segments[ropeIndex] = '🔴';

    return `${player2.username} ⬅️ ${segments.join('')} ➡️ ${player1.username}`;
  },

  async startChallenge(game: BattleGame, interaction: ChatInputCommandInteraction, gameId: string) {
    const challenge = BattleService.generateChallenge();

    // Créer les boutons de réponse
    const buttons = challenge.choices.map((choice, index) =>
      new ButtonBuilder()
        .setCustomId(`battle_${index}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Primary)
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    // Répartir les boutons (max 5 par ligne)
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(buttons.slice(i, i + 5));
      rows.push(row);
    }

    const ropeVisual = this.getRopeVisual(game.ropePosition, game.player1, game.player2);

    const challengeEmbed = new EmbedBuilder()
      .setTitle(`⚔️ Battle - Défi ${game.currentRound}`)
      .setDescription(
        `${ropeVisual}\n\n` +
        `**${challenge.question}**\n\n` +
        `Premier à répondre correctement tire la corde !`
      )
      .setColor(0xff6b00)
      .setFooter({
        text: `Premier à tirer la corde jusqu'au bout gagne` +
              (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
              ` • /battle`
      });

    const message = await interaction.editReply({
      embeds: [challengeEmbed],
      components: rows
    });

    // Collecter les réponses
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000 // 30 secondes par défi
    });

    let answered = false;

    collector.on('collect', async (buttonInteraction) => {
      if (answered) return;

      const userId = buttonInteraction.user.id;
      const isPlayer1 = userId === game.player1.id;
      const isPlayer2 = userId === game.player2.id;

      // Vérifier que c'est un joueur de la partie
      if (!isPlayer1 && !isPlayer2) {
        await buttonInteraction.reply({
          content: '❌ Vous ne participez pas à cette battle !',
          flags: ['Ephemeral']
        });
        return;
      }

      const answerIndex = parseInt(buttonInteraction.customId.split('_')[1]);
      const isCorrect = answerIndex === challenge.correctAnswer;

      if (isCorrect) {
        answered = true;
        collector.stop('answered');

        // Tirer la corde
        if (isPlayer1) {
          game.ropePosition++; // Tire vers player1 (droite)
        } else {
          game.ropePosition--; // Tire vers player2 (gauche)
        }

        const winner = isPlayer1 ? game.player1 : game.player2;

        // Vérifier si quelqu'un a gagné (atteint +3 ou -3)
        if (game.ropePosition >= 3 || game.ropePosition <= -3) {
          await this.endGame(game, buttonInteraction, gameId);
        } else {
          // Prochain défi
          game.currentRound++;

          const ropeVisual = this.getRopeVisual(game.ropePosition, game.player1, game.player2);

          const nextEmbed = new EmbedBuilder()
            .setTitle(`⚔️ Battle - Round ${game.currentRound - 1}`)
            .setDescription(
              `${ropeVisual}\n\n` +
              `✅ **${winner.username}** a trouvé la bonne réponse et tire la corde !\n\n` +
              `Prochain défi dans 3 secondes...`
            )
            .setColor(0x00ff00)
            .setFooter({
              text: `Premier à tirer la corde jusqu'au bout gagne` +
                    (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
                    ` • /battle`
            });

          await buttonInteraction.update({
            embeds: [nextEmbed],
            components: []
          });

          setTimeout(() => {
            this.startChallenge(game, interaction, gameId);
          }, 3000);
        }
      } else {
        // Mauvaise réponse
        await buttonInteraction.reply({
          content: '❌ Mauvaise réponse !',
          flags: ['Ephemeral']
        });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        this.cancelGame(gameId, interaction);
      }
    });
  },

  async endGame(game: BattleGame, interaction: any, gameId: string) {
    const winner = game.ropePosition >= 3 ? game.player1 : game.player2;
    const loser = winner.id === game.player1.id ? game.player2 : game.player1;

    const ropeVisual = this.getRopeVisual(game.ropePosition, game.player1, game.player2);
    let victoryMsg = `🏆 **${winner.username}** a tiré la corde jusqu'au bout et remporte la battle !`;

    // Gérer les RidgeCoins et statistiques
    if (interaction.guildId) {
      try {
        // Enregistrer les stats utilisateurs
        await UserService.recordArcadeWin(winner.id, interaction.guildId, 'battle');
        await UserService.recordArcadeLoss(loser.id, interaction.guildId, 'battle');

        // Incrémenter le compteur global de parties
        await ArcadeStatsService.incrementGameCount(interaction.guildId, 'battle');

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
      .setTitle(`⚔️ Battle terminée`)
      .setDescription(
        `${ropeVisual}\n\n` +
        victoryMsg
      )
      .setColor(0xffd700)
      .setFooter({
        text: `Partie terminée en ${game.currentRound} rounds` +
              (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
              ` • /battle`
      });

    await interaction.update({
      embeds: [finalEmbed],
      components: []
    });

    if (game.timeout) clearTimeout(game.timeout);
    pendingGames.delete(gameId);
  },

  async cancelGame(gameId: string, interaction: ChatInputCommandInteraction) {
    const game = pendingGames.get(gameId);
    if (!game) return;

    const cancelEmbed = new EmbedBuilder()
      .setTitle('⏱️ Temps écoulé')
      .setDescription('La battle a été annulée car personne n\'a répondu.')
      .setColor(0xff9900);

    await interaction.editReply({
      embeds: [cancelEmbed],
      components: []
    }).catch(() => {});

    if (game.timeout) clearTimeout(game.timeout);
    pendingGames.delete(gameId);
  }
};
