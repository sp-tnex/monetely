import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../config/api';
import {
  Check,
  ArrowRight,
  Wallet,
  Info,
  History,
  QrCode,
  Copy,
  ExternalLink,
  AlertCircle,
  Send,
  XCircle,
  CheckCircle,
  TrendingDown
} from 'lucide-react';

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
  recipientUpi?: {
    upiId: string;
    upiName: string;
    upiInstructions?: string;
    upiQrUrl?: string;
  };
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
  status: 'Pending' | 'Requested' | 'Paid' | 'Confirmed' | 'Disputed';
  paymentProof?: string;
  utrNumber?: string;
  notes?: string;
}

interface SettlementScreenProps {
  transactions: SettlementTransaction[];
  members: Member[];
  currency: string;
  onRecordSettlement: (from: string, to: string, amount: number, notes?: string, utrNumber?: string) => Promise<void>;
  history?: SettlementHistoryItem[];
  groupId: string;
  group: any;
  onFetchData: () => void;
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
  transactions,
  members,
  currency,
  onRecordSettlement,
  history = [],
  groupId,
  group,
  onFetchData,
}) => {
  const { addToast } = useToastStore();
  const { user: currentUser } = useAuthStore();
  
  const [activeQrLink, setActiveQrLink] = useState<string | null>(null);
  const [activeQrName, setActiveQrName] = useState<string>('');
  const [activeQrAmount, setActiveQrAmount] = useState<number>(0);
  
  const [payingTx, setPayingTx] = useState<SettlementTransaction | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');

  const userMap = members.reduce((acc, m) => {
    if (m.user) acc[m.user._id] = m.user.username;
    return acc;
  }, {} as Record<string, string>);

  const getUsername = (userId: string) => {
    return userMap[userId] || 'Unknown User';
  };

  const generatePaymentNote = () => {
    const groupName = group?.name || 'Monetely';
    const date = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const settlementMonth = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    const debtorName = currentUser?.username || 'Debtor';
    
    return `${groupName} ${settlementMonth} ${debtorName}`;
  };

  const makeUpiLink = (upiId: string, recipientName: string, amount: number) => {
    const formattedNote = generatePaymentNote();
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(formattedNote)}`;
  };

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    addToast(`UPI ID: ${upiId} copied to clipboard!`, 'success');
  };

  const handleOpenUpiApp = (upiLink: string) => {
    window.location.href = upiLink;
    addToast(`Redirecting to UPI application to pay...`, 'info');
  };

  const handleShowQrModal = (upiId: string, recipientName: string, amount: number) => {
    const link = makeUpiLink(upiId, recipientName, amount);
    setActiveQrLink(link);
    setActiveQrName(recipientName);
    setActiveQrAmount(amount);
  };

  const handleRequestPayment = async (tx: SettlementTransaction) => {
    setIsSubmittingPayment(true);
    try {
      await api.post(`/groups/${groupId}/settlements/request`, {
        debtorId: tx.from,
        amount: tx.amount,
        notes: `Settlement request from ${getUsername(tx.to)}`
      });
      addToast(`Requested payment of ${currency} ${tx.amount} from ${getUsername(tx.from)}`, 'success');
      onFetchData();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to request payment', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleMarkAsPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingTx) return;
    
    setIsSubmittingPayment(true);
    try {
      await onRecordSettlement(
        payingTx.from,
        payingTx.to,
        payingTx.amount,
        notes || generatePaymentNote(),
        utrNumber.trim()
      );
      addToast(`Payment marked as paid! Awaiting confirmation from ${getUsername(payingTx.to)}.`, 'success');
      setPayingTx(null);
      setUtrNumber('');
      setNotes('');
      onFetchData();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to mark payment as paid', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleActionRequest = async (settlementId: string, action: 'pay' | 'confirm' | 'dispute' | 'resolve', extraData?: any) => {
    try {
      let endpoint = `/groups/${groupId}/settlements/${settlementId}/${action}`;
      let data = extraData || {};
      
      await api.patch(endpoint, data);
      addToast(`Settlement status updated: ${action.toUpperCase()}`, 'success');
      setDisputeId(null);
      setDisputeNotes('');
      onFetchData();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to update settlement status', 'error');
    }
  };

  const activeRequests = history.filter(item => item.status !== 'Confirmed');

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {activeRequests.length > 0 && (
        <Card className="border-border">
          <CardHeader className="py-4 px-5 border-b border-border bg-amber-500/5">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-amber-500 animate-pulse" />
              In-Flight Settlements & Requests
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Direct peer-to-peer settlement requests currently awaiting action or confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            {activeRequests.map((item) => {
              const payerId = typeof item.payer === 'object' && item.payer ? item.payer._id : item.payer;
              const payerName = typeof item.payer === 'object' && item.payer ? item.payer.username : 'Someone';
              const recipientId = typeof item.recipient === 'object' && item.recipient ? item.recipient._id : item.recipient;
              const recipientName = typeof item.recipient === 'object' && item.recipient ? item.recipient.username : 'Someone';
              
              const isPayerMe = payerId === currentUser?.id;
              const isRecipientMe = recipientId === currentUser?.id;

              return (
                <div
                  key={item._id}
                  className={`p-4 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                    item.status === 'Disputed'
                      ? 'bg-destructive/5 border-destructive/20'
                      : item.status === 'Paid'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-secondary/30 border-border'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {isPayerMe ? 'You' : payerName}
                      </span>
                      <ArrowRight size={12} className="text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {isRecipientMe ? 'You' : recipientName}
                      </span>
                      <span className="font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px]">
                        {currency} {item.amount.toFixed(2)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-normal italic">
                        Note: "{item.notes}"
                      </p>
                    )}
                    {item.utrNumber && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        UTR / Trans ID: {item.utrNumber}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        item.status === 'Disputed'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : item.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground select-none">
                        • Updated {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isPayerMe && item.status === 'Requested' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setPayingTx({ from: payerId, to: recipientId, amount: item.amount })}
                          className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold rounded flex items-center gap-1"
                        >
                          <Wallet size={11} />
                          Pay Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleActionRequest(item._id, 'pay', { utrNumber: 'IGNORED' })}
                          className="h-7 px-2.5 border border-border text-[10px] hover:bg-secondary/40 text-muted-foreground hover:text-foreground font-semibold rounded"
                        >
                          Ignore
                        </Button>
                      </>
                    )}

                    {isRecipientMe && item.status === 'Paid' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleActionRequest(item._id, 'confirm')}
                          className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold rounded flex items-center gap-1"
                        >
                          <CheckCircle size={11} />
                          Confirm Receipt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDisputeId(item._id)}
                          className="h-7 px-2.5 border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 text-[10px] font-semibold rounded flex items-center gap-1"
                        >
                          <AlertCircle size={11} />
                          Dispute
                        </Button>
                      </>
                    )}

                    {isRecipientMe && item.status === 'Disputed' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleActionRequest(item._id, 'resolve', { resolution: 'Confirmed' })}
                          className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold rounded flex items-center gap-1"
                        >
                          <CheckCircle size={11} />
                          Resolve as Confirmed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleActionRequest(item._id, 'resolve', { resolution: 'Pending' })}
                          className="h-7 px-2.5 border border-border text-[10px] hover:bg-secondary/40 text-muted-foreground hover:text-foreground font-semibold rounded"
                        >
                          Send back to Pending
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader className="py-4 px-5 border-b border-border bg-secondary/10">
          <CardTitle className="text-sm font-semibold text-foreground">Simplified Outstanding Balances</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            The optimization engine calculates the minimum direct payments required to settle all debts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4">
              <div className="p-3 rounded-full bg-secondary text-green-600 border border-border mb-3 select-none">
                <Check size={24} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Everyone is fully settled!</h3>
              <p className="text-muted-foreground text-xs max-w-xs mt-0.5">
                No active balances or debts are pending inside this group. Beautiful!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {transactions.map((tx, idx) => {
                const txId = `${tx.from}-${tx.to}-${idx}`;
                
                const isPayerMe = tx.from === currentUser?.id;
                const isRecipientMe = tx.to === currentUser?.id;
                
                const upiId = tx.recipientUpi?.upiId;
                const upiName = tx.recipientUpi?.upiName || getUsername(tx.to);
                const instructions = tx.recipientUpi?.upiInstructions;

                return (
                  <div key={txId} className="p-5 hover:bg-secondary/5 transition-all flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Debt Info */}
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold text-sm ${isPayerMe ? 'text-destructive' : 'text-foreground'}`}>
                          {isPayerMe ? 'You' : getUsername(tx.from)}
                        </span>
                        <ArrowRight size={14} className="text-muted-foreground" />
                        <span className={`font-semibold text-sm ${isRecipientMe ? 'text-green-600' : 'text-foreground'}`}>
                          {isRecipientMe ? 'You' : getUsername(tx.to)}
                        </span>
                        <span className="font-mono text-sm font-bold bg-secondary border border-border rounded px-2 py-0.5">
                          {currency} {tx.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {isPayerMe && (
                          <Button
                            size="sm"
                            onClick={() => setPayingTx(tx)}
                            className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold py-1 px-3 rounded shadow-none flex items-center gap-1.5 h-8"
                          >
                            <Wallet size={12} />
                            Pay Now
                          </Button>
                        )}
                        {isRecipientMe && (
                          <Button
                            size="sm"
                            onClick={() => handleRequestPayment(tx)}
                            className="border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 text-[11px] font-semibold py-1 px-3 rounded shadow-none flex items-center gap-1.5 h-8"
                          >
                            <Send size={12} />
                            Request Payment
                          </Button>
                        )}
                      </div>
                    </div>

                    {isPayerMe && (
                      <div className="border border-border/80 rounded-lg p-4 bg-secondary/25 flex flex-col gap-3.5 animate-in slide-in-from-top-1 duration-200">
                        {group.allowUpiSharing && upiId ? (
                          <div className="flex flex-col gap-3">
                            {/* UPI ID Details */}
                            <div className="flex items-center justify-between gap-3 bg-card border border-border p-2.5 rounded-md">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide select-none">UPI Address</span>
                                <span className="text-xs font-semibold font-mono truncate text-foreground">{upiId}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopyUpi(upiId)}
                                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copy UPI ID"
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  onClick={() => handleShowQrModal(upiId, upiName, tx.amount)}
                                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Show QR Code"
                                >
                                  <QrCode size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleOpenUpiApp(makeUpiLink(upiId, upiName, tx.amount))}
                                className="flex-1 min-w-[120px] bg-primary hover:bg-primary/95 text-white font-semibold text-[10px] py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                              >
                                <ExternalLink size={12} />
                                Open UPI App
                              </button>
                            </div>

                            {instructions && (
                              <div className="p-2.5 bg-card rounded-md border border-border text-[10px] text-muted-foreground flex gap-1.5 leading-normal items-start">
                                <Info size={11} className="text-primary shrink-0 mt-0.5" />
                                <span><strong>Instructions:</strong> {instructions}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 italic py-1">
                            <Info size={12} />
                            No UPI details shared by {getUsername(tx.to)} or UPI sharing is disabled. Settle manually.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="py-4 px-5 border-b border-border bg-secondary/10">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <History className="h-4 w-4 text-gray-500" />
            Settlement History
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Ledger of direct peer-to-peer settlement payments recorded inside this group.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="text-center py-10 px-4 text-muted-foreground text-xs">
              No settlement payments recorded yet.
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
                    <th className="py-3 px-5">UTR / Note</th>
                    <th className="py-3 px-5">Status</th>
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
                        <td className="py-3 px-5 text-muted-foreground italic max-w-[150px] truncate" title={item.notes}>
                          {item.utrNumber ? `UTR: ${item.utrNumber}` : item.notes || '—'}
                        </td>
                        <td className="py-3 px-5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            item.status === 'Confirmed'
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                              : item.status === 'Paid'
                              ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                          }`}>
                            {item.status}
                          </span>
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

      {activeQrLink && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-sm rounded-xl p-6 shadow-2xl flex flex-col items-center relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveQrLink(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-secondary"
            >
              <XCircle size={18} />
            </button>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <QrCode size={13} className="text-primary animate-pulse" />
              Dynamic UPI QR Code
            </span>
            <h3 className="text-sm font-bold text-foreground mb-1 text-center">Scan to Pay {activeQrName}</h3>
            <span className="text-lg font-mono font-extrabold text-foreground bg-secondary/50 border border-border px-3 py-1 rounded-md mb-4">
              {currency} {activeQrAmount.toFixed(2)}
            </span>
            
            <div className="bg-white p-3 rounded-lg border border-border mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeQrLink)}`}
                alt="UPI Payment QR Code"
                className="w-48 h-48 select-none"
              />
            </div>

            <div className="flex gap-2 w-full mt-2">
              <Button
                onClick={() => {
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activeQrLink)}`, '_blank');
                  addToast('Opening QR image for download...', 'info');
                }}
                className="flex-1 font-semibold text-xs py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground h-9"
              >
                Download QR
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activeQrLink)}`);
                  addToast('QR Code URL copied to clipboard!', 'success');
                }}
                className="flex-1 font-semibold text-xs py-1.5 rounded-lg bg-primary text-white h-9"
              >
                Share QR URL
              </Button>
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-4 leading-normal text-center">
              Scan with any UPI app (GPay, PhonePe, Paytm, BHIM, Amazon Pay) to transfer money directly.
            </p>
          </div>
        </div>
      )}

      {payingTx && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setPayingTx(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-secondary"
            >
              <XCircle size={18} />
            </button>
            <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Wallet size={18} className="text-green-600" />
              Settle Balance - Mark As Paid
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enter your transaction details after paying <strong>{getUsername(payingTx.to)}</strong> externally.
            </p>

            <form onSubmit={handleMarkAsPaidSubmit} className="flex flex-col gap-4">
              <div className="p-3 bg-secondary/40 border border-border rounded-lg text-xs flex justify-between items-center">
                <span className="font-semibold">Settlement Amount:</span>
                <span className="font-mono font-bold text-sm bg-green-500/10 text-green-700 px-2 py-0.5 border border-green-500/20 rounded">
                  {currency} {payingTx.amount.toFixed(2)}
                </span>
              </div>

              <Input
                label="Transaction UTR / Reference Number (Recommended)"
                placeholder="12-digit UPI UTR number"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                disabled={isSubmittingPayment}
                helperText="Provides reference for receiver verification"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Notes / Message (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. June expenses pay"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmittingPayment}
                  className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
                />
              </div>

              <div className="flex gap-2 w-full mt-3 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPayingTx(null)}
                  disabled={isSubmittingPayment}
                  className="font-semibold text-xs h-9 border border-border hover:bg-secondary/40"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmittingPayment}
                  className="font-semibold text-xs h-9 bg-green-600 hover:bg-green-700 text-white"
                >
                  Submit Payment Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {disputeId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-sm rounded-xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-1.5">
              <AlertCircle size={18} className="text-destructive" />
              Dispute Settlement Payment
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Explain why you are disputing this payment. The debtor will be notified.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Dispute Reason</label>
                <textarea
                  rows={3}
                  placeholder="e.g. I did not receive any transfer. Check UTR."
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>

              <div className="flex gap-2 w-full justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDisputeId(null)}
                  className="font-semibold text-xs h-9 border border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleActionRequest(disputeId, 'dispute', { notes: disputeNotes })}
                  className="font-semibold text-xs h-9 bg-destructive hover:bg-destructive/95 text-white"
                >
                  Raise Dispute
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default SettlementScreen;
