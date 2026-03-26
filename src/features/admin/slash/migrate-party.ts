import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  ThreadChannel,
} from 'discord.js';
import { PartyRepository } from '../../party/services/party.repository';
import { DiscordPartyService } from '../../party/services/discord.party.service';

const repo = new PartyRepository();

export default {
  data: new SlashCommandBuilder()
    .setName('migrate-party')
    .setDescription('[TMP] Migre l\'embed d\'une soirée vers le nouveau format ComponentsV2')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const events = await repo.findActiveEvents();
    if (!events.length) {
      await interaction.editReply('❌ Aucune soirée active trouvée.');
      return;
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        if (!event.discord.threadId) continue;

        const thread = await interaction.client.channels.fetch(event.discord.threadId) as ThreadChannel;
        if (!thread?.isThread()) continue;

        const container = DiscordPartyService.createEventContainer(event, event.discord.roleId);

        const starterMessage = await thread.fetchStarterMessage();
        if (!starterMessage) continue;

        try {
          await starterMessage.edit({ components: [container], flags: MessageFlags.IsComponentsV2 } as any);
        } catch {
          // Message legacy → on envoie un nouveau et on supprime l'ancien
          const newMsg = await thread.send({ components: [container], flags: MessageFlags.IsComponentsV2 } as any);
          await starterMessage.delete().catch(() => {});
          await repo.updateDiscordInfo(event._id.toString(), newMsg.id);
          console.log(`[migrate-party] Event ${event.eventInfo.name} migré → nouveau messageId ${newMsg.id}`);
        }

        migrated++;
      } catch (err) {
        errors.push(`${event.eventInfo.name}: ${err}`);
      }
    }

    const lines = [`✅ ${migrated}/${events.length} soirée(s) migrée(s).`];
    if (errors.length) lines.push(`\n❌ Erreurs :\n${errors.join('\n')}`);
    await interaction.editReply(lines.join(''));
  },
};
