import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
  ChatInputCommandInteraction,
  ComponentType
} from 'discord.js';

export interface ChallengeOptions {
  challenger: User;
  opponent: User;
  gameName: string;
  gameEmoji: string;
  bet?: number;
  targetScore?: number;
  customDescription?: string;
}

export class ChallengeService {
  /**
   * Demande confirmation à l'adversaire pour accepter le défi
   * @returns true si accepté, false si refusé ou timeout
   */
  static async requestChallenge(
    interaction: ChatInputCommandInteraction,
    options: ChallengeOptions
  ): Promise<boolean> {
    const { challenger, opponent, gameName, gameEmoji, bet = 0, targetScore, customDescription } = options;

    // Créer l'embed de défi
    let description = `${challenger} vous défie à une partie de **${gameName}** !\n\n`;

    if (customDescription) {
      description += `${customDescription}\n\n`;
    } else if (targetScore) {
      description += `🎯 Premier à **${targetScore}** points\n`;
    }

    if (bet > 0) {
      description += `💰 Mise : **${bet}** RidgeCoins\n\n`;
    }

    description += `${opponent}, acceptez-vous ce défi ?`;

    const challengeEmbed = new EmbedBuilder()
      .setTitle(`${gameEmoji} Défi ${gameName}`)
      .setDescription(description)
      .setColor(0x00aaff)
      .setFooter({ text: 'Vous avez 30 secondes pour répondre' })
      .setTimestamp();

    // Créer les boutons de confirmation
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('challenge_accept')
          .setLabel('Accepter')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('challenge_decline')
          .setLabel('Refuser')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
      );

    const message = await interaction.reply({
      content: `${opponent}`,
      embeds: [challengeEmbed],
      components: [row]
    }).then(msg => interaction.fetchReply());

    // Créer le collecteur pour les boutons
    return new Promise((resolve) => {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000 // 30 secondes
      });

      collector.on('collect', async (buttonInteraction) => {
        // Seul l'adversaire peut répondre
        if (buttonInteraction.user.id !== opponent.id) {
          await buttonInteraction.reply({
            content: '❌ Seul le joueur défié peut répondre à ce défi !',
            flags: ['Ephemeral']
          });
          return;
        }

        if (buttonInteraction.customId === 'challenge_accept') {
          const acceptEmbed = new EmbedBuilder()
            .setTitle(`${gameEmoji} Défi accepté !`)
            .setDescription(`${opponent.username} a accepté le défi ! La partie commence...`)
            .setColor(0x00ff00);

          await buttonInteraction.update({
            embeds: [acceptEmbed],
            components: []
          });

          collector.stop('accepted');
          resolve(true);
        } else {
          const declineEmbed = new EmbedBuilder()
            .setTitle(`${gameEmoji} Défi refusé`)
            .setDescription(`${opponent.username} a refusé le défi.`)
            .setColor(0xff0000);

          await buttonInteraction.update({
            embeds: [declineEmbed],
            components: []
          });

          collector.stop('declined');
          resolve(false);
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle(`${gameEmoji} Temps écoulé`)
            .setDescription(`${opponent.username} n'a pas répondu à temps. Le défi est annulé.`)
            .setColor(0xff9900);

          interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          }).catch(() => {});

          resolve(false);
        }
      });
    });
  }
}
