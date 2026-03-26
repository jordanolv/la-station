import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  ForumChannel,
} from 'discord.js';
import { PartyRepository } from '../../party/services/party.repository';
import { DiscordPartyService } from '../../party/services/discord.party.service';

const repo = new PartyRepository();

export default {
  data: new SlashCommandBuilder()
    .setName('recreate-party')
    .setDescription('[TMP] Recrée le thread d\'une soirée existante sans notifier personne')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const events = await repo.findActiveEvents();
    if (!events.length) {
      await interaction.editReply('❌ Aucune soirée active trouvée.');
      return;
    }

    let done = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        const { guild } = await DiscordPartyService.getGuildAndChannel(interaction.client as any, event.discord.channelId);
        const channel = await guild.channels.fetch(event.discord.channelId) as ForumChannel;

        const container = DiscordPartyService.createEventContainer(event, event.discord.roleId);

        const eventDate = new Date(event.eventInfo.dateTime);
        const formattedDate = eventDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

        // Créer le nouveau thread sans aucune notification
        const thread = await channel.threads.create({
          name: `[${formattedDate}] ${event.eventInfo.name}`,
          message: {
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
          } as any,
        } as any);

        const starterMessage = await thread.fetchStarterMessage();
        const messageId = starterMessage?.id || thread.lastMessageId!;

        if (starterMessage) {
          await starterMessage.react('🎉').catch(() => {});
        }

        // Supprimer l'ancien thread si existant
        if (event.discord.threadId) {
          const oldThread = await interaction.client.channels.fetch(event.discord.threadId).catch(() => null);
          if (oldThread?.isThread()) {
            await oldThread.delete('Recréation soirée').catch(() => {});
          }
        }

        await repo.updateDiscordInfo(event._id.toString(), messageId, thread.id);

        done++;
      } catch (err) {
        errors.push(`${event.eventInfo.name}: ${err}`);
      }
    }

    const lines = [`✅ ${done}/${events.length} soirée(s) recrée(s).`];
    if (errors.length) lines.push(`\n❌ Erreurs :\n${errors.join('\n')}`);
    await interaction.editReply(lines.join(''));
  },
};
