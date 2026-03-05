import UserMountainsModel, { IUserMountainsDoc } from '../models/user-mountains.model';
import type { MountainRarity } from '../types/mountain.types';
import { FRAGMENTS_PER_TICKET, MOUNTAIN_TICKET_SECONDS } from '../constants/mountain.constants';

export interface UnlockedMountainEntry {
  mountainId: string;
  unlockedAt: Date;
  rarity: MountainRarity;
}

export class UserMountainsRepository {
  static async getByUserId(userId: string): Promise<IUserMountainsDoc | null> {
    return UserMountainsModel.findOne({ userId });
  }

  static async getOrCreate(userId: string): Promise<IUserMountainsDoc> {
    let doc = await this.getByUserId(userId);
    if (!doc) {
      doc = new UserMountainsModel({ userId, unlockedMountains: [], packTickets: 0, fragments: 0, vocSecondsAccumulated: 0 });
      await doc.save();
    }
    return doc;
  }

  static async isUnlocked(userId: string, mountainId: string): Promise<boolean> {
    const doc = await this.getByUserId(userId);
    return doc?.unlockedMountains.some(m => m.mountainId === mountainId) ?? false;
  }

  /**
   * Débloque une montagne.
   * Retourne null si déjà débloquée (doublon → fragments à gérer côté appelant).
   */
  static async unlock(
    userId: string,
    mountainId: string,
    rarity: MountainRarity,
  ): Promise<{ totalUnlocked: number } | null> {
    const doc = await this.getOrCreate(userId);

    if (doc.unlockedMountains.some(m => m.mountainId === mountainId)) {
      return null;
    }

    doc.unlockedMountains.push({ mountainId, unlockedAt: new Date(), rarity });
    await doc.save();

    return { totalUnlocked: doc.unlockedMountains.length };
  }

  /** Ajoute des fragments. Convertit automatiquement les paliers de 20 en tickets. */
  static async addFragments(userId: string, amount: number): Promise<{ newFragments: number; ticketsGained: number }> {
    const doc = await this.getOrCreate(userId);

    doc.fragments += amount;
    const ticketsGained = Math.floor(doc.fragments / FRAGMENTS_PER_TICKET);
    if (ticketsGained > 0) {
      doc.fragments = doc.fragments % FRAGMENTS_PER_TICKET;
      doc.packTickets += ticketsGained;
    }
    doc.markModified('fragments');
    doc.markModified('packTickets');
    await doc.save();

    return { newFragments: doc.fragments, ticketsGained };
  }

  /** Ajoute des tickets directement. */
  static async addTickets(userId: string, amount: number): Promise<void> {
    const doc = await this.getOrCreate(userId);
    doc.packTickets += amount;
    await doc.save();
  }

  /**
   * Consomme 1 ticket pour ouvrir un pack.
   * Retourne false si pas assez de tickets.
   */
  static async spendTicket(userId: string): Promise<boolean> {
    const doc = await this.getOrCreate(userId);
    if (doc.packTickets <= 0) return false;
    doc.packTickets -= 1;
    await doc.save();
    return true;
  }

  /**
   * Ajoute du temps vocal et retourne le nombre de tickets gagnés (1 par MOUNTAIN_TICKET_SECONDS).
   */
  static async addVocSeconds(userId: string, seconds: number): Promise<{ ticketsGained: number }> {
    const doc = await this.getOrCreate(userId);

    doc.vocSecondsAccumulated += seconds;
    const ticketsGained = Math.floor(doc.vocSecondsAccumulated / MOUNTAIN_TICKET_SECONDS);
    if (ticketsGained > 0) {
      doc.vocSecondsAccumulated = doc.vocSecondsAccumulated % MOUNTAIN_TICKET_SECONDS;
      doc.packTickets += ticketsGained;
    }
    doc.markModified('vocSecondsAccumulated');
    doc.markModified('packTickets');
    await doc.save();

    return { ticketsGained };
  }

  /** Transfère une montagne d'un user à un autre (pour les échanges). */
  static async transferMountain(
    fromUserId: string,
    toUserId: string,
    mountainId: string,
  ): Promise<boolean> {
    const fromDoc = await this.getByUserId(fromUserId);
    if (!fromDoc) return false;

    const idx = fromDoc.unlockedMountains.findIndex(m => m.mountainId === mountainId);
    if (idx === -1) return false;

    const [entry] = fromDoc.unlockedMountains.splice(idx, 1);
    fromDoc.markModified('unlockedMountains');
    await fromDoc.save();

    const toDoc = await this.getOrCreate(toUserId);
    if (!toDoc.unlockedMountains.some(m => m.mountainId === mountainId)) {
      toDoc.unlockedMountains.push(entry);
      await toDoc.save();
    }

    return true;
  }

  static async getUnlocked(userId: string): Promise<UnlockedMountainEntry[]> {
    const doc = await this.getByUserId(userId);
    return (doc?.unlockedMountains ?? []).map(m => ({
      mountainId: m.mountainId,
      unlockedAt: m.unlockedAt,
      rarity: (m.rarity as MountainRarity) ?? 'common',
    }));
  }
}
