import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../../bot/client';
import UserModel from '../models/user.model';
import { UserMountainsRepository } from '../../mountain/repositories/user-mountains.repository';

const MAX_MONEY = 100;
const MAX_XP = 100;

const PACK_CHANCES = [
  { packs: 0, weight: 40 },
  { packs: 1, weight: 40 },
  { packs: 2, weight: 15 },
  { packs: 3, weight: 5  },
];

function randomUpTo(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

function rollPacks(): number {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const { packs, weight } of PACK_CHANCES) {
    cumulative += weight;
    if (roll < cumulative) return packs;
  }
  return 0;
}

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Réclamez votre récompense quotidienne'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    try {
      await interaction.deferReply();

      let user = await UserModel.findOne({
        discordId: interaction.user.id
      });

      if (!user) {
        await interaction.editReply({
          content: '❌ Utilisateur non trouvé dans la base de données.'
        });
        return;
      }

      // Vérifier si l'utilisateur a déjà claim aujourd'hui
      const now = new Date();
      const lastClaim = user.stats.lastDailyClaimDate;

      if (lastClaim) {
        const lastClaimDate = new Date(lastClaim);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastClaimDay = new Date(lastClaimDate.getFullYear(), lastClaimDate.getMonth(), lastClaimDate.getDate());

        // Si déjà claim aujourd'hui
        if (today.getTime() === lastClaimDay.getTime()) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowTimestamp = Math.floor(tomorrow.getTime() / 1000);

          await interaction.editReply({
            content: `⏰ Vous avez déjà réclamé votre récompense quotidienne aujourd'hui !\n` +
                     `Revenez <t:${tomorrowTimestamp}:R>.`
          });
          return;
        }
      }

      const moneyReward = randomUpTo(MAX_MONEY);
      const xpReward = randomUpTo(MAX_XP);
      const packsReward = rollPacks();

      user = await UserModel.findOneAndUpdate(
        { discordId: interaction.user.id },
        {
          $inc: {
            'profil.money': moneyReward,
            'profil.exp': xpReward
          },
          $set: {
            'stats.lastDailyClaimDate': now
          }
        },
        { new: true }
      );

      if (!user) {
        await interaction.editReply({
          content: '❌ Erreur lors de la mise à jour.'
        });
        return;
      }

      if (packsReward > 0) {
        await UserMountainsRepository.addTickets(interaction.user.id, packsReward);
      }

      const fields = [
        {
          name: '💰 Argent',
          value: `+${moneyReward} 💵\nTotal: **${user.profil.money}** 💵`,
          inline: true
        },
        {
          name: '⭐ Expérience',
          value: `+${xpReward} XP\nTotal: **${user.profil.exp}** XP`,
          inline: true
        },
      ];

      if (packsReward > 0) {
        fields.push({
          name: '🎟️ Packs',
          value: `+${packsReward} ticket${packsReward > 1 ? 's' : ''} de pack`,
          inline: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🎁 Récompense Quotidienne')
        .setDescription(`Vous avez réclamé votre récompense quotidienne !`)
        .addFields(...fields)
        .setFooter({
          text: `Revenez demain pour plus de récompenses !`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('Erreur dans la commande /daily:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true
        });
      }
    }
  }
};
