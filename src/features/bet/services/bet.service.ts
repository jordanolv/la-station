import { BetRepository } from '../repositories/bet.repository';
import { IBet } from '../models/bet.model';
import { UserService } from '../../user/services/user.service';
import UserModel from '../../user/models/user.model';

export class BetService {
  static async placeBet(
    betId: string,
    userId: string,
    optionIndex: number,
    amount: number,
  ): Promise<{ success: boolean; message: string; bet?: IBet }> {
    const bet = await BetRepository.findById(betId);
    if (!bet) return { success: false, message: 'Bet introuvable.' };
    if (bet.status !== 'open') return { success: false, message: 'Les paris sont fermés.' };
    if (optionIndex < 0 || optionIndex >= bet.options.length) return { success: false, message: 'Option invalide.' };
    if (amount < 1) return { success: false, message: 'La mise minimum est de 1 coin.' };

    if (bet.entries.some(e => e.userId === userId)) {
      return { success: false, message: 'Tu as déjà misé sur ce bet.' };
    }

    const user = await UserModel.findOne({ discordId: userId });
    if (!user) return { success: false, message: 'Utilisateur introuvable.' };
    if (user.profil.money < amount) {
      return { success: false, message: `Solde insuffisant. Tu as **${user.profil.money.toLocaleString('fr-FR')} coins**.` };
    }

    await UserService.updateUserMoney(userId, -amount);
    const updated = await BetRepository.addEntry(betId, userId, optionIndex, amount);
    return { success: true, message: 'Pari enregistré !', bet: updated ?? undefined };
  }

  static async lockBet(betId: string): Promise<{ success: boolean; message: string; bet?: IBet }> {
    const bet = await BetRepository.findById(betId);
    if (!bet) return { success: false, message: 'Bet introuvable.' };
    if (bet.status !== 'open') return { success: false, message: 'Ce bet n\'est pas ouvert.' };

    const updated = await BetRepository.setStatus(betId, 'locked');
    return { success: true, message: 'Paris verrouillés.', bet: updated ?? undefined };
  }

  static async closeBet(
    betId: string,
    winnerIndex: number,
  ): Promise<{ success: boolean; message: string; bet?: IBet; payouts?: { userId: string; amount: number; gain: number }[] }> {
    const bet = await BetRepository.findById(betId);
    if (!bet) return { success: false, message: 'Bet introuvable.' };
    if (bet.status === 'closed' || bet.status === 'refunded') return { success: false, message: 'Ce bet est déjà terminé.' };
    if (winnerIndex < 0 || winnerIndex >= bet.options.length) return { success: false, message: 'Option invalide.' };

    const totalPot = bet.options.reduce((sum, o) => sum + o.totalAmount, 0);
    const winnerPot = bet.options[winnerIndex].totalAmount;
    const loserPot = totalPot - winnerPot;
    const rake = Math.floor(loserPot * bet.rakePercent / 100);
    const redistributable = loserPot - rake;

    const winners = bet.entries.filter(e => e.optionIndex === winnerIndex);

    if (winnerPot === 0) {
      const refundResult = await this.refundBet(betId);
      return { ...refundResult, payouts: [] };
    }

    const payouts: { userId: string; amount: number; gain: number }[] = [];
    for (const entry of winners) {
      const gain = Math.floor((entry.amount / winnerPot) * redistributable);
      const total = entry.amount + gain;
      payouts.push({ userId: entry.userId, amount: total, gain });
      await UserService.updateUserMoney(entry.userId, total);
    }

    const updated = await BetRepository.setStatus(betId, 'closed', winnerIndex);
    return { success: true, message: 'Bet terminé.', bet: updated ?? undefined, payouts };
  }

  static async refundBet(betId: string): Promise<{ success: boolean; message: string; bet?: IBet }> {
    const bet = await BetRepository.findById(betId);
    if (!bet) return { success: false, message: 'Bet introuvable.' };
    if (bet.status === 'closed' || bet.status === 'refunded') return { success: false, message: 'Ce bet est déjà terminé.' };

    for (const entry of bet.entries) {
      await UserService.updateUserMoney(entry.userId, entry.amount);
    }

    const updated = await BetRepository.setStatus(betId, 'refunded');
    return { success: true, message: 'Paris remboursés.', bet: updated ?? undefined };
  }

  static getOddsMultiplier(bet: IBet, optionIndex: number): number {
    const totalPot = bet.options.reduce((sum, o) => sum + o.totalAmount, 0);
    const optionTotal = bet.options[optionIndex].totalAmount;
    if (optionTotal === 0 || totalPot === optionTotal) return 1;
    const loserPot = totalPot - optionTotal;
    const rake = loserPot * bet.rakePercent / 100;
    const redistributable = loserPot - rake;
    return 1 + redistributable / optionTotal;
  }
}
