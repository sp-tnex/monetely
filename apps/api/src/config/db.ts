import mongoose from 'mongoose';
import { env } from './index';
import { User } from '../modules/users/user.model';

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB Connected');

    const currencyResult = await User.updateMany(
      { defaultCurrency: { $exists: false } },
      { $set: { defaultCurrency: 'USD' } }
    );
    const timezoneResult = await User.updateMany(
      { timezone: { $exists: false } },
      { $set: { timezone: 'UTC' } }
    );

    if (currencyResult.modifiedCount > 0 || timezoneResult.modifiedCount > 0) {
      console.log(`Migrated user preferences: populated currency for ${currencyResult.modifiedCount} users, timezone for ${timezoneResult.modifiedCount} users.`);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
