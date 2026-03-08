import { prop, getModelForClass } from '@typegoose/typegoose';
import { DocumentType } from '@typegoose/typegoose';

export class ActivityRolesConfig {
  @prop({ default: false })
  enabled!: boolean;

  // ─── Rôles ────────────────────────────────────────────────────────────────

  /** Rôle attribué aux 3 premiers du classement */
  @prop()
  podiumRoleId?: string;

  /** Rôle actif — ex: top 20% hors podium */
  @prop()
  activeRoleId?: string;

  /** Rôle présent — ex: top 21-60% */
  @prop()
  regularRoleId?: string;

  /** Rôle inactif — tout le reste */
  @prop()
  inactiveRoleId?: string;

  // ─── Seuils (% du classement) ─────────────────────────────────────────────

  /** % max pour le rôle actif (ex: 20 = top 20%) */
  @prop({ default: 20 })
  activeThresholdPercent!: number;

  /** % max pour le rôle présent (ex: 60 = top 21-60%) */
  @prop({ default: 60 })
  regularThresholdPercent!: number;
}

const ActivityRolesConfigModel = getModelForClass(ActivityRolesConfig, {
  schemaOptions: { collection: 'activity_roles_config' },
});

export type IActivityRolesConfig = DocumentType<ActivityRolesConfig>;
export default ActivityRolesConfigModel;
