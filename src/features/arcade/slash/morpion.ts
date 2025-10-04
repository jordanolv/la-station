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
import { MorpionService, MorpionCell } from '../services/morpion.service';
import { ArcadeStatsService } from '../services/arcade-stats.service';
import { UserService } from '../../user/services/guildUser.service';
import { ArcadeValidationService } from '../services/arcade-validation.service';

interface MorpionGame {
  grid: MorpionCell[][];
  player1: User;
  player2: User;
  currentPlayer: User;
  bet: number;
  timeout?: NodeJS.Timeout;
}

const pendingGames = new Map<string, MorpionGame>();

export default {
  data: new SlashCommandBuilder()
    .setName('morpion')
    .setDescription('Jouer au Morpion (Tic-Tac-Toe)')
    .addUserOption(option =>
      option
        .setName('adversaire')
        .setDescription('L\'adversaire à défier')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('mise')
        .setDescription('Montant des RidgeCoins à miser')
        .setRequired(false)
        .setMinValue(0)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser('adversaire');
    const bet = interaction.options.getInteger('mise') ?? 0;

    // Mode PvP
    if (opponent) {
      // Validations mutualisées
      if (!await ArcadeValidationService.validatePvPGame(interaction, interaction.user, opponent, bet, 'morpion')) {
        return;
      }

      // Demander confirmation
      const accepted = await ChallengeService.requestChallenge(interaction, {
        challenger: interaction.user,
        opponent,
        gameName: 'Morpion',
        gameEmoji: '❌',
        bet
      });

      if (!accepted) return;

      // Démarrer la partie
      await this.startPvPGame(interaction, interaction.user, opponent, bet);
    } else {
      // Mode solo contre bot (non implémenté pour l'instant)
      return interaction.reply({
        content: '❌ Le mode solo n\'est pas encore disponible. Utilisez `/morpion adversaire:@user` pour jouer contre un joueur.',
        flags: ['Ephemeral']
      });
    }
  },

  async startPvPGame(interaction: ChatInputCommandInteraction, player1: User, player2: User, bet: number) {
    const gameId = `${player1.id}-${player2.id}-${Date.now()}`;
    const grid = MorpionService.createEmptyGrid();

    const game: MorpionGame = {
      grid,
      player1,
      player2,
      currentPlayer: player1,
      bet
    };

    pendingGames.set(gameId, game);

    // Créer les boutons (3x3)
    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('morpion_0_0')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('morpion_0_1')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('morpion_0_2')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary)
      );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('morpion_1_0')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('morpion_1_1')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('morpion_1_2')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary)
      );

    const row3 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('morpion_2_0')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('morpion_2_1')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('morpion_2_2')
          .setLabel('⬜')
          .setStyle(ButtonStyle.Secondary)
      );

    const gameEmbed = new EmbedBuilder()
      .setTitle(`❌ Morpion`)
      .setDescription(
        `${player1} (❌) vs ${player2} (⭕)\n\n` +
        `${MorpionService.gridToString(grid)}\n\n` +
        `C'est au tour de ${player1} !`
      )
      .setColor(0xff0000)
      .setFooter({
        text: `Premier à aligner 3 symboles` +
              (bet > 0 ? ` • Mise: ${bet} RidgeCoins` : '') +
              ` • /morpion`
      });

    const message = await interaction.editReply({
      embeds: [gameEmbed],
      components: [row1, row2, row3]
    });

    // Collecter les choix
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      const game = pendingGames.get(gameId);
      if (!game) return;

      // Vérifier que c'est le bon joueur
      if (buttonInteraction.user.id !== game.currentPlayer.id) {
        await buttonInteraction.reply({
          content: '❌ Ce n\'est pas votre tour !',
          flags: ['Ephemeral']
        });
        return;
      }

      const [_, rowStr, colStr] = buttonInteraction.customId.split('_');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);

      // Placer le symbole
      const symbol = game.currentPlayer.id === game.player1.id
        ? MorpionService.PLAYER1_SYMBOL
        : MorpionService.PLAYER2_SYMBOL;

      const placed = MorpionService.placeSymbol(game.grid, row, col, symbol);

      if (!placed) {
        await buttonInteraction.reply({
          content: '❌ Cette case est déjà occupée !',
          flags: ['Ephemeral']
        });
        return;
      }

      // Vérifier le résultat
      const result = MorpionService.checkWinner(game.grid);

      // Mettre à jour les boutons
      const updatedRow1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('morpion_0_0')
            .setLabel(game.grid[0][0])
            .setStyle(game.grid[0][0] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[0][0] !== '⬜' || result !== 'continue'),
          new ButtonBuilder()
            .setCustomId('morpion_0_1')
            .setLabel(game.grid[0][1])
            .setStyle(game.grid[0][1] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[0][1] !== '⬜' || result !== 'continue'),
          new ButtonBuilder()
            .setCustomId('morpion_0_2')
            .setLabel(game.grid[0][2])
            .setStyle(game.grid[0][2] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[0][2] !== '⬜' || result !== 'continue')
        );

      const updatedRow2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('morpion_1_0')
            .setLabel(game.grid[1][0])
            .setStyle(game.grid[1][0] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[1][0] !== '⬜' || result !== 'continue'),
          new ButtonBuilder()
            .setCustomId('morpion_1_1')
            .setLabel(game.grid[1][1])
            .setStyle(game.grid[1][1] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[1][1] !== '⬜' || result !== 'continue'),
          new ButtonBuilder()
            .setCustomId('morpion_1_2')
            .setLabel(game.grid[1][2])
            .setStyle(game.grid[1][2] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[1][2] !== '⬜' || result !== 'continue')
        );

      const updatedRow3 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('morpion_2_0')
            .setLabel(game.grid[2][0])
            .setStyle(game.grid[2][0] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[2][0] !== '⬜' || result !== 'continue'),
          new ButtonBuilder()
            .setCustomId('morpion_2_1')
            .setLabel(game.grid[2][1])
            .setStyle(game.grid[2][1] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[2][1] !== '⬜' || result !== 'continue'),
          new ButtonBuilder()
            .setCustomId('morpion_2_2')
            .setLabel(game.grid[2][2])
            .setStyle(game.grid[2][2] === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(game.grid[2][2] !== '⬜' || result !== 'continue')
        );

      if (result === 'continue') {
        // Changer de joueur
        game.currentPlayer = game.currentPlayer.id === game.player1.id ? game.player2 : game.player1;

        const continueEmbed = new EmbedBuilder()
          .setTitle(`❌ Morpion`)
          .setDescription(
            `${game.player1} (❌) vs ${game.player2} (⭕)\n\n` +
            `${MorpionService.gridToString(game.grid)}\n\n` +
            `C'est au tour de ${game.currentPlayer} !`
          )
          .setColor(game.currentPlayer.id === game.player1.id ? 0xff0000 : 0x00aaff)
          .setFooter({
            text: `Premier à aligner 3 symboles` +
                  (bet > 0 ? ` • Mise: ${bet} RidgeCoins` : '') +
                  ` • /morpion`
          });

        await buttonInteraction.update({
          embeds: [continueEmbed],
          components: [updatedRow1, updatedRow2, updatedRow3]
        });
      } else {
        // Fin de partie
        collector.stop('finished');
        await this.endGame(game, buttonInteraction, gameId, result);
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        this.cancelGame(gameId, interaction);
      }
    });
  },

  async endGame(
    game: MorpionGame,
    interaction: any,
    gameId: string,
    result: 'player1' | 'player2' | 'draw'
  ) {
    let victoryMsg: string;
    let winner: User | null = null;
    let loser: User | null = null;

    if (result === 'draw') {
      victoryMsg = '🤝 Match nul ! Personne n\'a gagné.';
    } else {
      winner = result === 'player1' ? game.player1 : game.player2;
      loser = result === 'player1' ? game.player2 : game.player1;
      victoryMsg = `🏆 **${winner.username}** remporte la partie !`;

      // Gérer les RidgeCoins et statistiques
      if (interaction.guildId) {
        try {
          // Enregistrer les stats utilisateurs
          await UserService.recordArcadeWin(winner.id, interaction.guildId, 'morpion');
          await UserService.recordArcadeLoss(loser.id, interaction.guildId, 'morpion');

          // Incrémenter le compteur global de parties
          await ArcadeStatsService.incrementGameCount(interaction.guildId, 'morpion');

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
    }

    const finalEmbed = new EmbedBuilder()
      .setTitle(`❌ Partie terminée`)
      .setDescription(
        `${game.player1} (❌) vs ${game.player2} (⭕)\n\n` +
        `${MorpionService.gridToString(game.grid)}\n\n` +
        victoryMsg
      )
      .setColor(result === 'draw' ? 0xffaa00 : 0xffd700)
      .setFooter({
        text: `Premier à aligner 3 symboles` +
              (game.bet > 0 ? ` • Mise: ${game.bet} RidgeCoins` : '') +
              ` • /morpion`
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
      .setDescription('La partie a été annulée car personne n\'a joué.')
      .setColor(0xff9900);

    await interaction.editReply({
      embeds: [cancelEmbed],
      components: []
    }).catch(() => {});

    if (game.timeout) clearTimeout(game.timeout);
    pendingGames.delete(gameId);
  }
};
