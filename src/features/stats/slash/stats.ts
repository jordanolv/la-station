import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import GuildUserModel from '../../user/models/guild-user.model';
import { BotClient } from '../../../bot/client';

/**
 * Formate le temps vocal en heures, minutes et secondes
 */
function formatVoiceTime(seconds: number): string {
  if (seconds === 0) return '0 seconde';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} heure${hours > 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  }
  if (remainingSeconds > 0 && hours === 0) { // N'affiche les secondes que si moins d'une heure
    parts.push(`${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`);
  }
  
  return parts.join(' et ');
}

/**
 * Formate une date au format français
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Crée un graphique ASCII des temps vocaux sur les 7 derniers jours
 */
function createVoiceTimeGraph(voiceHistory: Array<{ date: Date, time: number }>): string {
  // Préparer les données pour les 7 derniers jours (du lundi au dimanche)
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Déterminer le lundi de la semaine courante
  const currentDay = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Convertir pour que lundi soit le premier jour
  const mondayOfCurrentWeek = new Date(today);
  mondayOfCurrentWeek.setDate(today.getDate() - daysFromMonday);
  
  // Créer un tableau pour les 7 jours de la semaine (du lundi au dimanche)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayOfCurrentWeek);
    date.setDate(mondayOfCurrentWeek.getDate() + i);
    return {
      date,
      dayName: days[i], // Lun, Mar, Mer, etc.
      time: 0
    };
  });
  
  // Remplir avec les données réelles
  voiceHistory.forEach(entry => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    const dayIndex = weekDays.findIndex(day => 
      day.date.getDate() === entryDate.getDate() && 
      day.date.getMonth() === entryDate.getMonth() && 
      day.date.getFullYear() === entryDate.getFullYear()
    );
    
    if (dayIndex !== -1) {
      weekDays[dayIndex].time += entry.time;
    }
  });
  
  // Trouver le temps maximum pour calculer les proportions
  const maxTime = Math.max(...weekDays.map(day => day.time), 1);
  const maxBarLength = 10; // Longueur maximale de la barre
  
  // Générer le graphique
  let graph = '```\n📊 Activité vocale (semaine courante)\n\n';
  
  weekDays.forEach(day => {
    const barLength = Math.round((day.time / maxTime) * maxBarLength);
    const bar = '█'.repeat(barLength || 0);
    const timeFormatted = formatVoiceTime(day.time);
    
    graph += `${day.dayName} | ${bar.padEnd(maxBarLength)} | ${timeFormatted}\n`;
  });
  
  graph += '```';
  return graph;
}

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche les statistiques d\'un utilisateur')
    .addUserOption(option => 
      option
        .setName('utilisateur')
        .setDescription('L\'utilisateur dont vous voulez voir les statistiques (vous par défaut)')
        .setRequired(false)
    ),
    
  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    try {
      // Récupérer l'utilisateur cible (l'auteur de la commande par défaut)
      const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
      const guildId = interaction.guildId;
      
      if (!guildId) {
        await interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          ephemeral: true
        });
        return;
      }
      
      // Afficher un message de chargement
      await interaction.deferReply();
      
      // Récupérer les données de l'utilisateur
      const guildUser = await GuildUserModel.findOne({
        discordId: targetUser.id,
        guildId: guildId
      });
      
      if (!guildUser) {
        await interaction.editReply({
          content: `❌ Aucune statistique trouvée pour ${targetUser.username}.`
        });
        return;
      }
      
      // Récupérer les statistiques
      const totalMessages = guildUser.stats.totalMsg || 0;
      const voiceTime = guildUser.stats.voiceTime || 0;
      
      // Calculer le temps vocal des 7 derniers jours
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const voiceHistoryLast7Days = guildUser.stats.voiceHistory
        .filter(entry => new Date(entry.date) >= sevenDaysAgo);
      
      const voiceTime7Days = voiceHistoryLast7Days
        .reduce((acc, curr) => acc + curr.time, 0);
      
      // Créer le graphique ASCII
      const voiceGraph = createVoiceTimeGraph(voiceHistoryLast7Days);
      
      // Créer l'embed
      const embed = new EmbedBuilder()
        .setTitle(`📊 Statistiques de ${targetUser.username}`)
        .setColor(0x0099FF)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .addFields(
          {
            name: '💬 Messages',
            value: `${totalMessages.toLocaleString('fr-FR')} messages envoyés`,
            inline: true
          },
          {
            name: '🎙️ Temps en vocal (total)',
            value: formatVoiceTime(voiceTime),
            inline: true
          },
          {
            name: '📅 7 derniers jours',
            value: formatVoiceTime(voiceTime7Days),
            inline: true
          },
          {
            name: '⭐ Niveau',
            value: `Niveau ${guildUser.profil?.lvl || 1} (${guildUser.profil?.exp || 0} XP)`,
            inline: true
          },
          {
            name: '📆 Membre depuis',
            value: formatDate(guildUser.infos?.registeredAt || new Date()),
            inline: true
          },
          {
            name: '\u200B',
            value: voiceGraph
          }
        )
        .setFooter({ text: 'La Station - Statistiques' })
        .setTimestamp();
      
      // Envoyer l'embed
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur dans la commande /stats:', error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true
        });
      }
    }
  }
}; 