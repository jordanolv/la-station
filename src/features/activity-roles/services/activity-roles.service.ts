import { Guild } from 'discord.js';
import { UserRepository } from '../../user/services/user.repository';
import { ActivityRolesConfigRepository } from '../repositories/activity-roles-config.repository';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { LogService } from '../../../shared/logs/logs.service';

const LOG_FEATURE = '🎖️ Activity Roles';
const userRepo = new UserRepository();

export class ActivityRolesService {
  static async run(client: BotClient, useCurrentWeek = false): Promise<void> {
    const config = await ActivityRolesConfigRepository.get();
    if (!config?.enabled) return;

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return;

    const users = await userRepo.findAllUsers();
    console.log(`[ActivityRoles] ${users.length} users trouvés en BDD`);
    if (!users.length) return;

    // Calcul du temps vocal (semaine passée lun→dim, ou semaine courante pour les runs manuels)
    const { weekStart, weekEnd } = useCurrentWeek ? getCurrentWeekRange() : getPreviousWeekRange();
    console.log(`[ActivityRoles] Fenêtre semaine: ${weekStart.toISOString()} → ${weekEnd.toISOString()}`);

    const scores = users
      .map(user => ({
        userId: user.discordId,
        seconds: user.stats.voiceHistory
          .filter(entry => {
            const d = new Date(entry.date);
            return d >= weekStart && d < weekEnd;
          })
          .reduce((acc, entry) => acc + entry.time, 0),
      }))
      .filter(u => u.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);

    console.log(`[ActivityRoles] ${scores.length} users avec du temps vocal cette semaine:`, scores.map(s => `${s.userId}=${formatDuration(s.seconds)}`));

    const total = users.length;
    const { podiumRoleId, activeRoleId, regularRoleId, inactiveRoleId, activeThresholdPercent, regularThresholdPercent } = config;
    console.log(`[ActivityRoles] Config rôles — podium:${podiumRoleId} actif:${activeRoleId} présent:${regularRoleId} inactif:${inactiveRoleId}`);

    let assigned = 0;
    let removed = 0;

    // Récupérer tous les membres du serveur
    await guild.members.fetch();

    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      const userId = member.user.id;
      const rank = scores.findIndex(s => s.userId === userId); // -1 si absent

      let targetRoleId: string | undefined;

      if (rank === -1 || scores[rank].seconds === 0) {
        targetRoleId = inactiveRoleId;
        console.log(`[ActivityRoles] ${userId} → inactif (pas de vocal cette semaine)`);
      } else if (rank < 3) {
        targetRoleId = podiumRoleId;
        console.log(`[ActivityRoles] ${userId} → podium (rank ${rank + 1})`);
      } else if (total > 0 && (rank / total) * 100 <= activeThresholdPercent) {
        targetRoleId = activeRoleId;
        console.log(`[ActivityRoles] ${userId} → actif (rank ${rank + 1}/${total}, ${((rank / total) * 100).toFixed(1)}%)`);
      } else if (total > 0 && (rank / total) * 100 <= regularThresholdPercent) {
        targetRoleId = regularRoleId;
        console.log(`[ActivityRoles] ${userId} → présent (rank ${rank + 1}/${total}, ${((rank / total) * 100).toFixed(1)}%)`);
      } else {
        targetRoleId = inactiveRoleId;
        console.log(`[ActivityRoles] ${userId} → inactif (rank ${rank + 1}/${total}, ${((rank / total) * 100).toFixed(1)}%)`);
      }

      if (!targetRoleId) {
        console.log(`[ActivityRoles] ${userId} → aucun rôle cible (rôle non configuré)`);
      }

      const activityRoleIds = [podiumRoleId, activeRoleId, regularRoleId, inactiveRoleId].filter(Boolean) as string[];

      // Retirer les anciens rôles d'activité
      for (const roleId of activityRoleIds) {
        if (roleId !== targetRoleId && member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
          removed++;
        }
      }

      // Ajouter le nouveau rôle si pas déjà présent
      if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
        await member.roles.add(targetRoleId).catch(() => {});
        assigned++;
      }
    }

    const top3 = scores.slice(0, 3).map((s, i) => `${i + 1}. <@${s.userId}> — ${formatDuration(s.seconds)}`).join('\n');

    await LogService.success(
      client,
      `Mise à jour des rôles d'activité terminée.\n**${assigned}** rôle(s) attribué(s), **${removed}** retiré(s)\n\n**🏆 Top 3**\n${top3 || 'Aucun'}`,
      { feature: LOG_FEATURE, title: '🗓️ Rotation hebdomadaire' },
    ).catch(() => {});
  }
}

function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - daysToMonday);

  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

function getPreviousWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = dim, 1 = lun...
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() - daysToLastMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  return { weekStart: lastMonday, weekEnd: thisMonday };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
