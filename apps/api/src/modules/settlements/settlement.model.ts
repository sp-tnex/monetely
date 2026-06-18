import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  group: mongoose.Types.ObjectId;
  payer: mongoose.Types.ObjectId;      // Debtor
  recipient: mongoose.Types.ObjectId;  // Creditor
  debtor?: mongoose.Types.ObjectId;    // Alias for payer
  creditor?: mongoose.Types.ObjectId;  // Alias for recipient
  amount: number;
  date: Date;
  status: 'Pending' | 'Requested' | 'Paid' | 'Confirmed' | 'Disputed';
  paymentProof?: string;
  utrNumber?: string;
  paidAt?: Date;
  confirmedAt?: Date;
  notes?: string;
}

const SettlementSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  payer: { type: Schema.Types.ObjectId, ref: 'User', required: true, alias: 'debtor' },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, alias: 'creditor' },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Requested', 'Paid', 'Confirmed', 'Disputed'],
    default: 'Pending'
  },
  paymentProof: { type: String },
  utrNumber: { type: String },
  paidAt: { type: Date },
  confirmedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

SettlementSchema.index({ group: 1, date: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
