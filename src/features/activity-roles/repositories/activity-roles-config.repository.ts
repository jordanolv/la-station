import ActivityRolesConfigModel, { IActivityRolesConfig } from '../models/activity-roles-config.model';

export class ActivityRolesConfigRepository {
  static async getOrCreate(): Promise<IActivityRolesConfig> {
    const existing = await ActivityRolesConfigModel.findOne();
    if (existing) return existing;
    return ActivityRolesConfigModel.create({});
  }

  static async get(): Promise<IActivityRolesConfig | null> {
    return ActivityRolesConfigModel.findOne();
  }

  static async update(data: Partial<{
    enabled: boolean;
    podiumRoleId: string | null;
    activeRoleId: string | null;
    regularRoleId: string | null;
    inactiveRoleId: string | null;
    activeThresholdPercent: number;
    regularThresholdPercent: number;
  }>): Promise<IActivityRolesConfig> {
    const doc = await this.getOrCreate();
    if (data.enabled !== undefined) doc.enabled = data.enabled;
    if (data.podiumRoleId !== undefined) doc.podiumRoleId = data.podiumRoleId ?? undefined;
    if (data.activeRoleId !== undefined) doc.activeRoleId = data.activeRoleId ?? undefined;
    if (data.regularRoleId !== undefined) doc.regularRoleId = data.regularRoleId ?? undefined;
    if (data.inactiveRoleId !== undefined) doc.inactiveRoleId = data.inactiveRoleId ?? undefined;
    if (data.activeThresholdPercent !== undefined) doc.activeThresholdPercent = data.activeThresholdPercent;
    if (data.regularThresholdPercent !== undefined) doc.regularThresholdPercent = data.regularThresholdPercent;
    return doc.save();
  }
}
