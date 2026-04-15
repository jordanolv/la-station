import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { RaidService } from '../services/raid.service';
import { RaidRepository } from '../repositories/raid.repository';
import { MountainService } from '../services/mountain.service';
import { RARITY_CONFIG } from '../constants/peak-hunters.constants';

export default {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Gestion des raids (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('force')
        .setDescription('Lance un raid immédiatement')
        .addStringOption(opt =>
          opt
            .setName('montagne')
            .setDescription("ID de la montagne cible (optionnel — aléatoire sinon)")
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Affiche le raid actif'),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const sub = interaction.options.getSubcommand();

    if (sub === 'force') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const active = await RaidRepository.getActive();
      if (active) {
        const mountain = MountainService.getById(active.mountainId);
        await interaction.editReply(`❌ Un raid est déjà en cours : **${mountain?.mountainLabel ?? active.mountainId}**.`);
        return;
      }

      const forcedId = interaction.options.getString('montagne') ?? undefined;
      const raid = await RaidService.startRaid(client, forcedId);

      if (!raid) {
        await interaction.editReply('❌ Impossible de lancer le raid (aucune montagne disponible ?).');
        return;
      }

      const mountain = MountainService.getById(raid.mountainId);
      const { emoji, label } = RARITY_CONFIG[raid.rarity];
      await interaction.editReply(
        `✅ Raid lancé : **${mountain?.mountainLabel ?? raid.mountainId}** ${emoji} ${label} — ${raid.maxHp.toLocaleString('fr-FR')} HP — se termine <t:${Math.floor(raid.endsAt.getTime() / 1000)}:R>.`,
      );
    }

    if (sub === 'status') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const raid = await RaidRepository.getActive();
      if (!raid) {
        await interaction.editReply('Aucun raid en cours.');
        return;
      }

      const mountain = MountainService.getById(raid.mountainId);
      const { emoji, label } = RARITY_CONFIG[raid.rarity];
      const hpDestroyed = raid.maxHp - Math.max(0, raid.currentHp);
      const pct = Math.round((hpDestroyed / raid.maxHp) * 100);
      const bar = RaidService.buildHpBar(raid.currentHp, raid.maxHp);

      await interaction.editReply(
        [
          `**${mountain?.mountainLabel ?? raid.mountainId}** ${emoji} ${label}`,
          `\`${bar}\` ${pct}%  (${hpDestroyed.toLocaleString('fr-FR')} / ${raid.maxHp.toLocaleString('fr-FR')} pts)`,
          `👥 ${raid.participants.length} participants`,
          `⏳ Fin <t:${Math.floor(raid.endsAt.getTime() / 1000)}:R>`,
        ].join('\n'),
      );
    }
  },
};
