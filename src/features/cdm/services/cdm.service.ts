import { CdmRepository } from '../repositories/cdm.repository';
import { ICdmEvent } from '../models/cdm-event.model';
import { CDM_REWARD } from '../constants/cdm.constants';
import { UserService } from '../../user/services/user.service';
import { awardExpeditions } from '../../peak-hunters/services/expedition.service';

export interface CdmWinner {
  userId: string;
  team: boolean;
  outsider: boolean;
  money: number;
  expeditions: number;
}

export class CdmService {
  static async getEvent(): Promise<ICdmEvent> {
    return CdmRepository.getOrCreate();
  }

  static async setPrediction(userId: string, field: 'team' | 'outsider', value: string) {
    const event = await CdmRepository.getOrCreate();
    if (event.status !== 'open') return event;
    return CdmRepository.setPrediction(userId, field, value);
  }

  static async setLocked(locked: boolean) {
    return CdmRepository.setStatus(locked ? 'locked' : 'open');
  }

  static async setAnnounceChannel(channelId: string) {
    return CdmRepository.setAnnounceChannel(channelId);
  }

  static async reset() {
    return CdmRepository.reset();
  }

  static async setResult(field: 'team' | 'outsider', value: string) {
    return CdmRepository.setResult(field, value);
  }

  /**
   * Clôture l'event et attribue les récompenses fixes à chaque bon pronostic.
   * Idempotent : refuse si déjà clôturé.
   */
  static async payWinners(): Promise<{
    success: boolean;
    message: string;
    event?: ICdmEvent;
    winners?: CdmWinner[];
  }> {
    const event = await CdmRepository.getOrCreate();
    if (event.status === 'closed') return { success: false, message: 'Les pronostics sont déjà clôturés.' };
    if (!event.resultTeam || !event.resultOutsider) {
      return { success: false, message: 'Définis le vainqueur **et** l\'outsider avant de payer.' };
    }

    const winners: CdmWinner[] = [];
    for (const p of event.predictions) {
      const teamOk = !!p.team && p.team === event.resultTeam;
      const outsiderOk = !!p.outsider && p.outsider === event.resultOutsider;
      if (!teamOk && !outsiderOk) continue;

      let money = 0;
      let expeditions = 0;
      if (teamOk) {
        money += CDM_REWARD.team.money;
        expeditions += CDM_REWARD.team.expeditions;
      }
      if (outsiderOk) {
        money += CDM_REWARD.outsider.money;
        expeditions += CDM_REWARD.outsider.expeditions;
      }

      await UserService.updateUserMoney(p.userId, money);
      if (expeditions > 0) await awardExpeditions(p.userId, expeditions);

      winners.push({ userId: p.userId, team: teamOk, outsider: outsiderOk, money, expeditions });
    }

    const closed = await CdmRepository.close(new Date());
    return { success: true, message: 'Pronostics clôturés et gagnants payés !', event: closed, winners };
  }
}
