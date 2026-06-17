import mongoose, { Schema, Document } from 'mongoose';

export interface IMonthClosing extends Document {
  group: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  closedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
}

const MonthClosingSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: { type: String, enum: ['OPEN', 'CLOSED', 'LOCKED'], default: 'OPEN' },
  closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  closedAt: { type: Date },
}, { timestamps: true });

// Make group/month/year combination unique
MonthClosingSchema.index({ group: 1, month: 1, year: 1 }, { unique: true });

export const MonthClosing = mongoose.model<IMonthClosing>('MonthClosing', MonthClosingSchema);


export interface IMonthlySnapshot extends Document {
  group: mongoose.Types.ObjectId;
  month: number;
  year: number;
  totalSpent: number;
  totalExpenses: number;
  topCategory: string;
  topSpender: string;
  categorySummary: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  memberSummary: Array<{
    user: mongoose.Types.ObjectId;
    username: string;
    paid: number;
    owed: number;
    received: number;
  }>;
  budgetStatus: 'WITHIN_BUDGET' | 'OVER_BUDGET' | 'NO_BUDGET';
  isImmutable: boolean;
  createdAt: Date;
}

const MonthlySnapshotSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  totalSpent: { type: Number, required: true },
  totalExpenses: { type: Number, required: true },
  topCategory: { type: String, required: true },
  topSpender: { type: String, required: true },
  categorySummary: [{
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    percentage: { type: Number, required: true }
  }],
  memberSummary: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    paid: { type: Number, default: 0 },
    owed: { type: Number, default: 0 },
    received: { type: Number, default: 0 }
  }],
  budgetStatus: {
    type: String,
    enum: ['WITHIN_BUDGET', 'OVER_BUDGET', 'NO_BUDGET'],
    default: 'NO_BUDGET'
  },
  isImmutable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

MonthlySnapshotSchema.index({ group: 1, month: 1, year: 1 }, { unique: true });

export const MonthlySnapshot = mongoose.model<IMonthlySnapshot>('MonthlySnapshot', MonthlySnapshotSchema);
