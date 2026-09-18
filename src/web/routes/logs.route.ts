import { Router, Request, Response } from 'express';
import { Guild } from 'discord.js';
import { BotClient } from '../../bot/client';
import BotLogModel from '../../shared/logs/bot-log.model';
import UserModel from '../../features/user/models/user.model';
import { requireAdmin } from '../auth';
import { renderMentions, MentionNames } from '../logs-render';

const MAX_LIMIT = 300;
const MAX_DAYS = 90;

function mentionNames(guild?: Guild): MentionNames {
  return {
    users: new Map([...(guild?.members.cache ?? [])].map(([id, m]) => [id, m.displayName])),
    channels: new Map([...(guild?.channels.cache ?? [])].map(([id, c]) => [id, c.name])),
    roles: new Map([...(guild?.roles.cache ?? [])].map(([id, r]) => [id, r.name])),
  };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clampInt(value: unknown, fallback: number, max: number): number {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export default function logsRoute(client: BotClient): Router {
  const router = Router();

  router.get('/api/admin/logs', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    const filter: Record<string, unknown> = {};
    for (const key of ['level', 'feature', 'kind', 'userId'] as const) {
      const value = req.query[key];
      if (typeof value === 'string' && value) filter[key] = value;
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      filter.message = { $regex: escapeRegex(req.query.q.trim()), $options: 'i' };
    }
    if (typeof req.query.before === 'string' && req.query.before) {
      const before = new Date(req.query.before);
      if (!Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
    }

    const limit = clampInt(req.query.limit, 100, MAX_LIMIT);
    const [logs, features, kinds] = await Promise.all([
      BotLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      BotLogModel.distinct('feature'),
      BotLogModel.distinct('kind'),
    ]);

    const names = mentionNames(client.guilds.cache.get(process.env.GUILD_ID!));

    res.json({
      logs: logs.map((l: any) => ({
        id: String(l._id),
        createdAt: l.createdAt,
        level: l.level,
        kind: l.kind ?? null,
        feature: l.feature ?? null,
        title: l.title ?? null,
        message: renderMentions(l.message, names),
        userId: l.userId ?? null,
        amount: l.amount ?? null,
      })),
      filters: {
        features: features.filter(Boolean).sort(),
        kinds: kinds.filter(Boolean).sort(),
      },
    });
  });

  router.get('/api/admin/logs/economy', requireAdmin, async (req: Request, res: Response): Promise<void> => {
    const days = clampInt(req.query.days, 30, MAX_DAYS);
    const since = new Date(Date.now() - days * 86_400_000);
    const match = { kind: 'economy', createdAt: { $gte: since } };
    const sumIf = (cond: object) => ({ $sum: { $cond: [cond, '$amount', 0] } });
    const flows = {
      mint: sumIf({ $eq: ['$flow', 'mint'] }),
      burn: sumIf({ $eq: ['$flow', 'burn'] }),
      transfer: sumIf({ $and: [{ $eq: ['$flow', 'transfer'] }, { $gt: ['$amount', 0] }] }),
      count: { $sum: 1 },
    };

    const [byDay, byReason, supply] = await Promise.all([
      BotLogModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Paris' } },
            ...flows,
          },
        },
        { $sort: { _id: -1 } },
      ]),
      BotLogModel.aggregate([
        { $match: match },
        { $group: { _id: { reason: '$title', flow: '$flow' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UserModel.aggregate([{ $group: { _id: null, total: { $sum: '$profil.money' } } }]),
    ]);

    res.json({
      days,
      supply: supply[0]?.total ?? 0,
      byDay: byDay.map((d) => ({ date: d._id, mint: d.mint, burn: d.burn, transfer: d.transfer, count: d.count })),
      byReason: byReason.map((r) => ({
        reason: r._id.reason ?? 'inconnu',
        flow: r._id.flow ?? 'mint',
        total: r.total,
        count: r.count,
      })),
    });
  });

  return router;
}
