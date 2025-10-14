import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, AutocompleteInteraction } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection } from '@discordjs/voice';
import * as fs from 'fs/promises';
import * as path from 'path';

// Map pour stocker les connexions vocales actives par serveur
const activeConnections = new Map<string, VoiceConnection>();

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Joue l\'hymne d\'une équipe dans le canal vocal')
    .addStringOption(option =>
      option.setName('equipe')
        .setDescription('Le nom de l\'équipe')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('version')
        .setDescription('Version à jouer')
        .setRequired(true)
        .addChoices(
          { name: 'Complet', value: 'complet' },
          { name: 'Refrain', value: 'refrain' }
        )),

  async autocomplete(interaction: AutocompleteInteraction) {
    try {
      const soundsDir = path.resolve(process.cwd(), 'src', 'assets', 'sounds');

      try {
        await fs.access(soundsDir);
      } catch {
        await interaction.respond([{ name: 'Aucun son disponible', value: 'none' }]);
        return;
      }

      const files = await fs.readdir(soundsDir);

      // Extraire les noms d'équipes (fichiers se terminant par -complet.wav ou -refrain.wav)
      const teams = new Set<string>();
      for (const file of files) {
        if (file.endsWith('-complet.wav') || file.endsWith('-refrain.wav')) {
          const teamName = file.replace(/-complet\.wav$/, '').replace(/-refrain\.wav$/, '');
          teams.add(teamName);
        }
      }

      if (teams.size === 0) {
        await interaction.respond([{ name: 'Aucune équipe trouvée', value: 'none' }]);
        return;
      }

      const focusedValue = interaction.options.getFocused().toLowerCase();
      const filtered = Array.from(teams).filter(team =>
        team.toLowerCase().includes(focusedValue)
      );

      await interaction.respond(
        filtered.slice(0, 25).map(team => ({
          name: team.charAt(0).toUpperCase() + team.slice(1),
          value: team
        }))
      );
    } catch (error) {
      console.error('Erreur autocomplete:', error);
      await interaction.respond([{ name: 'Erreur', value: 'error' }]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          flags: [64]
        });
      }

      const equipe = interaction.options.getString('equipe', true);
      const version = interaction.options.getString('version', true);

      // Vérifier si l'utilisateur est dans un canal vocal
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const voiceChannel = member?.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ Vous devez être dans un canal vocal pour utiliser cette commande.',
          flags: [64]
        });
      }

      // Construire le chemin du fichier audio
      const fileName = `${equipe}-${version}.wav`;
      const soundsDir = path.resolve(process.cwd(), 'src', 'assets', 'sounds');
      const audioPath = path.join(soundsDir, fileName);

      // Vérifier si le fichier existe
      try {
        await fs.access(audioPath);
      } catch {
        return interaction.reply({
          content: `❌ Le fichier audio pour **${equipe}** (${version}) n'existe pas.\nChemin attendu: \`src/assets/sounds/${fileName}\``,
          flags: [64]
        });
      }

      // Déconnecter une connexion existante si présente
      const existingConnection = activeConnections.get(interaction.guild.id);
      if (existingConnection) {
        existingConnection.destroy();
        activeConnections.delete(interaction.guild.id);
      }

      try {
        // Sauvegarder le nom actuel du bot
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        const originalNickname = botMember?.nickname || null;

        // Changer le nom du bot
        const newNickname = `🎵 ${equipe.charAt(0).toUpperCase() + equipe.slice(1)}`;
        await botMember?.setNickname(newNickname).catch(console.error);

        // Rejoindre le canal vocal
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        // Stocker la connexion
        activeConnections.set(interaction.guild.id, connection);

        // Créer un lecteur audio
        const player = createAudioPlayer();
        const resource = createAudioResource(audioPath, {
          inlineVolume: true
        });

        resource.volume?.setVolume(0.2); // Régler le volume si nécessaire

        // Jouer l'audio
        player.play(resource);
        connection.subscribe(player);

        // Quitter le canal une fois le son terminé
        player.on(AudioPlayerStatus.Idle, () => {
          connection.destroy();
          activeConnections.delete(interaction.guild.id);
          // Restaurer le nom original du bot
          botMember?.setNickname(originalNickname).catch(console.error);
        });

        // Gérer les erreurs
        player.on('error', error => {
          console.error('Erreur du lecteur audio:', error);
          connection.destroy();
          activeConnections.delete(interaction.guild.id);
          // Restaurer le nom original du bot en cas d'erreur
          botMember?.setNickname(originalNickname).catch(console.error);
        });

        await interaction.reply({
          content: `🎵 Lecture de l'hymne de **${equipe.charAt(0).toUpperCase() + equipe.slice(1)}** (${version}) dans ${voiceChannel}`,
          flags: [64]
        });

      } catch (error) {
        console.error('Erreur lors de la lecture du son:', error);
        activeConnections.delete(interaction.guild.id);

        return interaction.reply({
          content: '❌ Une erreur est survenue lors de la connexion au canal vocal.',
          flags: [64]
        });
      }

    } catch (error) {
      console.error('Erreur dans la commande play:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          flags: [64]
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          flags: [64]
        });
      }
    }
  }
};
