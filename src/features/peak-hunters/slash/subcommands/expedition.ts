import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  User,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import { UserMountainsRepository } from '../../repositories/user-mountains.repository';
import { MountainService, MountainInfo } from '../../services/mountain.service';
import { RARITY_CONFIG, FRAGMENTS_PER_TICKET, PACK_TIER_CONFIG, PACK_TIER_RARITY_WEIGHTS } from '../../constants/peak-hunters.constants';

import type { MountainRarity, PackTier } from '../../types/peak-hunters.types';
import { LogService } from '../../../../shared/logs/logs.service';
import { formatExpeditionsLine, formatExpeditionsLineText } from '../../services/expedition.service';

// customId format : mountain:pack:open:<tier>:<userId>
//                   mountain:pack:open5:<tier>:<userId>
export const EXPEDITION_BUTTON_PREFIX = 'mountain:pack';
const packOpenId  = (tier: PackTier, userId: string) => `mountain:pack:open:${tier}:${userId}`;
const packOpen5Id = (tier: PackTier, userId: string) => `mountain:pack:open5:${tier}:${userId}`;

const MULTI_PACK_COUNT = 5;
const BAR_IMAGE_URL =
  'https://cdn.discordapp.com/attachments/685655650923053122/1493313723744518237/Nouveau_projet_7.png?ex=69de8448&is=69dd32c8&hm=e784bdf98db6660531cbf89dbd522b7d3da94558972c1b3dde033b1ac0718726&';

function buildFragmentBar(fragments: number): string {
  const filled = Math.round((fragments / FRAGMENTS_PER_TICKET) * 10);
  return '🟧'.repeat(filled) + '⬛'.repeat(10 - filled);
}

function buildRarityOddsLine(tier: PackTier): string {
  const weights = PACK_TIER_RARITY_WEIGHTS[tier];
  const rarities: MountainRarity[] = ['common', 'rare', 'epic', 'legendary'];
  const total = rarities.reduce((sum, r) => sum + weights[r], 0);
  return rarities
    .filter(r => weights[r] > 0)
    .map(r => `${RARITY_CONFIG[r].emoji} ${Math.round((weights[r] / total) * 100)}%`)
    .join('  ');
}

export function buildExpeditionContainer(user: User, sentierTickets: number, falaiseTickets: number, sommetTickets: number, fragments: number): ContainerBuilder {
  const { emoji: sEmoji, label: sLabel } = PACK_TIER_CONFIG.sentier;
  const { emoji: fEmoji, label: fLabel } = PACK_TIER_CONFIG.falaise;
  const { emoji: eEmoji, label: eLabel } = PACK_TIER_CONFIG.sommet;

  const container = new ContainerBuilder()
    .setAccentColor(0x1e8d73)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🗺️ Expéditions\n-# par <@${user.id}>`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🧩 ${buildFragmentBar(fragments)}  \`${fragments}/${FRAGMENTS_PER_TICKET}\``))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 64 }))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${sEmoji} ${sLabel} — **${sentierTickets}** disponible${sentierTickets !== 1 ? 's' : ''}\n-# ${buildRarityOddsLine('sentier')}`))

  if (sentierTickets > 0) container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(packOpenId('sentier', user.id)).setLabel('🥾 Lancer 1').setStyle(ButtonStyle.Secondary),
      ...(sentierTickets > 1 ? [new ButtonBuilder().setCustomId(packOpen5Id('sentier', user.id)).setLabel(`🥾 Lancer ${Math.min(sentierTickets, MULTI_PACK_COUNT)}`).setStyle(ButtonStyle.Secondary)] : []),
    ),
  );

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${fEmoji} ${fLabel} — **${falaiseTickets}** disponible${falaiseTickets !== 1 ? 's' : ''}\n-# ${buildRarityOddsLine('falaise')}`));

  if (falaiseTickets > 0) container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(packOpenId('falaise', user.id)).setLabel('🥾 Lancer 1').setStyle(ButtonStyle.Secondary),
      ...(falaiseTickets > 1 ? [new ButtonBuilder().setCustomId(packOpen5Id('falaise', user.id)).setLabel(`🥾 Lancer ${Math.min(falaiseTickets, MULTI_PACK_COUNT)}`).setStyle(ButtonStyle.Secondary)] : []),
    ),
  );

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${eEmoji} ${eLabel} — **${sommetTickets}** disponible${sommetTickets !== 1 ? 's' : ''}\n-# ${buildRarityOddsLine('sommet')}`));

  if (sommetTickets > 0) container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(packOpenId('sommet', user.id)).setLabel('🥾 Lancer 1').setStyle(ButtonStyle.Danger),
    ),
  );

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('https://res.cloudinary.com/theridge-bot/image/upload/q_auto/f_auto/v1776241629/the-ridge/discord/logo/ph-banner.png'),
    ),
  );

  return container;
}

function buildRevealEmbed(
  mountain: MountainInfo,
  rarity: MountainRarity,
  tier: PackTier,
  isDuplicate: boolean,
  fragmentsGained: number,
  totalFragments: number,
  sentierTickets: number,
  falaiseTickets: number,
  sommetTickets: number,
  ticketsFromFragments: number,
  user: User,
): EmbedBuilder {
  const { emoji, label, color } = RARITY_CONFIG[rarity];
  const tierCfg = PACK_TIER_CONFIG[tier];

  let resultText: string;
  if (isDuplicate) {
    resultText = `**Double !** Tu possèdes déjà cette montagne.\n→ **+${fragmentsGained} fragment${fragmentsGained > 1 ? 's' : ''}** 🧩 (\`${totalFragments}/${FRAGMENTS_PER_TICKET}\`)`;
    if (ticketsFromFragments > 0) {
      resultText += `\n🗺️ **+${ticketsFromFragments} expédition${ticketsFromFragments > 1 ? 's' : ''}** bonus !`;
    }
  } else {
    resultText = '**Nouvelle montagne débloquée !** ✅';
  }

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
    .setThumbnail('https://res.cloudinary.com/theridge-bot/image/upload/q_auto/f_auto/v1776241636/the-ridge/discord/logo/ph-logo.png')
    .setTitle(`${emoji} ${mountain.mountainLabel}`)
    .addFields(
      { name: '🌍 Pays', value: MountainService.getCountryDisplay(mountain), inline: true },
      { name: '📏 Altitude', value: MountainService.getAltitude(mountain), inline: true },
      { name: '✨ Rareté', value: `${emoji} **${label}**`, inline: true },
    )
    .setDescription(resultText)
    .setImage(mountain.image)
    .setFooter({ text: `Expédition ${tierCfg.label}  ·  ${formatExpeditionsLineText(sentierTickets, falaiseTickets, sommetTickets)}` });
}

interface PackDrawResult {
  mountain: MountainInfo;
  rarity: MountainRarity;
  isDuplicate: boolean;
  fragmentsGained: number;
}

function buildMultiRevealContainer(
  results: PackDrawResult[],
  tier: PackTier,
  totalFragmentsGained: number,
  totalTicketsFromFragments: number,
  finalFragments: number,
  sentierTickets: number,
  falaiseTickets: number,
  sommetTickets: number,
  user: User,
): ContainerBuilder {
  const tierCfg = PACK_TIER_CONFIG[tier];
  const remaining = tier === 'falaise' ? falaiseTickets : tier === 'sommet' ? sommetTickets : sentierTickets;

  const headerLines: string[] = [
    `# ${tierCfg.emoji} Expédition x${results.length}\n-# par <@${user.id}>\n`,
  ];
  if (totalFragmentsGained > 0) {
    headerLines.push(`🧩 +${totalFragmentsGained} fragments — ${finalFragments}/${FRAGMENTS_PER_TICKET}`);
  }
  if (totalTicketsFromFragments > 0) {
    headerLines.push(
      `🗺️ **+${totalTicketsFromFragments} expédition${totalTicketsFromFragments > 1 ? 's' : ''}** bonus depuis les fragments !`,
    );
  }
  headerLines.push(formatExpeditionsLine(sentierTickets, falaiseTickets, sommetTickets));

  const container = new ContainerBuilder()
    .setAccentColor(0x1e8d73)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerLines.join('\n')))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 64 }))),
    )
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BAR_IMAGE_URL),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  for (const r of results) {
    const { emoji, label } = RARITY_CONFIG[r.rarity];
    const statusLine = r.isDuplicate ? `-# 🔁 Double — +${r.fragmentsGained} 🧩` : `-# ✅ Nouvelle !`;
    const flags = r.mountain.flags?.join(' ') ?? '';
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji} **${r.mountain.mountainLabel}** ${flags}\n-# ${label} · ${MountainService.getAltitude(r.mountain)}\n${statusLine}`))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(r.mountain.image)),
    );
  }

  if (remaining > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    if (tier === 'sommet') {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(packOpenId(tier, user.id)).setLabel('🥾 Lancer 1 autre').setStyle(ButtonStyle.Danger),
        ),
      );
    } else {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(packOpenId(tier, user.id)).setLabel('🥾 Lancer 1').setStyle(ButtonStyle.Secondary),
          ...(remaining > 1 ? [new ButtonBuilder().setCustomId(packOpen5Id(tier, user.id)).setLabel(`🥾 Lancer ${Math.min(remaining, MULTI_PACK_COUNT)}`).setStyle(ButtonStyle.Secondary)] : []),
        ),
      );
    }
  }

  return container;
}

async function openPackMulti(interaction: ButtonInteraction, tier: PackTier): Promise<void> {
  const userId = interaction.user.id;
  const docBefore = await UserMountainsRepository.getOrCreate(userId);
  const available = tier === 'falaise' ? docBefore.falaiseTickets : tier === 'sommet' ? docBefore.sommetTickets : docBefore.sentierTickets;

  if (available <= 1) {
    await interaction.editReply({ content: "❌ Tu n'as pas assez d'expéditions !" });
    return;
  }

  const count = Math.min(available, MULTI_PACK_COUNT);
  await UserMountainsRepository.spendTickets(userId, count, tier);

  const results: PackDrawResult[] = [];
  let totalFragmentsGained = 0;
  let totalTicketsFromFragments = 0;

  for (let i = 0; i < count; i++) {
    const mountain = MountainService.getRandomByTier(tier);
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
  const tierCfg = PACK_TIER_CONFIG[tier];

  const container = buildMultiRevealContainer(
    results, tier, totalFragmentsGained, totalTicketsFromFragments,
    doc.fragments, doc.sentierTickets, doc.falaiseTickets, doc.sommetTickets, interaction.user,
  );

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

  const newList = results.filter(r => !r.isDuplicate).map(r => `${RARITY_CONFIG[r.rarity].emoji} ${r.mountain.mountainLabel}`).join(', ') || '—';
  const dupList = results.filter(r => r.isDuplicate).map(r => `${RARITY_CONFIG[r.rarity].emoji} ${r.mountain.mountainLabel}`).join(', ') || '—';
  await LogService.info(
    `<@${userId}> a lancé **${count} expéditions ${tierCfg.label}** ${tierCfg.emoji} · ${formatExpeditionsLineText(doc.sentierTickets, doc.falaiseTickets, doc.sommetTickets)}\n✅ ${newList}\n🔁 ${dupList}${totalFragmentsGained > 0 ? `\n🧩 +${totalFragmentsGained} fragments → \`${doc.fragments}/${FRAGMENTS_PER_TICKET}\`` : ''}`,
    { feature: 'Mountain · Expéditions', title: `🗺️ Expéditions ${tierCfg.label} lancées` },
  );
}

async function openPack(interaction: ButtonInteraction, tier: PackTier): Promise<void> {
  const userId = interaction.user.id;

  const spent = await UserMountainsRepository.spendTicket(userId, tier);
  if (!spent) {
    await interaction.editReply({ content: "❌ Tu n'as plus d'expéditions ! Passe du temps en vocal pour en gagner." });
    return;
  }

  const mountain = MountainService.getRandomByTier(tier);
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
  const tierCfg = PACK_TIER_CONFIG[tier];
  const remaining = tier === 'falaise' ? doc.falaiseTickets : tier === 'sommet' ? doc.sommetTickets : doc.sentierTickets;

  const embed = buildRevealEmbed(
    mountain, rarity, tier, isDuplicate, fragmentsGained, totalFragments,
    doc.sentierTickets, doc.falaiseTickets, doc.sommetTickets, ticketsFromFragments, interaction.user,
  );

  const components = remaining > 0
    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(packOpenId(tier, userId))
          .setLabel('🥾 Lancer une autre expédition')
          .setStyle(tier === 'sommet' ? ButtonStyle.Danger : ButtonStyle.Success),
      )]
    : [];

  await interaction.editReply({ embeds: [embed], components });

  const { emoji, label } = RARITY_CONFIG[rarity];
  const packResult = isDuplicate ? `🔁 double +${fragmentsGained}🧩${ticketsFromFragments > 0 ? ` +${ticketsFromFragments}🗺️` : ''}` : '✅ nouveau';
  await LogService.info(
    `<@${userId}> a lancé une expédition **${tierCfg.label}** ${tierCfg.emoji} · ${emoji} **${mountain.mountainLabel}** (${label}) — ${packResult} · ${formatExpeditionsLineText(doc.sentierTickets, doc.falaiseTickets, doc.sommetTickets)}`,
    { feature: 'Mountain · Expéditions', title: `${tierCfg.emoji} Expédition ${tierCfg.label} lancée` },
  );
}

export async function handleExpeditionButton(interaction: ButtonInteraction, _client: BotClient): Promise<void> {
  // customId: mountain:pack:open:<tier>:<userId> ou mountain:pack:open5:<tier>:<userId>
  const parts = interaction.customId.split(':');
  const action = parts[2]; // 'open' ou 'open5'
  const tier = parts[3] as PackTier;
  const ownerId = parts[4];

  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: "❌ Ce n'est pas ton expédition !", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  if (action === 'open') {
    await openPack(interaction, tier);
  } else if (action === 'open5') {
    await openPackMulti(interaction, tier);
  }
}

export async function executeExpedition(interaction: ChatInputCommandInteraction | ButtonInteraction, _client: BotClient): Promise<void> {
  const userId = interaction.user.id;
  const doc = await UserMountainsRepository.getOrCreate(userId);
  const container = buildExpeditionContainer(interaction.user, doc.sentierTickets, doc.falaiseTickets, doc.sommetTickets, doc.fragments);
  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}
