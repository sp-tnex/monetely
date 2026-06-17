import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  gravatarEmail?: string;
  theme: 'light' | 'dark';
  darkPalette?: 'midnight' | 'charcoal' | 'forest' | 'amethyst' | 'custom';
  customColors?: {
    background: string;
    card: string;
    border: string;
    primary: string;
  };
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  retentionPolicy: 'FOREVER' | 'SIX_MONTHS' | 'ONE_YEAR' | 'TWO_YEARS' | 'FIVE_YEARS';
  autoArchiveEnabled: boolean;
  notifyBeforeDeletion: boolean;
  exportBeforeDeletion: boolean;
  allowPermanentDeletion: boolean;
  monthlyBudget?: number;
  defaultCurrency: string;
  timezone: string;
  language: string;
  notificationPreferences: {
    push: boolean;
    system: boolean;
  };
  webhook: {
    url: string;
    enabled: boolean;
    secret: string;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  gravatarEmail: { type: String, lowercase: true },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  darkPalette: {
    type: String,
    enum: ['midnight', 'charcoal', 'forest', 'amethyst', 'custom'],
    default: 'midnight'
  },
  customColors: {
    background: { type: String, default: '222 47% 11%' },
    card: { type: String, default: '222 47% 15%' },
    border: { type: String, default: '222 30% 22%' },
    primary: { type: String, default: '250 84% 60%' },
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  retentionPolicy: {
    type: String,
    enum: ['FOREVER', 'SIX_MONTHS', 'ONE_YEAR', 'TWO_YEARS', 'FIVE_YEARS'],
    default: 'FOREVER'
  },
  autoArchiveEnabled: { type: Boolean, default: true },
  notifyBeforeDeletion: { type: Boolean, default: true },
  exportBeforeDeletion: { type: Boolean, default: true },
  allowPermanentDeletion: { type: Boolean, default: false },
  monthlyBudget: { type: Number, default: 0 },
  defaultCurrency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' },
  language: { type: String, default: 'en' },
  notificationPreferences: {
    push: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
  },
  webhook: {
    url: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    secret: { type: String }
  },
}, { timestamps: true });

UserSchema.pre<IUser>('save', async function (next) {
  if (this.isNew && (!this.webhook || !this.webhook.secret)) {
    this.webhook = {
      url: this.webhook?.url || '',
      enabled: this.webhook?.enabled || false,
      secret: crypto.randomBytes(24).toString('hex')
    };
  }
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
