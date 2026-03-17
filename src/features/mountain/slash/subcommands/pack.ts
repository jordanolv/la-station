import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import { UserMountainsRepository } from '../../repositories/user-mountains.repository';
import { MountainService, MountainInfo } from '../../services/mountain.service';
import { RARITY_CONFIG, FRAGMENTS_PER_TICKET } from '../../constants/mountain.constants';
import type { MountainRarity } from '../../types/mountain.types';

export const PACK_BUTTON_OPEN = 'mountain:pack:open';
export const PACK_BUTTON_OPEN_5 = 'mountain:pack:open5';
export const PACK_BUTTON_CONVERT = 'mountain:pack:convert';

const MULTI_PACK_COUNT = 5;

function buildFragmentBar(fragments: number): string {
  const filled = Math.round((fragments / FRAGMENTS_PER_TICKET) * 10);
  return '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);
}

export function buildPackInfoContainer(tickets: number, fragments: number): ContainerBuilder {
  const fragBar = buildFragmentBar(fragments);

  return new ContainerBuilder()
    .setAccentColor(0xe67e22)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 🎟️ Packs de montagnes'),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Tickets disponibles\n🎟️ **${tickets}** ticket${tickets > 1 ? 's' : ''}`,
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PACK_BUTTON_OPEN)
          .setLabel('Ouvrir 1 pack')
          .setStyle(ButtonStyle.Success)
          .setDisabled(tickets === 0),
        new ButtonBuilder()
          .setCustomId(PACK_BUTTON_OPEN_5)
          .setLabel(`Ouvrir ${Math.min(tickets, MULTI_PACK_COUNT)} packs`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(tickets <= 1),
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
  mountain: MountainInfo,
  rarity: ReturnType<typeof MountainService.getRarity>,
  isDuplicate: boolean,
  fragmentsGained: number,
  totalFragments: number,
  ticketsLeft: number,
  ticketsFromFragments: number,
): EmbedBuilder {
  const { emoji, label, color } = RARITY_CONFIG[rarity];

  let resultText: string;
  if (isDuplicate) {
    resultText = `**Double !** Tu possèdes déjà cette montagne.\n→ **+${fragmentsGained} fragment${fragmentsGained > 1 ? 's' : ''}** 🧩 (\`${totalFragments}/${FRAGMENTS_PER_TICKET}\`)`;
    if (ticketsFromFragments > 0) {
      resultText += `\n🎟️ **+${ticketsFromFragments} ticket${ticketsFromFragments > 1 ? 's' : ''}** bonus !`;
    }
  } else {
    resultText = '**Nouvelle montagne débloquée !** ✅';
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${mountain.mountainLabel}`)
    .addFields(
      { name: '🌍 Pays', value: MountainService.getCountryDisplay(mountain), inline: true },
      { name: '📏 Altitude', value: MountainService.getAltitude(mountain), inline: true },
      { name: '✨ Rareté', value: `${emoji} **${label}**`, inline: true },
    )
    .setDescription(resultText)
    .setImage(mountain.image)
    .setFooter({ text: `🎟️ Il te reste ${ticketsLeft} ticket${ticketsLeft > 1 ? 's' : ''}` });
}

interface PackDrawResult {
  mountain: MountainInfo;
  rarity: MountainRarity;
  isDuplicate: boolean;
  fragmentsGained: number;
}

function buildMultiRevealContainer(
  results: PackDrawResult[],
  totalFragmentsGained: number,
  totalTicketsFromFragments: number,
  finalFragments: number,
  ticketsLeft: number,
): ContainerBuilder {
  const container = new ContainerBuilder()
    .setAccentColor(0xe67e22)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🎁 Ouverture x${results.length}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  for (const r of results) {
    const { emoji, label } = RARITY_CONFIG[r.rarity];
    const statusLine = r.isDuplicate
      ? `-# 🔁 Double — +${r.fragmentsGained} 🧩`
      : `-# ✅ Nouvelle !`;

    const flags = r.mountain.flags?.join(' ') ?? '';

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emoji} **${r.mountain.mountainLabel}** ${flags}\n-# ${label} · ${MountainService.getAltitude(r.mountain)}\n${statusLine}`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(r.mountain.image),
        ),
    );
  }

  const footerLines: string[] = [];
  if (totalFragmentsGained > 0) {
    footerLines.push(`🧩 **+${totalFragmentsGained} fragments** — \`${finalFragments}/${FRAGMENTS_PER_TICKET}\``);
  }
  if (totalTicketsFromFragments > 0) {
    footerLines.push(`🎟️ **+${totalTicketsFromFragments} ticket${totalTicketsFromFragments > 1 ? 's' : ''}** bonus depuis les fragments !`);
  }
  footerLines.push(`🎟️ Il te reste **${ticketsLeft}** ticket${ticketsLeft !== 1 ? 's' : ''}`);

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerLines.join('\n')))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PACK_BUTTON_OPEN)
          .setLabel('Ouvrir 1 pack')
          .setStyle(ButtonStyle.Success)
          .setDisabled(ticketsLeft === 0),
        new ButtonBuilder()
          .setCustomId(PACK_BUTTON_OPEN_5)
          .setLabel(`Ouvrir ${Math.min(ticketsLeft, MULTI_PACK_COUNT)} packs`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(ticketsLeft <= 1),
      ),
    );

  return container;
}

async function openPackMulti(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;

  const docBefore = await UserMountainsRepository.getOrCreate(userId);
  if (docBefore.packTickets <= 1) {
    await interaction.editReply({ content: "❌ Tu n'as pas assez de tickets !" });
    return;
  }

  const count = Math.min(docBefore.packTickets, MULTI_PACK_COUNT);
  await UserMountainsRepository.spendTickets(userId, count);

  const results: PackDrawResult[] = [];
  let totalFragmentsGained = 0;
  let totalTicketsFromFragments = 0;

  for (let i = 0; i < count; i++) {
    const mountain = MountainService.getRandomByPackWeight();
    if (!mountain) continue;

    const rarity = MountainService.getRarity(mountain);
    const { fragmentsOnDuplicate } = RARITY_CONFIG[rarity];

    const unlockResult = await UserMountainsRepository.unlock(userId, mountain.id, rarity);
    const isDuplicate = unlockResult === null;

    let fragmentsGained = 0;
    if (isDuplicate) {
      const fragResult = await UserMountainsRepository.addFragments(userId, fragmentsOnDuplicate);
      fragmentsGained = fragmentsOnDuplicate;
      totalFragmentsGained += fragmentsGained;
      totalTicketsFromFragments += fragResult.ticketsGained;
    }

    results.push({ mountain, rarity, isDuplicate, fragmentsGained });
  }

  const doc = await UserMountainsRepository.getOrCreate(userId);

  const container = buildMultiRevealContainer(
    results,
    totalFragmentsGained,
    totalTicketsFromFragments,
    doc.fragments,
    doc.packTickets,
  );

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function openPack(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;

  const spent = await UserMountainsRepository.spendTicket(userId);
  if (!spent) {
    await interaction.editReply({ content: "❌ Tu n'as plus de tickets ! Passe du temps en vocal pour en gagner." });
    return;
  }

  const mountain = MountainService.getRandomByPackWeight();
  if (!mountain) {
    await interaction.editReply({ content: '❌ Erreur lors du tirage.' });
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

  const embed = buildRevealEmbed(
    mountain,
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

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handlePackButton(interaction: ButtonInteraction, _client: BotClient): Promise<void> {
  const originalUserId = interaction.message.interactionMetadata?.user.id ?? interaction.message.author?.id;
  if (interaction.user.id !== originalUserId) {
    await interaction.reply({ content: "❌ Ce n'est pas ton pack !", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  if (interaction.customId === PACK_BUTTON_OPEN) {
    await openPack(interaction);
  } else if (interaction.customId === PACK_BUTTON_OPEN_5) {
    await openPackMulti(interaction);
  }
}

export async function executePack(interaction: ChatInputCommandInteraction | ButtonInteraction, _client: BotClient): Promise<void> {
  const userId = interaction.user.id;
  const doc = await UserMountainsRepository.getOrCreate(userId);

  const container = buildPackInfoContainer(doc.packTickets, doc.fragments);

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
