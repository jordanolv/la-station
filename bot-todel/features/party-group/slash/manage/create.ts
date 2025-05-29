import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { CommandInteraction } from 'discord.js';
import { BotClient } from '../../../../BotClient';
import { GameService } from '../../../../../database/services/GameService';

export default {
  data: new SlashCommandBuilder()
    .setName("partygroup")
    .setDescription("Créer un groupe de joueurs pour un jeu (ex: League of Legends, Valorant, etc.)")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Tu veux jouer en mode sérieux ou pas ?")
        .setRequired(true)
        .addChoices(
          { name: "Casual", value: "casual" },
          { name: "Ranked", value: "ranked" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("joueurs")
        .setDescription("Combien de joueurs dans le groupe ?")
        .setRequired(true)
        .addChoices(
          { name: "1", value: "1" },
          { name: "2", value: "2" },
          { name: "3", value: "3" },
          { name: "4", value: "4" },
          { name: "5", value: "5" },
          { name: "6", value: "6" },
          { name: "7", value: "7" },
          { name: "8", value: "8" },
          { name: "9", value: "9" },
          { name: "10", value: "10" },
          { name: "11", value: "11" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("start_time")
        .setDescription("Heure de début de la session (format: HH:mm) pour aujourd'hui")
        .setRequired(true)
    ),

  async execute(client: BotClient, interaction: any) {

    if (!interaction) return;

    if (!interaction.channel) {
      return interaction.reply({
        content: "Cette commande doit être utilisée dans un channel.",
        ephemeral: true,
      });
    }

    const game = await GameService.findByThreadId(interaction.channel.id);

    if (!game) {
      return interaction.reply({
        content: "Ce channel n'est pas associé à un jeu.",
        ephemeral: true,
      });
    }

    // Récupérer et parser la date de début de session
    const startTimeString = interaction.options.getString("start_time");
    const [hour, minute] = startTimeString.split(":").map(Number);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    if (startDate.getTime() - Date.now() <= 0) {
      return interaction.reply({
        content: "L'heure de début doit être dans le futur pour aujourd'hui.",
        ephemeral: true,
      });
    }

    // Obtenir le nombre maximum de participants depuis l'option "joueurs"
    const maxParticipants = parseInt(interaction.options.getString("joueurs"), 10);

    if (maxParticipants <= 0) {
      return interaction.reply({
        content: "Nombre de joueurs invalide.",
        ephemeral: true,
      });
    }

    // Stockage des participants et ajout automatique du créateur
    const participants: string[] = [];
    if (!participants.includes(interaction.user.tag)) {
      participants.push(interaction.user.tag);
    }

    // Création d'un embed plus esthétique
    const embed = new EmbedBuilder()
      .setTitle("🎮 Groupe de joueurs")
      .setDescription(
        `Recherche de joueurs pour **${game.name}** en mode **${interaction.options.getString("mode")}**`
      )
      .addFields(
        { name: "Participants", value: participants.join(", "), inline: false },
        { name: "Début de session", value: `<t:${Math.floor(startDate.getTime() / 1000)}:F>`, inline: false }
      )
      .setColor(parseInt(game.color.replace('#', ''), 16))
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: "Réagis avec 🔔 pour rejoindre le groupe !" })
      .setTimestamp();

    // Envoi du message (non éphémère pour permettre les réactions)
    await interaction.reply({
      embeds: [embed],
    });
    const messageSend = await interaction.fetchReply();

    // Ajouter la réaction "🔔"
    await messageSend.react("🔔");

    // Créer le collector pour réagir jusqu'au début de la session
    const filter = (reaction: any, user: any) => reaction.emoji.name === "🔔" && !user.bot;
    const timeUntilStart = startDate.getTime() - Date.now();

    const collector = messageSend.createReactionCollector({ filter, time: timeUntilStart, dispose: true });

    collector.on("collect", async (reaction: any, user: any) => {
      // Si le nombre maximum est atteint, on retire la réaction de l'utilisateur et informe en privé
      if (participants.length >= maxParticipants) {
        reaction.users.remove(user.id).catch(console.error);
        return interaction.followUp({
          content: `Le groupe est complet (${maxParticipants} participants).`,
          ephemeral: true,
        });
      }
      // Ajout du participant s'il n'est pas déjà dans la liste
      if (!participants.includes(user.tag)) {
        participants.push(user.tag);
      }

      // Mettre à jour l'embed
      embed.spliceFields(0, embed.data.fields?.length || 0);
      embed.addFields(
        { name: "Participants", value: participants.join(", "), inline: false },
        { name: "Début de session", value: `<t:${Math.floor(startDate.getTime() / 1000)}:F>`, inline: false }
      );

      await messageSend.edit({ embeds: [embed] });
    });

    collector.on("remove", async (reaction: any, user: any) => {
      const index = participants.indexOf(user.tag);
      if (index !== -1) {
        participants.splice(index, 1);
        // Mettre à jour l'embed
        embed.spliceFields(0, embed.data.fields?.length || 0);
        embed.addFields(
          { name: "Participants", value: participants.length > 0 ? participants.join(", ") : "Aucun", inline: false },
          { name: "Début de session", value: `<t:${Math.floor(startDate.getTime() / 1000)}:F>`, inline: false }
        );
        await messageSend.edit({ embeds: [embed] });
      }
    });

    collector.on("end", async () => {
      // À la fin du collector (c'est-à-dire au début de la session), on supprime les réactions et informe le channel
      await messageSend.reactions.removeAll().catch(console.error);
      await interaction.followUp({
        content: "Le groupe de joueurs est fermé. La session commence maintenant !",
      });
    });
  },
};
