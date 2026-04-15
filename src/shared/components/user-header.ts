import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';
import type { User } from 'discord.js';

/**
 * Container header réutilisable — affiche l'avatar et le pseudo d'un utilisateur.
 * S'utilise en premier élément d'un tableau de containers ComponentsV2.
 * @param lines Lignes supplémentaires sous le pseudo, rendues en sous-texte (-#)
 *
 * @example
 * buildUserHeaderContainer(user, [
 *   '⛰️ Peak Hunters  ·  3 expéditions',
 *   '🧩 ░░░░░░░░░░  3/20',
 * ])
 */
export function buildUserHeaderContainer(user: User, lines: string[] = []): ContainerBuilder {
  const content = [
    `**${user.displayName}**`,
    ...lines.map(l => `-# ${l}`),
  ].join('\n');

  return new ContainerBuilder()
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(user.displayAvatarURL({ size: 64 }))),
    );
}
