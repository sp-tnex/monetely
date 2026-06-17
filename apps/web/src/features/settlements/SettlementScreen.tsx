import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Check, ArrowRight, Wallet, Info, History } from 'lucide-react';
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

interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

interface SettlementHistoryItem {
  _id: string;
  payer: {
    _id: string;
    username: string;
    avatarUrl?: string;
  } | string;
  recipient: {
    _id: string;
    username: string;
    avatarUrl?: string;
  } | string;
  amount: number;
  date: string;
  notes?: string;
}

interface SettlementScreenProps {
  transactions: SettlementTransaction[];
  members: Member[];
  currency: string;
  onRecordSettlement: (from: string, to: string, amount: number) => Promise<void>;
  history?: SettlementHistoryItem[];
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
  transactions,
  members,
  currency,
  onRecordSettlement,
  history = [],
}) => {
  const { addToast } = useToastStore();
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const userMap = members.reduce((acc, m) => {
    if (m.user) acc[m.user._id] = m.user.username;
    return acc;
  }, {} as Record<string, string>);

  const getUsername = (userId: string) => {
    return userMap[userId] || 'Unknown User';
  };

  const handleSettle = async (tx: SettlementTransaction, index: number) => {
    const txId = `${tx.from}-${tx.to}-${index}`;
    setSettlingId(txId);
    try {
      await onRecordSettlement(tx.from, tx.to, tx.amount);
      addToast(`Recorded payment: ${getUsername(tx.from)} paid ${getUsername(tx.to)} ${currency} ${tx.amount.toFixed(2)}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to record settlement payment', 'error');
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-border">
        <CardHeader className="py-4 px-5 border-b border-border bg-secondary/10">
          <CardTitle className="text-sm font-semibold text-foreground">Debt Optimization Engine</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            These are the calculated minimum transactions to settle all debts inside this group.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="p-3 rounded-full bg-secondary text-green-600 border border-border mb-3 select-none">
                <Check size={24} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Everyone is settled up!</h3>
              <p className="text-muted-foreground text-xs max-w-xs mt-0.5">
                No debts or balances require settlement in this group currently. Nice job!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    <th className="py-3 px-5">From (Debtor)</th>
                    <th className="py-3 px-2 text-center"></th>
                    <th className="py-3 px-5">To (Creditor)</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transactions.map((tx, idx) => {
                    const txId = `${tx.from}-${tx.to}-${idx}`;
                    return (
                      <tr key={txId} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-3 px-5 font-semibold text-destructive">
                          {getUsername(tx.from)}
                        </td>
                        <td className="py-3 px-2 text-center text-muted-foreground select-none">
                          <ArrowRight size={12} className="inline" />
                        </td>
                        <td className="py-3 px-5 font-semibold text-green-600">
                          {getUsername(tx.to)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-medium text-foreground">
                          {currency} {tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <Button
                            size="sm"
                            isLoading={settlingId === txId}
                            onClick={() => handleSettle(tx, idx)}
                            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold py-1 px-2.5 rounded h-7 shadow-none"
                          >
                            <Wallet size={11} />
                            Settle Debt
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="py-4 px-5 border-b border-border bg-secondary/10">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <History className="h-4 w-4 text-gray-500" />
            Settlement Payment History
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            History of direct peer-to-peer settlement payments recorded in this group.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="text-center py-10 px-4 text-muted-foreground text-xs">
              No settlements recorded in this group yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">From</th>
                    <th className="py-3 px-2 text-center"></th>
                    <th className="py-3 px-5">To</th>
                    <th className="py-3 px-5">Notes</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((item) => {
                    const payerName = typeof item.payer === 'object' && item.payer ? item.payer.username : 'Someone';
                    const recipientName = typeof item.recipient === 'object' && item.recipient ? item.recipient.username : 'Someone';
                    const formattedDate = new Date(item.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    return (
                      <tr key={item._id} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-3 px-5 text-muted-foreground font-mono">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-5 font-semibold text-foreground">
                          {payerName}
                        </td>
                        <td className="py-3 px-2 text-center text-muted-foreground select-none">
                          <ArrowRight size={12} className="inline" />
                        </td>
                        <td className="py-3 px-5 font-semibold text-foreground">
                          {recipientName}
                        </td>
                        <td className="py-3 px-5 text-muted-foreground italic max-w-[120px] truncate" title={item.notes}>
                          {item.notes || '—'}
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-medium text-foreground">
                          {currency} {item.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-3.5 bg-secondary/30 rounded-lg border border-border text-xs text-muted-foreground flex gap-2.5 leading-relaxed items-start">
        <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-foreground">How settlement calculations work:</strong> Monetely utilizes a debt minimization algorithm (inspired by maximum flow optimization). Rather than recording 10 separate small transactions between everyone, the system consolidates all group debts into the absolute minimum number of direct payments required to balance the books. Click <span className="font-semibold text-foreground">Settle Debt</span> to offset their balances.
        </div>
      </div>
    </div>
  );
};
export default SettlementScreen;
