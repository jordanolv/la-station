import UserMountainsModel, { IUserMountainsDoc } from '../models/user-mountains.model';
import type { MountainRarity, PackTier } from '../types/peak-hunters.types';
import { FRAGMENTS_PER_TICKET, MOUNTAIN_TICKET_SECONDS, TICKET_TIER_CHANCES, rollPackTier } from '../constants/peak-hunters.constants';

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
      doc = new UserMountainsModel({ userId, unlockedMountains: [], sentierTickets: 0, falaiseTickets: 0, sommetTickets: 0, fragments: 0, vocSecondsAccumulated: 0 });
      await doc.save();
    }
    doc.falaiseTickets ??= 0;
    doc.sommetTickets ??= 0;
    doc.fragments ??= 0;
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
      doc.sentierTickets += ticketsGained;
    }
    doc.markModified('fragments');
    doc.markModified('sentierTickets');
    await doc.save();

    return { newFragments: doc.fragments, ticketsGained };
  }

  /** Ajoute des tickets directement (standard par défaut). */
  static async addTickets(userId: string, amount: number, tier: PackTier = 'sentier'): Promise<void> {
    const doc = await this.getOrCreate(userId);
    if (tier === 'falaise') doc.falaiseTickets += amount;
    else if (tier === 'sommet') doc.sommetTickets += amount;
    else doc.sentierTickets += amount;
    await doc.save();
  }

  static async addTicketsToAll(amount: number, tier: PackTier = 'sentier'): Promise<number> {
    const field = tier === 'falaise' ? 'falaiseTickets' : tier === 'sommet' ? 'sommetTickets' : 'sentierTickets';
    const result = await UserMountainsModel.updateMany({}, { $inc: { [field]: amount } });
    return result.modifiedCount;
  }

  /**
   * Consomme 1 ticket pour ouvrir un pack.
   * Retourne false si pas assez de tickets.
   */
  static async spendTicket(userId: string, tier: PackTier = 'sentier'): Promise<boolean> {
    const doc = await this.getOrCreate(userId);
    if (tier === 'falaise') {
      if (doc.falaiseTickets <= 0) return false;
      doc.falaiseTickets -= 1;
    } else if (tier === 'sommet') {
      if (doc.sommetTickets <= 0) return false;
      doc.sommetTickets -= 1;
    } else {
      if (doc.sentierTickets <= 0) return false;
      doc.sentierTickets -= 1;
    }
    await doc.save();
    return true;
  }

  /**
   * Consomme N tickets pour ouvrir plusieurs packs.
   * Retourne false si pas assez de tickets.
   */
  static async spendTickets(userId: string, amount: number, tier: PackTier = 'sentier'): Promise<boolean> {
    const doc = await this.getOrCreate(userId);
    if (tier === 'falaise') {
      if (doc.falaiseTickets < amount) return false;
      doc.falaiseTickets -= amount;
    } else if (tier === 'sommet') {
      if (doc.sommetTickets < amount) return false;
      doc.sommetTickets -= amount;
    } else {
      if (doc.sentierTickets < amount) return false;
      doc.sentierTickets -= amount;
    }
    await doc.save();
    return true;
  }

  /**
   * Ajoute du temps vocal et retourne le nombre de tickets gagnés, avec leur tier.
   * Chaque ticket obtenu est rollé selon TICKET_TIER_CHANCES.
   */
  static async addVocSeconds(userId: string, seconds: number): Promise<{ ticketsGained: number; tiers: PackTier[] }> {
    const doc = await this.getOrCreate(userId);

    doc.vocSecondsAccumulated += seconds;
    const ticketsGained = Math.floor(doc.vocSecondsAccumulated / MOUNTAIN_TICKET_SECONDS);
    const tiers: PackTier[] = [];

    if (ticketsGained > 0) {
      doc.vocSecondsAccumulated = doc.vocSecondsAccumulated % MOUNTAIN_TICKET_SECONDS;
      for (let i = 0; i < ticketsGained; i++) {
        const tier = rollPackTier(TICKET_TIER_CHANCES);
        tiers.push(tier);
        if (tier === 'falaise') doc.falaiseTickets += 1;
        else if (tier === 'sommet') doc.sommetTickets += 1;
        else doc.sentierTickets += 1;
      }
    }

    doc.markModified('vocSecondsAccumulated');
    doc.markModified('sentierTickets');
    doc.markModified('falaiseTickets');
    doc.markModified('sommetTickets');
    await doc.save();

    return { ticketsGained, tiers };
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
