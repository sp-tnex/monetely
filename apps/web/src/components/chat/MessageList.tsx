import React, { useRef, useEffect } from 'react';
import { 
  CornerUpLeft, 
  Edit3, 
  Trash2, 
  Pin, 
  CheckCheck, 
  Check, 
  AlertTriangle, 
  DollarSign, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface MessageListProps {
  messages: any[];
  currentUserId: string;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string, deleteType: 'me' | 'everyone') => void;
  onReaction: (messageId: string, emoji: string, hasReacted: boolean) => void;
  onReply: (message: any) => void;
  onPin: (messageId: string, isPinned: boolean) => void;
  expenses: any[];
  settlements: any[];
  members: any[];
  groupCurrency: string;
  onViewExpense: (expenseId: string) => void;
  onViewSettlement: (settlementId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isAdminOrOwner: boolean;
}

const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉'];

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onEdit,
  onDelete,
  onReaction,
  onReply,
  onPin,
  expenses,
  settlements,
  members,
  groupCurrency,
  onViewExpense,
  onViewSettlement,
  onLoadMore,
  hasMore,
  isAdminOrOwner
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const getUserInitials = (username: string) => {
    if (!username) return 'U';
    return username.slice(0, 2).toUpperCase();
  };

  const getMemberAvatar = (userId: string) => {
    const member = members.find(m => m.user?._id === userId);
    return member?.user?.avatarUrl;
  };

  const lookupExpense = (expenseId: string) => {
    return expenses.find(e => e._id === expenseId);
  };

  const lookupSettlement = (settlementId: string) => {
    return settlements.find(s => s._id === settlementId);
  };

  const getUsername = (userId: string) => {
    const member = members.find(m => m.user?._id === userId);
    return member?.user?.username || 'Unknown User';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background/50 border border-border/40 rounded-xl overflow-hidden shadow-inner">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground"
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadMore}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary border border-border/80 px-3 py-1.5 rounded-full transition-all cursor-pointer uppercase tracking-wider uppercase select-none"
            >
              Load Previous Messages
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center mb-3 text-muted-foreground animate-pulse">
              💬
            </div>
            <h3 className="text-xs font-bold text-foreground">No Messages Yet</h3>
            <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1 leading-normal font-medium">
              Start the discussion! Type a message below or reference an expense.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isSelf = msg.senderId?._id === currentUserId;
          const senderName = msg.senderId?.username || 'Unknown';
          const avatarUrl = msg.senderId?.avatarUrl || getMemberAvatar(msg.senderId?._id);
          const initials = getUserInitials(senderName);
          
          const getHasReacted = (users: any[]) => users.some(u => u.id === currentUserId);

          return (
            <div 
              key={msg._id} 
              className={cn(
                "flex items-start gap-2.5 max-w-full group/msg relative animate-in fade-in duration-100",
                isSelf ? "flex-row-reverse" : "flex-row"
              )}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={senderName}
                  className="w-7 h-7 rounded-lg border border-border object-cover select-none shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border text-[10px] font-bold flex items-center justify-center text-foreground shrink-0 select-none">
                  {initials}
                </div>
              )}

              <div className={cn("flex flex-col max-w-[75%]", isSelf ? "items-end" : "items-start")}>
                
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-foreground">{senderName}</span>
                  <span className="text-[8px] text-muted-foreground font-semibold uppercase">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.isPinned && (
                    <Pin size={8} className="text-primary fill-primary animate-[bounce_1.5s_infinite]" />
                  )}
                </div>

                {msg.parentMessageId && (
                  <div className={cn(
                    "px-3 py-1.5 rounded-t-lg bg-secondary/30 border-x border-t border-border/50 text-[10px] text-muted-foreground font-medium mb-[-4px] max-w-full truncate flex items-center gap-1.5",
                    isSelf ? "mr-1 rounded-l-lg" : "ml-1 rounded-r-lg"
                  )}>
                    <CornerUpLeft size={10} className="shrink-0" />
                    <span>
                      Replying to <strong>{msg.parentMessageId.senderId?.username || 'user'}</strong>: {msg.parentMessageId.content}
                    </span>
                  </div>
                )}

                <div 
                  className={cn(
                    "p-3 rounded-2xl text-xs font-normal leading-relaxed relative break-words whitespace-pre-wrap",
                    msg.deleted 
                      ? "bg-secondary/40 border border-border text-muted-foreground/80 italic font-medium"
                      : isSelf 
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium rounded-tr-none shadow-md shadow-primary/5" 
                        : "bg-secondary/80 border border-border/60 text-foreground rounded-tl-none shadow-sm"
                  )}
                >
                  {msg.type === 'SYSTEM' && (
                    <ShieldAlert size={12} className="inline mr-1 text-amber-500 animate-pulse" />
                  )}

                  <span>{msg.content}</span>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 grid gap-1 grid-cols-1 max-w-xs rounded-lg overflow-hidden border border-border/40 bg-background/20 p-0.5">
                      {msg.attachments.map((url: string, idx: number) => (
                        <img 
                          key={idx} 
                          src={url} 
                          alt="Attachment" 
                          className="max-h-48 w-full object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  {msg.type === 'EXPENSE_REF' && msg.referenceId && (() => {
                    const exp = lookupExpense(msg.referenceId);
                    if (!exp) return (
                      <div className="mt-2 flex items-center gap-1.5 p-2 bg-secondary/80 border border-border rounded-lg text-[10px] text-muted-foreground font-medium">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span>Expense details archived or not loaded</span>
                      </div>
                    );
                    return (
                      <div 
                        onClick={() => onViewExpense(exp._id)}
                        className="mt-2.5 p-3 rounded-xl bg-card border border-border/80 text-card-foreground text-left shadow-sm hover:border-primary/40 cursor-pointer transition-all hover:scale-[1.01]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                              <DollarSign size={13} />
                            </div>
                            <div>
                              <h4 className="text-[11px] font-bold text-foreground leading-none">{exp.description}</h4>
                              <p className="text-[9px] text-muted-foreground mt-1 font-semibold">
                                Paid by: {getUsername(exp.paidBy)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-extrabold text-foreground">
                              {groupCurrency} {exp.amount}
                            </span>
                            <p className="text-[8px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">
                              Category: {exp.category}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {msg.type === 'SETTLEMENT_REF' && msg.referenceId && (() => {
                    const setl = lookupSettlement(msg.referenceId);
                    if (!setl) return (
                      <div className="mt-2 flex items-center gap-1.5 p-2 bg-secondary/80 border border-border rounded-lg text-[10px] text-muted-foreground font-medium">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span>Settlement details archived or not loaded</span>
                      </div>
                    );
                    return (
                      <div 
                        onClick={() => onViewSettlement(setl._id)}
                        className="mt-2.5 p-3 rounded-xl bg-card border border-border/80 text-card-foreground text-left shadow-sm hover:border-primary/40 cursor-pointer transition-all hover:scale-[1.01]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[8px] px-1.5 py-0.5 font-bold rounded bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest leading-none">
                              Settlement Request
                            </span>
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-foreground font-bold">
                              <span>{getUsername(setl.payer)}</span>
                              <ArrowRight size={10} className="text-muted-foreground" />
                              <span>{getUsername(setl.recipient)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-extrabold text-foreground">
                              {groupCurrency} {setl.amount}
                            </span>
                            <span className={cn(
                              "block text-[8px] font-bold uppercase tracking-wider mt-1 px-1 rounded border text-center",
                              setl.status === 'Confirmed' 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                : setl.status === 'Paid' 
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {setl.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {msg.edited && !msg.deleted && (
                    <span className="block text-[8px] mt-1 text-right italic font-medium opacity-70">
                      Edited
                    </span>
                  )}
                </div>

                {isSelf && !msg.deleted && (
                  <div className="flex items-center gap-0.5 mt-0.5 px-1">
                    {msg.readReceipts && msg.readReceipts.length > 0 ? (
                      <span title="Read by group members">
                        <CheckCheck size={11} className="text-primary fill-primary/10" />
                      </span>
                    ) : (
                      <span title="Sent successfully">
                        <Check size={11} className="text-muted-foreground/70" />
                      </span>
                    )}
                  </div>
                )}

                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={cn("flex flex-wrap gap-1 mt-1.5 px-1", isSelf ? "justify-end" : "justify-start")}>
                    {msg.reactions.map((react: any, idx: number) => {
                      const hasReacted = getHasReacted(react.users);
                      return (
                        <button
                          key={idx}
                          onClick={() => onReaction(msg._id, react.emoji, hasReacted)}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 text-[9px] rounded-full font-bold border transition-colors cursor-pointer",
                            hasReacted 
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-secondary/60 border-border/80 text-foreground hover:bg-secondary"
                          )}
                          title={react.users.map((u: any) => u.username).join(', ')}
                        >
                          <span>{react.emoji}</span>
                          <span>{react.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!msg.deleted && (
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 hidden group-hover/msg:flex items-center gap-1 bg-card border border-border shadow-md rounded-lg p-1 z-10 animate-in fade-in zoom-in-95 duration-100",
                  isSelf ? "left-0 -translate-x-[20%]" : "right-0 translate-x-[20%]"
                )}>
                  <div className="flex border-r border-border pr-1 mr-1 gap-0.5">
                    {EMOJIS.map(emoji => {
                      const users = msg.reactions?.find((r: any) => r.emoji === emoji)?.users || [];
                      const hasReacted = getHasReacted(users);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onReaction(msg._id, emoji, hasReacted)}
                          className={cn(
                            "w-5 h-5 rounded hover:bg-secondary flex items-center justify-center text-[10px] cursor-pointer active:scale-90 transition-transform",
                            hasReacted && "bg-primary/10"
                          )}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => onReply(msg)}
                    className="w-5.5 h-5.5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Reply in thread"
                  >
                    <CornerUpLeft size={12} />
                  </button>

                  {isSelf && (
                    <button 
                      onClick={() => onEdit(msg._id, msg.content)}
                      className="w-5.5 h-5.5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit message"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}

                  {isAdminOrOwner && (
                    <button 
                      onClick={() => onPin(msg._id, !msg.isPinned)}
                      className="w-5.5 h-5.5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      title={msg.isPinned ? "Unpin message" : "Pin message"}
                    >
                      <Pin size={12} className={cn(msg.isPinned && "text-primary fill-primary")} />
                    </button>
                  )}

                  <div className="relative group/delete">
                    <button 
                      className="w-5.5 h-5.5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="absolute right-0 bottom-full mb-1 hidden group-hover/delete:flex flex-col bg-card border border-border shadow-lg rounded-lg py-1 min-w-[110px] z-20">
                      <button
                        onClick={() => onDelete(msg._id, 'me')}
                        className="px-2.5 py-1 text-[9px] font-bold text-left hover:bg-secondary text-foreground hover:text-foreground cursor-pointer leading-normal"
                      >
                        Delete for me
                      </button>
                      {(isSelf || isAdminOrOwner) && (
                        <button
                          onClick={() => onDelete(msg._id, 'everyone')}
                          className="px-2.5 py-1 text-[9px] font-bold text-left hover:bg-secondary text-destructive hover:text-destructive cursor-pointer border-t border-border/50 leading-normal"
                        >
                          Delete for everyone
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
