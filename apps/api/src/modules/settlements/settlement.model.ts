import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  group: mongoose.Types.ObjectId;
  payer: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  notes?: string;
}

const SettlementSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  payer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

SettlementSchema.index({ group: 1, date: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
