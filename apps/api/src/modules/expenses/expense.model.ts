import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseSplit {
  user: mongoose.Types.ObjectId;
  amountOwed: number;
  percentage?: number;
}

export interface IExpense extends Document {
  group: mongoose.Types.ObjectId;
  paidBy: mongoose.Types.ObjectId;
  amount: number;
  description: string;
  category: string;
  date: Date;
  notes?: string;
  splits: IExpenseSplit[];
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}

const ExpenseSplitSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amountOwed: { type: Number, required: true },
  percentage: { type: Number },
});

const ExpenseSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'general' },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  splits: [ExpenseSplitSchema],
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], default: 'ACTIVE' }
}, { timestamps: true });

// Optimize query performance with indexes
ExpenseSchema.index({ group: 1, date: -1 });
ExpenseSchema.index({ paidBy: 1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ status: 1, date: -1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
