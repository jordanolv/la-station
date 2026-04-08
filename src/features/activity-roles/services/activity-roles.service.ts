import { UserRepository } from '../../user/services/user.repository';
import { ActivityRolesConfigRepository } from '../repositories/activity-roles-config.repository';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { LogService } from '../../../shared/logs/logs.service';
import UserModel from '../../user/models/user.model';
import AppConfigModel from '../../discord/models/app-config.model';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';

const LOG_FEATURE = '🎖️ Activity Roles';
const userRepo = new UserRepository();

export class ActivityRolesService {
  static async run(client: BotClient): Promise<void> {
    const config = await ActivityRolesConfigRepository.get();
    if (!config?.enabled) return;

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return;

    const users = await userRepo.findAllUsers();
    console.log(`[ActivityRoles] ${users.length} users trouvés en BDD`);
    if (!users.length) return;

    const scores = users
      .map(user => ({ userId: user.discordId, name: user.name, points: user.stats.activityPoints ?? 0 }))
      .filter(u => u.points > 0)
      .sort((a, b) => b.points - a.points);

    console.log(`[ActivityRoles] ${scores.length} users actifs:`, scores.map(s => `${s.userId}=${s.points}pts`));

    const total = scores.length;
    const { podiumRoleId, activeRoleId, regularRoleId, inactiveRoleId, activeThresholdPercent, regularThresholdPercent } = config;
    console.log(`[ActivityRoles] Config rôles — podium:${podiumRoleId} actif:${activeRoleId} présent:${regularRoleId} inactif:${inactiveRoleId}`);

    // Reset des points avant l'attribution pour éviter l'accumulation si crash
    await UserModel.updateMany({}, { $set: { 'stats.activityPoints': 0 } });
    console.log(`[ActivityRoles] activityPoints remis à 0 pour tous les users`);

    let assigned = 0;
    let removed = 0;

    await guild.members.fetch();

    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      const userId = member.user.id;
      const rank = scores.findIndex(s => s.userId === userId);

      let targetRoleId: string | undefined;

      const podiumCut = Math.min(3, total);
      const nonPodiumTotal = total - podiumCut;
      const nonPodiumRank = rank - podiumCut;
      const nonPodiumPct = nonPodiumTotal > 0 ? (nonPodiumRank / nonPodiumTotal) * 100 : 100;

      if (rank === -1) {
        targetRoleId = inactiveRoleId;
        console.log(`[ActivityRoles] ${userId} → inactif (0 points)`);
      } else if (rank < 3) {
        targetRoleId = podiumRoleId;
        console.log(`[ActivityRoles] ${userId} → podium (rank ${rank + 1}, ${scores[rank].points}pts)`);
      } else if (nonPodiumTotal > 0 && nonPodiumPct <= activeThresholdPercent) {
        targetRoleId = activeRoleId;
        console.log(`[ActivityRoles] ${userId} → actif (rank ${rank + 1}/${total}, hors-podium ${nonPodiumPct.toFixed(1)}%, ${scores[rank].points}pts)`);
      } else if (nonPodiumTotal > 0 && nonPodiumPct <= regularThresholdPercent) {
        targetRoleId = regularRoleId;
        console.log(`[ActivityRoles] ${userId} → présent (rank ${rank + 1}/${total}, hors-podium ${nonPodiumPct.toFixed(1)}%, ${scores[rank].points}pts)`);
      } else {
        targetRoleId = inactiveRoleId;
        console.log(`[ActivityRoles] ${userId} → inactif (rank ${rank + 1}/${total}, hors-podium ${nonPodiumPct.toFixed(1)}%, ${scores[rank].points}pts)`);
      }

      if (!targetRoleId) {
        console.log(`[ActivityRoles] ${userId} → aucun rôle cible (rôle non configuré)`);
      }

      const activityRoleIds = [podiumRoleId, activeRoleId, regularRoleId, inactiveRoleId].filter(Boolean) as string[];

      for (const roleId of activityRoleIds) {
        if (roleId !== targetRoleId && member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
          removed++;
        }
      }

      if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
        await member.roles.add(targetRoleId).catch(() => {});
        assigned++;
      }
    }

    const top3 = scores.slice(0, 3).map((s, i) => `${i + 1}. <@${s.userId}> — ${s.points} pts`).join('\n');

    await LogService.success(
      client,
      `Mise à jour des rôles d'activité terminée.\n**${assigned}** rôle(s) attribué(s), **${removed}** retiré(s)\n\n**🏆 Top 3**\n${top3 || 'Aucun'}`,
      { feature: LOG_FEATURE, title: '🗓️ Rotation hebdomadaire' },
    ).catch(() => {});

    await this.sendWeeklyLeaderboard(client, scores);
  }

  private static async sendWeeklyLeaderboard(
    client: BotClient,
    scores: { userId: string; name: string; points: number }[],
  ): Promise<void> {
    try {
      const appConfig = await AppConfigModel.findOne({});
      const channelId = (appConfig?.config?.channels as any)?.commandes;
      if (!channelId) return;

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;

      const medals = ['🥇', '🥈', '🥉'];
      if (!scores.length) return;

      const rows = scores.map((s, i) =>
        `${medals[i] ?? `**${i + 1}.**`} ${s.name} — **${s.points.toLocaleString('fr-FR')}** pts`,
      ).join('\n');

      const container = new ContainerBuilder()
        .setAccentColor(0xdac1ff)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 🏆 Classement de la semaine`),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(rows),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Les rôles d'activité viennent d'être mis à jour. Bonne semaine ! 🎉`),
        );

      await (channel as any).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      console.error('[ActivityRoles] Erreur envoi classement:', err);
    }
  }
}

