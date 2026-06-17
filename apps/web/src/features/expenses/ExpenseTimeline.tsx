import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Search, Trash2, FileText, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Member {
  _id: string;
  user: {
    _id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

interface Split {
  user: any;
  amountOwed: number;
  percentage?: number;
}

interface Expense {
  _id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  notes?: string;
  paidBy: any;
  splits: Split[];
}

interface ExpenseTimelineProps {
  expenses: Expense[];
  members: Member[];
  currentUserId: string;
  currency: string;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

export const ExpenseTimeline: React.FC<ExpenseTimelineProps> = ({
  expenses,
  members,
  currentUserId,
  currency,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Map user IDs to usernames for easy lookup
  const userMap = members.reduce((acc, m) => {
    if (m.user) acc[m.user._id] = m.user.username;
    return acc;
  }, {} as Record<string, string>);

  const getUsername = (userIdOrObj: any) => {
    if (!userIdOrObj) return 'Unknown User';
    if (typeof userIdOrObj === 'object') {
      return userIdOrObj.username || userMap[userIdOrObj._id] || 'Unknown User';
    }
    return userMap[userIdOrObj] || 'Unknown User';
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(expenses.map((e) => e.category)))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search expenses by description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-2 items-center overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 uppercase tracking-wider hidden md:inline">
            Filter:
          </span>
          <div className="flex gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border border-border cursor-pointer transition-all capitalize shrink-0',
                  selectedCategory === cat
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <Card className="border-dashed border-border py-12 flex flex-col items-center justify-center text-center">
          <div className="p-3 rounded-full bg-secondary text-muted-foreground mb-3">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No expenses recorded</h3>
          <p className="text-muted-foreground text-xs max-w-xs mt-0.5">
            {searchQuery || selectedCategory !== 'all'
              ? 'No matching expenses for the active filters.'
              : 'Add shared receipts or bills to begin sharing costs.'}
          </p>
        </Card>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                <th className="py-3 px-4 hidden md:table-cell">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 hidden sm:table-cell">Date</th>
                <th className="py-3 px-4">Paid By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Your Share</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredExpenses.map((expense) => {
                const payerId = typeof expense.paidBy === 'object' && expense.paidBy !== null ? expense.paidBy._id : expense.paidBy;
                const isPayer = payerId === currentUserId;
                const mySplit = expense.splits.find((s) => {
                  const splitUserId = typeof s.user === 'object' && s.user !== null ? (s.user as any)._id : s.user;
                  return splitUserId === currentUserId;
                });
                const amtOwed = mySplit ? mySplit.amountOwed : 0;

                let balanceText: string;
                let balanceColor = 'text-muted-foreground';

                if (isPayer) {
                  const sharedAmount = expense.amount - (mySplit?.amountOwed || 0);
                  balanceText = `Lent ${currency} ${sharedAmount.toFixed(2)}`;
                  balanceColor = 'text-green-600 font-semibold';
                } else if (amtOwed > 0) {
                  balanceText = `Owe ${currency} ${amtOwed.toFixed(2)}`;
                  balanceColor = 'text-destructive font-semibold';
                } else {
                  balanceText = '—';
                }

                return (
                  <tr key={expense._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 hidden md:table-cell capitalize">
                      <span className="inline-block px-2 py-0.5 rounded bg-secondary border border-border/80 text-[10px] font-medium text-muted-foreground">
                        {expense.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[150px] sm:max-w-[200px]" title={expense.description}>
                          {expense.description}
                        </span>
                        {expense.notes && (
                          <span className="group/notes relative cursor-help text-muted-foreground hover:text-foreground">
                            <FileText size={12} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/notes:block bg-card border border-border p-2 rounded text-[10px] shadow-sm max-w-xs z-30 w-44 text-foreground text-left leading-normal font-normal">
                              {expense.notes}
                            </div>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground font-mono">
                      {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {getUsername(expense.paidBy)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                      {currency} {expense.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <span className={balanceColor}>{balanceText}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <div className="relative group/splits">
                          <button
                            className="px-1.5 py-0.5 rounded border border-border bg-white text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-gray-400 cursor-help"
                          >
                            Splits
                          </button>
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/splits:block bg-card border border-border p-2.5 rounded-lg shadow-sm z-30 w-48 text-left">
                            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 pb-1 border-b border-border">
                              Split Breakdown
                            </h5>
                            <div className="flex flex-col gap-1">
                              {expense.splits.map((s, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] text-foreground">
                                  <span className="font-medium truncate max-w-[90px]">
                                    {getUsername(s.user)}
                                  </span>
                                  <span className="text-muted-foreground font-mono text-[9px]">
                                    {currency} {s.amountOwed.toFixed(2)}
                                    {s.percentage !== undefined && ` (${s.percentage}%)`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          className="p-1 rounded text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => onDeleteExpense(expense._id)}
                          title="Delete expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default ExpenseTimeline;
