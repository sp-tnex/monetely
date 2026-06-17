import mongoose from 'mongoose';
import { env } from '../config';
import { User } from '../modules/users/user.model';
import { Group, GroupMember } from '../modules/groups/group.model';
import { Expense } from '../modules/expenses/expense.model';
import { Settlement } from '../modules/settlements/settlement.model';
import { Notification } from '../modules/notifications/notification.model';

const seed = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected.');

    console.log('Clearing old data...');
    await User.deleteMany({});
    await Group.deleteMany({});
    await GroupMember.deleteMany({});
    await Expense.deleteMany({});
    await Settlement.deleteMany({});
    await Notification.deleteMany({});

    console.log('Creating mock users...');
    const user1 = await User.create({
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'password123', 
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'
    });

    const user2 = await User.create({
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: 'password123',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'
    });

    const user3 = await User.create({
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: 'password123',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie'
    });

    console.log('Creating mock groups...');
    const group = await Group.create({
      name: 'Europe Trip 2026',
      description: 'Shared expenses for our backpacking trip',
      currency: 'USD',
      createdBy: user1._id
    });

    console.log('Adding group members...');
    await GroupMember.create({
      group: group._id,
      user: user1._id,
      role: 'OWNER'
    });

    await GroupMember.create({
      group: group._id,
      user: user2._id,
      role: 'MEMBER'
    });

    await GroupMember.create({
      group: group._id,
      user: user3._id,
      role: 'MEMBER'
    });

    console.log('Adding mock expenses...');
    const expense1 = await Expense.create({
      group: group._id,
      paidBy: user1._id,
      amount: 90,
      description: 'Dinner at Paris Bistro',
      category: 'food',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      splits: [
        { user: user1._id, amountOwed: 30 },
        { user: user2._id, amountOwed: 30 },
        { user: user3._id, amountOwed: 30 }
      ]
    });

    const expense2 = await Expense.create({
      group: group._id,
      paidBy: user2._id,
      amount: 60,
      description: 'Train tickets to Brussels',
      category: 'transport',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      splits: [
        { user: user2._id, amountOwed: 30 },
        { user: user3._id, amountOwed: 30 }
      ]
    });

    console.log('Adding mock settlements...');
    await Settlement.create({
      group: group._id,
      payer: user3._id,
      recipient: user2._id,
      amount: 20,
      notes: 'Settling partial train ticket debt'
    });

    console.log('Creating mock notifications...');
    await Notification.create({
      user: user2._id,
      message: 'Alice added an expense: Dinner at Paris Bistro',
      type: 'EXPENSE_ADDED',
      isRead: false,
      metadata: { groupId: group._id, expenseId: expense1._id }
    });

    await Notification.create({
      user: user3._id,
      message: 'Bob added an expense: Train tickets to Brussels',
      type: 'EXPENSE_ADDED',
      isRead: false,
      metadata: { groupId: group._id, expenseId: expense2._id }
    });

    console.log('🌱 Seeding database complete.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

seed();
