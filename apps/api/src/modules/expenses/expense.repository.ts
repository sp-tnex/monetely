import { BaseRepository } from '../../core/repositories/BaseRepository';
import { Expense, IExpense } from './expense.model';

export class ExpenseRepository extends BaseRepository<IExpense> {
  constructor() {
    super(Expense);
  }
}

export const expenseRepository = new ExpenseRepository();
