import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  InteractionWebhook,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { betSetupStates, buildSetupContainer } from '../events/bet-interactions';

export default {
  data: new SlashCommandBuilder()
    .setName('bet')
    .setDescription('Créer un bet sur un événement')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const stateId = `${interaction.user.id}_${Date.now().toString(36)}`;
    const initialState = {
      userId: interaction.user.id,
      webhook: interaction.webhook as InteractionWebhook,
      title: undefined,
      options: [undefined, undefined, undefined] as (string | undefined)[],
    };
    betSetupStates.set(stateId, initialState);
    setTimeout(() => betSetupStates.delete(stateId), 15 * 60 * 1000);

    await interaction.reply({
      components: [buildSetupContainer(stateId, initialState)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};
