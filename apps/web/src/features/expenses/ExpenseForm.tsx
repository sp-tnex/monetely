import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToastStore } from '../../store/toastStore';

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

interface ExpenseFormProps {
  members: Member[];
  currency: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'food', label: 'Food & Groceries' },
  { value: 'travel', label: 'Travel & Transport' },
  { value: 'rent', label: 'Rent & Utilities' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'settlement', label: 'Settlement' },
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  members,
  currency,
  onSubmit,
  onCancel,
}) => {
  const { addToast } = useToastStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('general');
  const [paidBy, setPaidBy] = useState(members[0]?.user?._id || '');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');

  const [splitMode, setSplitMode] = useState<'equal' | 'percentage' | 'amount'>('equal');
  const [memberSplits, setMemberSplits] = useState<Record<string, { amount: number; percentage: number; isSelected: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialSplits: typeof memberSplits = {};
    members.forEach((m) => {
      if (m.user) {
        initialSplits[m.user._id] = {
          amount: 0,
          percentage: 100 / members.length,
          isSelected: true,
        };
      }
    });
    setMemberSplits(initialSplits);
  }, [members]);

  useEffect(() => {
    if (splitMode !== 'equal' || amount === '') return;

    const numAmount = Number(amount);
    const selectedUsers = Object.entries(memberSplits).filter(([_, val]) => val.isSelected);
    const count = selectedUsers.length;

    if (count === 0) return;

    const splitShare = Number((numAmount / count).toFixed(2));
    let sumShare = 0;

    const updatedSplits = { ...memberSplits };
    selectedUsers.forEach(([uid, _], idx) => {
      if (idx === count - 1) {
        updatedSplits[uid].amount = Number((numAmount - sumShare).toFixed(2));
      } else {
        updatedSplits[uid].amount = splitShare;
        sumShare += splitShare;
      }
      updatedSplits[uid].percentage = (updatedSplits[uid].amount / numAmount) * 100;
    });

    Object.entries(memberSplits).forEach(([uid, val]) => {
      if (!val.isSelected) {
        updatedSplits[uid].amount = 0;
        updatedSplits[uid].percentage = 0;
      }
    });

    setMemberSplits(updatedSplits);
  }, [amount, splitMode]);

  const handleToggleMember = (userId: string) => {
    if (splitMode !== 'equal') return;
    const currentSplit = memberSplits[userId];
    const updated = {
      ...memberSplits,
      [userId]: { ...currentSplit, isSelected: !currentSplit.isSelected },
    };

    const selectedCount = Object.values(updated).filter((v) => v.isSelected).length;
    if (selectedCount === 0) {
      addToast('At least one member must be selected for the split', 'error');
      return;
    }

    setMemberSplits(updated);
  };

  const handleSplitValueChange = (userId: string, value: string, type: 'amount' | 'percentage') => {
    const numVal = value === '' ? 0 : Number(value);
    const updated = { ...memberSplits };

    if (type === 'amount') {
      updated[userId].amount = numVal;
      if (amount !== '' && Number(amount) > 0) {
        updated[userId].percentage = (numVal / Number(amount)) * 100;
      }
    } else {
      updated[userId].percentage = numVal;
      if (amount !== '' && Number(amount) > 0) {
        updated[userId].amount = Number(((numVal / 100) * Number(amount)).toFixed(2));
      }
    }

    setMemberSplits(updated);
  };

  const handleEqualizePercentage = () => {
    if (amount === '' || Number(amount) <= 0) return;
    const numAmount = Number(amount);
    const count = members.length;
    const equalPct = 100 / count;
    const equalAmt = Number((numAmount / count).toFixed(2));
    
    let sumAmt = 0;
    const updated = { ...memberSplits };
    
    members.forEach((m, idx) => {
      if (m.user) {
        if (idx === count - 1) {
          updated[m.user._id] = {
            amount: Number((numAmount - sumAmt).toFixed(2)),
            percentage: equalPct,
            isSelected: true,
          };
        } else {
          updated[m.user._id] = {
            amount: equalAmt,
            percentage: equalPct,
            isSelected: true,
          };
          sumAmt += equalAmt;
        }
      }
    });
    setMemberSplits(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      addToast('Description is required', 'error');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      addToast('Please enter a positive amount', 'error');
      return;
    }

    const numAmount = Number(amount);
    const splitsPayload: { userId: string; amountOwed: number; percentage?: number }[] = [];

    let totalOwedSum = 0;
    let totalPercentageSum = 0;

    Object.entries(memberSplits).forEach(([uid, val]) => {
      splitsPayload.push({
        userId: uid,
        amountOwed: Number(val.amount.toFixed(2)),
        percentage: Number(val.percentage.toFixed(1)),
      });
      totalOwedSum += val.amount;
      totalPercentageSum += val.percentage;
    });

    if (splitMode === 'percentage') {
      if (Math.abs(totalPercentageSum - 100) > 0.5) {
        addToast(`Split percentages must total 100% (currently ${totalPercentageSum.toFixed(1)}%)`, 'error');
        return;
      }
    }

    if (Math.abs(totalOwedSum - numAmount) > 0.05) {
      addToast(`Split amounts (${currency} ${totalOwedSum.toFixed(2)}) must sum up to the total amount (${currency} ${numAmount.toFixed(2)})`, 'error');
      return;
    }

    const diff = numAmount - totalOwedSum;
    if (Math.abs(diff) > 0 && splitsPayload.length > 0) {
      splitsPayload[0].amountOwed = Number((splitsPayload[0].amountOwed + diff).toFixed(2));
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: numAmount,
        description: description.trim(),
        category,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
        paidBy,
        splits: splitsPayload,
      });
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to submit expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Description"
          placeholder="e.g. Flight tickets, Groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border-border/60 bg-background/30 focus:bg-background transition-all"
        />
        <Input
          label={`Amount (${currency})`}
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount === '' ? '' : amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={isSubmitting}
          className="rounded-xl border-border/60 bg-background/30 focus:bg-background transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Category"
          options={CATEGORIES}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border-border/60 bg-background/30 focus:bg-background transition-all"
        />
        <Select
          label="Paid By"
          options={members.map((m) => ({
            value: m.user?._id || '',
            label: m.user?.username || 'Unknown',
          }))}
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border-border/60 bg-background/30 focus:bg-background transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border-border/60 bg-background/30 focus:bg-background transition-all"
        />
        <Input
          label="Notes (Optional)"
          placeholder="e.g. Split with roomies, booking ref X"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          className="rounded-xl border-border/60 bg-background/30 focus:bg-background transition-all"
        />
      </div>

      <div className="border-t border-border/40 pt-4 flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
            Split Settings
          </label>
          <div className="flex bg-secondary/40 backdrop-blur p-0.5 border border-border/50 rounded-xl select-none">
            {(['equal', 'percentage', 'amount'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSplitMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                  splitMode === mode
                    ? 'bg-card text-foreground shadow-sm font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
          {members.map((member) => {
            if (!member.user) return null;
            const uid = member.user._id;
            const val = memberSplits[uid] || { amount: 0, percentage: 0, isSelected: false };

            return (
              <div
                key={uid}
                className={`flex justify-between items-center p-3.5 rounded-xl border transition-all ${
                  splitMode === 'equal' && val.isSelected
                    ? 'border-primary/25 bg-primary/5 dark:bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-card/30 backdrop-blur-sm hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  {splitMode === 'equal' && (
                    <input
                      type="checkbox"
                      checked={val.isSelected}
                      onChange={() => handleToggleMember(uid)}
                      className="rounded text-primary focus:ring-primary h-4 w-4 border-border/80 shrink-0 cursor-pointer"
                    />
                  )}
                  <span className="text-sm font-semibold text-foreground">{member.user.username}</span>
                </div>

                <div className="flex items-center gap-2">
                  {splitMode === 'equal' ? (
                    <span className="text-sm font-bold text-muted-foreground">
                      {currency} {val.amount.toFixed(2)}
                    </span>
                  ) : splitMode === 'percentage' ? (
                    <div className="flex items-center gap-1.5 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="0"
                        value={val.percentage === 0 ? '' : val.percentage}
                        onChange={(e) => handleSplitValueChange(uid, e.target.value, 'percentage')}
                        className="w-full text-right py-1 px-2 border border-border/80 bg-background/50 text-xs font-semibold rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="text-xs text-muted-foreground font-semibold">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={val.amount === 0 ? '' : val.amount}
                        onChange={(e) => handleSplitValueChange(uid, e.target.value, 'amount')}
                        className="w-full text-right py-1 px-2 border border-border/80 bg-background/50 text-xs font-semibold rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {splitMode !== 'equal' && (
          <button
            type="button"
            onClick={handleEqualizePercentage}
            className="self-end text-xs text-primary font-bold hover:underline cursor-pointer select-none"
          >
            Reset to Equal Splits
          </button>
        )}
      </div>

      <div className="flex gap-3 justify-end border-t border-border/40 pt-4 mt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-xl px-5 border-border/80 font-semibold text-xs py-2.5">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="rounded-xl px-5 font-semibold text-xs py-2.5">
          Record Expense
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
