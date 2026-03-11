import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import { UserMountainsRepository } from '../../repositories/user-mountains.repository';
import { MountainService } from '../../services/mountain.service';
import { RARITY_CONFIG, FRAGMENTS_PER_TICKET } from '../../constants/mountain.constants';

export const PACK_BUTTON_OPEN = 'mountain:pack:open';
export const PACK_BUTTON_CONVERT = 'mountain:pack:convert';

function buildFragmentBar(fragments: number): string {
  const filled = Math.round((fragments / FRAGMENTS_PER_TICKET) * 10);
  return '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);
}

function buildPackInfoContainer(tickets: number, fragments: number): ContainerBuilder {
  const fragBar = buildFragmentBar(fragments);

  return new ContainerBuilder()
    .setAccentColor(0xe67e22)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 🎟️ Packs de montagnes'),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### Tickets disponibles\n🎟️ **${tickets}** ticket${tickets > 1 ? 's' : ''}`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(PACK_BUTTON_OPEN)
            .setLabel('Ouvrir un pack')
            .setStyle(ButtonStyle.Success)
            .setDisabled(tickets === 0),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Fragments 🧩\n${fragBar}\n\`${fragments}/${FRAGMENTS_PER_TICKET}\` — Atteins 20 pour convertir en ticket automatiquement`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '### Probabilités par rareté',
          `${RARITY_CONFIG.common.emoji} **Commune** — ${RARITY_CONFIG.common.packWeight}%`,
          `${RARITY_CONFIG.rare.emoji} **Rare** — ${RARITY_CONFIG.rare.packWeight}%`,
          `${RARITY_CONFIG.epic.emoji} **Épique** — ${RARITY_CONFIG.epic.packWeight}%`,
          `${RARITY_CONFIG.legendary.emoji} **Légendaire** — ${RARITY_CONFIG.legendary.packWeight}%`,
        ].join('\n'),
      ),
    );
}

function buildRevealEmbed(
  mountainName: string,
  altitude: string,
  mountainImage: string,
  rarity: ReturnType<typeof MountainService.getRarity>,
  isDuplicate: boolean,
  fragmentsGained: number,
  totalFragments: number,
  ticketsLeft: number,
  ticketsFromFragments: number,
): { embed: EmbedBuilder } {
  const { emoji, label, color } = RARITY_CONFIG[rarity];

  let resultText: string;
  if (isDuplicate) {
    resultText = `**Double !** Tu possèdes déjà cette montagne.\n→ **+${fragmentsGained} fragment${fragmentsGained > 1 ? 's' : ''}** 🧩 (\`${totalFragments}/${FRAGMENTS_PER_TICKET}\`)`;
    if (ticketsFromFragments > 0) {
      resultText += `\n🎟️ **+${ticketsFromFragments} ticket${ticketsFromFragments > 1 ? 's' : ''}** bonus !`;
    }
  } else {
    resultText = `**Nouvelle montagne débloquée !** ✅`;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} Pack ouvert !`)
    .addFields(
      { name: '⛰️ Montagne', value: mountainName, inline: true },
      { name: '📏 Altitude', value: altitude, inline: true },
      { name: '✨ Rareté', value: `${emoji} **${label}**`, inline: true },
    )
    .setDescription(resultText)
    .setImage(mountainImage)
    .setFooter({ text: `🎟️ Il te reste ${ticketsLeft} ticket${ticketsLeft > 1 ? 's' : ''}` });

  return { embed };
}

async function openPack(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;

  const spent = await UserMountainsRepository.spendTicket(userId);
  if (!spent) {
    await interaction.reply({
      content: "❌ Tu n'as plus de tickets ! Passe du temps en vocal pour en gagner.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const mountain = MountainService.getRandomByPackWeight();
  if (!mountain) {
    await interaction.reply({ content: '❌ Erreur lors du tirage.', flags: MessageFlags.Ephemeral });
    return;
  }

  const rarity = MountainService.getRarity(mountain);
  const { fragmentsOnDuplicate } = RARITY_CONFIG[rarity];

  const result = await UserMountainsRepository.unlock(userId, mountain.id, rarity);
  const isDuplicate = result === null;

  let fragmentsGained = 0;
  let totalFragments = 0;
  let ticketsFromFragments = 0;

  if (isDuplicate) {
    const fragResult = await UserMountainsRepository.addFragments(userId, fragmentsOnDuplicate);
    fragmentsGained = fragmentsOnDuplicate;
    totalFragments = fragResult.newFragments;
    ticketsFromFragments = fragResult.ticketsGained;
  }

  const doc = await UserMountainsRepository.getOrCreate(userId);

  const { embed } = buildRevealEmbed(
    mountain.name,
    mountain.altitude,
    mountain.image,
    rarity,
    isDuplicate,
    fragmentsGained,
    totalFragments,
    doc.packTickets,
    ticketsFromFragments,
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(PACK_BUTTON_OPEN)
      .setLabel('Ouvrir un autre pack')
      .setStyle(ButtonStyle.Success)
      .setDisabled(doc.packTickets === 0),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

export async function handlePackButton(interaction: ButtonInteraction, _client: BotClient): Promise<void> {
  const originalUserId = interaction.message.interactionMetadata?.user.id ?? interaction.message.author?.id;
  if (interaction.user.id !== originalUserId) {
    await interaction.reply({ content: "❌ Ce n'est pas ton pack !", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.customId === PACK_BUTTON_OPEN) {
    await openPack(interaction);
  }
}

export async function executePack(interaction: ChatInputCommandInteraction, _client: BotClient): Promise<void> {
  const userId = interaction.user.id;
  const doc = await UserMountainsRepository.getOrCreate(userId);

  const container = buildPackInfoContainer(doc.packTickets, doc.fragments);

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
