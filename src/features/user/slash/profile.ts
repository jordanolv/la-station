import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { UserService } from '../services/guildUser.service';
import { formatDate } from '../../../shared/utils/date-format';
import { emojis } from '../../../utils/emojis';


const MODAL_ID = 'profile-config-modal';
const BIO_INPUT_ID = 'profile-bio';
const BIRTHDAY_INPUT_ID = 'profile-birthday';

function buildDateString(date?: Date | null): string {
  if (!date) return '';
  return formatDate(date).replace('Non défini', '');
}

function validateBirthday(input: string): { date?: Date; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { date: undefined };
  }

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = trimmed.match(dateRegex);

  if (!match) {
    return { error: `${emojis.error} Format de date invalide. Utilisez JJ/MM/AAAA (ex: 01/01/1990).` };
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const birthDate = new Date(year, month, day);

  const invalidDate =
    birthDate.getDate() !== day ||
    birthDate.getMonth() !== month ||
    birthDate.getFullYear() !== year;

  if (invalidDate || birthDate > new Date()) {
    return { error: `${emojis.error} Date invalide. Veuillez indiquer une date existante qui n'est pas dans le futur.` };
  }

  return { date: birthDate };
}

export default {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Configurer votre profil (bio et anniversaire).'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Cette commande doit être utilisée dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    const guildUser = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guildId);

    if (!guildUser) {
      await interaction.reply({
        content: '❌ Utilisateur introuvable dans la base. Réessayez plus tard.',
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('Configurer votre profil');

    const bioInput = new TextInputBuilder()
      .setCustomId(BIO_INPUT_ID)
      .setLabel('Bio')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    if (guildUser.bio) {
      bioInput.setValue(guildUser.bio);
    }

    const birthValue = buildDateString(guildUser.infos?.birthDate);

    const birthdayInput = new TextInputBuilder()
      .setCustomId(BIRTHDAY_INPUT_ID)
      .setLabel("Anniversaire (JJ/MM/AAAA)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 15/08/1995')
      .setRequired(false)
      .setMaxLength(10);

    if (birthValue) {
      birthdayInput.setValue(birthValue);
    }

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(bioInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(birthdayInput),
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ Cette action doit être réalisée dans un serveur.',
        ephemeral: true,
      });
      return;
    }

    const bioRaw = interaction.fields.getTextInputValue(BIO_INPUT_ID)?.trim() ?? '';
    const birthdayRaw = interaction.fields.getTextInputValue(BIRTHDAY_INPUT_ID)?.trim() ?? '';

    const guildUser = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guildId);

    if (!guildUser) {
      await interaction.reply({
        content: '❌ Utilisateur introuvable dans la base. Réessayez plus tard.',
        ephemeral: true,
      });
      return;
    }

    const { date: birthDate, error } = validateBirthday(birthdayRaw);
    if (error) {
      await interaction.reply({ content: error, ephemeral: true });
      return;
    }
    guildUser.bio = bioRaw.length > 0 ? bioRaw : undefined;
    guildUser.infos = guildUser.infos || { registeredAt: new Date(), updatedAt: new Date() };
    guildUser.infos.birthDate = birthDate ?? undefined;
    guildUser.infos.updatedAt = new Date();

    await guildUser.save();

    const birthDisplay = birthDate ? formatDate(birthDate) : 'Non défini';
    const bioDisplay = guildUser.bio ?? 'Aucune bio définie.';

    await interaction.reply({
      content: `✅ Profil mis à jour !\n• **Bio:** ${bioDisplay}\n• **Anniversaire:** ${birthDisplay}`,
      ephemeral: true,
    });
  },
};
