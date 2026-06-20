import { Request, Response } from 'express';
import { expenseService } from './expense.service';

export class ExpenseController {
  async addExpense(req: Request, res: Response) {
    const expense = await expenseService.addExpense(req.params.groupId as string, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { expense } });
  }

  async getGroupExpenses(req: Request, res: Response) {
    const result = await expenseService.getGroupExpenses(req.params.groupId as string, req.user.id, req.query);
    res.status(200).json({ status: 'success', data: result });
  }

  async getExpenseDetails(req: Request, res: Response) {
    const expense = await expenseService.getExpenseById(req.params.id as string, req.user.id);
    res.status(200).json({ status: 'success', data: { expense } });
  }

  async updateExpense(req: Request, res: Response) {
    const expense = await expenseService.updateExpense(req.params.groupId as string, req.params.id as string, req.user.id, req.body);
    res.status(200).json({ status: 'success', data: { expense } });
  }

  async deleteExpense(req: Request, res: Response) {
    await expenseService.deleteExpense(req.params.groupId as string, req.params.id as string, req.user.id);
    res.status(200).json({ status: 'success', message: 'Expense deleted successfully' });
  }
}

export const expenseController = new ExpenseController();
