import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Settlement, ISettlement } from './settlement.model';

export class SettlementRepository extends BaseRepository<ISettlement> {
  constructor() {
    super(Settlement);
  }
}

export const settlementRepository = new SettlementRepository();
