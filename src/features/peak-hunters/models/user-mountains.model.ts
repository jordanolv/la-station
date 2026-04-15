import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';
import type { MountainRarity } from '../types/peak-hunters.types';

export class UnlockedMountain {
  @prop({ required: true })
  mountainId!: string;

  @prop({ required: true })
  unlockedAt!: Date;

  @prop({ type: () => String, default: 'common' })
  rarity?: MountainRarity;
}

export class UserMountains {
  @prop({ required: true, unique: true })
  userId!: string;

  @prop({ type: () => [UnlockedMountain], default: [] })
  unlockedMountains!: UnlockedMountain[];

  /** Expéditions Sentier disponibles */
  @prop({ default: 0 })
  sentierTickets!: number;

  /** Expéditions Falaise disponibles */
  @prop({ default: 0 })
  falaiseTickets!: number;

  /** Expéditions Sommet disponibles (garantit épique ou légendaire) */
  @prop({ default: 0 })
  sommetTickets!: number;

  /** Fragments accumulés (pour convertir en tickets) */
  @prop({ default: 0 })
  fragments!: number;

  /** Secondes de vocal trackées pour le prochain ticket (remet à 0 à chaque ticket obtenu) */
  @prop({ default: 0 })
  vocSecondsAccumulated!: number;
}

const UserMountainsModel = getModelForClass(UserMountains, {
  schemaOptions: {
    timestamps: true,
    collection: 'user_mountains'
  }
});

export type IUserMountains = UserMountains;
export type IUserMountainsDoc = DocumentType<UserMountains>;
export default UserMountainsModel;
