import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { MountainConfigRepository } from '../repositories/mountain-config.repository';
import { MountainService } from './mountain.service';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { RARITY_CONFIG } from '../constants/mountain.constants';
import { LogService } from '../../../shared/logs/logs.service';

const LOG_FEATURE = '⛰️ Mountain Spawn';
export const SPAWN_BUTTON_PREFIX = 'mountain:spawn:claim';

export class MountainSpawnService {
  private static claimedSpawns = new Set<string>(); // messageId already claimed

  static async rehydrate(client: BotClient): Promise<void> {
    const config = await MountainConfigRepository.get();
    const pending = (config?.spawnSchedule ?? []).filter(d => new Date(d) > new Date());
    if (pending.length === 0) return;

    const now = Date.now();
    for (const date of pending) {
      const delay = new Date(date).getTime() - now;
      if (delay > 0) {
        setTimeout(() => MountainSpawnService.doSpawn(client), delay);
      }
    }

    LogService.info(client,
      `**${pending.length}** spawn(s) en attente réhydraté(s)`,
      { feature: LOG_FEATURE, title: '🔄 Réhydratation' },
    ).catch(() => {});
  }

  static async doSpawn(client: BotClient): Promise<void> {
    const config = await MountainConfigRepository.get();
    if (!config?.spawnChannelId) return;

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(config.spawnChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const mountain = MountainService.getRandomByPackWeight();
    if (!mountain) return;

    const rarity = MountainService.getRarity(mountain);
    const { emoji, label, color } = RARITY_CONFIG[rarity];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} Une montagne est apparue !`)
      .setDescription('Sois le premier à la revendiquer pour la débloquer !')
      .addFields(
        { name: '⛰️ Montagne', value: mountain.name, inline: true },
        { name: '📏 Altitude', value: mountain.altitude, inline: true },
        { name: '✨ Rareté', value: `${emoji} ${label}`, inline: true },
      )
      .setImage(mountain.image)
      .setTimestamp()
      .setFooter({ text: '⚡ Premier arrivé, premier servi !' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${SPAWN_BUTTON_PREFIX}:${mountain.id}`)
        .setLabel('🏔️ Revendiquer')
        .setStyle(ButtonStyle.Success),
    );

    await (channel as TextChannel).send({ embeds: [embed], components: [row] });

    await LogService.info(client,
      `Spawn montagne : **${mountain.name}** ${emoji} ${label} (${mountain.altitude})`,
      { feature: LOG_FEATURE, title: '🌄 Nouveau spawn' },
    );
  }

  static async handleClaim(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const messageId = interaction.message.id;

    if (this.claimedSpawns.has(messageId)) {
      await interaction.reply({ content: '❌ Cette montagne a déjà été revendiquée !', flags: MessageFlags.Ephemeral });
      return;
    }
    this.claimedSpawns.add(messageId);

    const mountainId = interaction.customId.split(':')[3];
    const mountain = MountainService.getById(mountainId);
    if (!mountain) {
      await interaction.reply({ content: '❌ Montagne introuvable.', flags: MessageFlags.Ephemeral });
      return;
    }

    const userId = interaction.user.id;
    const rarity = MountainService.getRarity(mountain);
    const { emoji, label, color } = RARITY_CONFIG[rarity];
    const { fragmentsOnDuplicate } = RARITY_CONFIG[rarity];

    const result = await UserMountainsRepository.unlock(userId, mountainId, rarity);
    const isDuplicate = result === null;

    let description: string;
    if (isDuplicate) {
      const fragResult = await UserMountainsRepository.addFragments(userId, fragmentsOnDuplicate);
      description = `<@${userId}> a revendiqué **${mountain.name}**, mais la possède déjà !\n→ **+${fragmentsOnDuplicate} fragment${fragmentsOnDuplicate > 1 ? 's' : ''}** 🧩 (\`${fragResult.newFragments}/20\`)`;
    } else {
      description = `<@${userId}> a revendiqué et débloqué **${mountain.name}** ! 🎉\n📊 \`${result!.totalUnlocked}/${MountainService.count}\` montagnes`;
    }

    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${SPAWN_BUTTON_PREFIX}:${mountainId}`)
        .setLabel(`🏔️ Revendiquée par ${interaction.user.username}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    const updatedEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} Montagne revendiquée !`)
      .setDescription(description)
      .addFields(
        { name: '⛰️ Montagne', value: mountain.name, inline: true },
        { name: '📏 Altitude', value: mountain.altitude, inline: true },
        { name: '✨ Rareté', value: `${emoji} ${label}`, inline: true },
      )
      .setImage(mountain.image)
      .setTimestamp();

    await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });

    await LogService.success(client,
      `<@${userId}> a revendiqué **${mountain.name}** ${emoji} ${label}${isDuplicate ? ' (doublon)' : ''}`,
      { feature: LOG_FEATURE, title: '🏔️ Spawn revendiqué' },
    );
  }
}
