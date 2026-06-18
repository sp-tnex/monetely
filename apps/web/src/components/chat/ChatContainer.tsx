import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Megaphone, 
  DollarSign, 
  Wallet, 
  Settings, 
  Search, 
  Download, 
  Pin, 
  X,
  ArrowLeft
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { cn } from '../../utils/cn';

interface ChatContainerProps {
  groupId: string;
  currentUserId: string;
  members: any[];
  expenses: any[];
  settlements: any[];
  groupCurrency: string;
  onViewExpense: (expenseId: string) => void;
  onViewSettlement: (settlementId: string) => void;
  currentUserRole: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  groupId,
  currentUserId,
  members,
  expenses,
  settlements,
  groupCurrency,
  onViewExpense,
  onViewSettlement,
  currentUserRole
}) => {
  const {
    rooms,
    activeRoom,
    messages,
    nextCursor,
    isLoadingRooms,
    isLoadingMessages,
    typingUsers,
    fetchRooms,
    getOrCreateRoom,
    setActiveRoom,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    addReaction,
    removeReaction,
    setTyping,
    updateRetention,
    manualCleanup,
    searchMessages,
    setupSocketListeners,
    removeSocketListeners
  } = useChatStore();

  const [activeChannelTab, setActiveChannelTab] = useState<'all' | 'expense' | 'settlement'>('all');
  const [replyingMessage, setReplyingMessage] = useState<any | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  
  const handleRoomSelect = (room: any) => {
    setActiveRoom(room);
    setShowSidebarOnMobile(false);
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [retentionPolicy, setRetentionPolicy] = useState<'FOREVER' | '30_DAYS' | '90_DAYS' | '1_YEAR' | 'CUSTOM'>('FOREVER');
  const [customDays, setCustomDays] = useState(120);
  const [autoArchive, setAutoArchive] = useState(false);
  const [autoDelete, setAutoDelete] = useState(false);
  const [notifyBefore, setNotifyBefore] = useState(true);
  
  const [manualCleanupAction, setManualCleanupAction] = useState<'ARCHIVE' | 'DELETE'>('ARCHIVE');
  const [cleanupBeforeDate, setCleanupBeforeDate] = useState('');

  const isAdminOrOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const isOwner = currentUserRole === 'OWNER';

  useEffect(() => {
    fetchRooms(groupId).then((fetchedRooms) => {
      const general = fetchedRooms.find(r => r.type === 'GROUP_CHAT');
      if (general) {
        setActiveRoom(general);
      }
    });
    setupSocketListeners();
    
    return () => {
      removeSocketListeners();
      setActiveRoom(null);
    };
  }, [groupId]);

  useEffect(() => {
    if (activeRoom) {
      setRetentionPolicy(activeRoom.retentionSettings?.policy || 'FOREVER');
      setCustomDays(activeRoom.retentionSettings?.customDays || 120);
      setAutoArchive(activeRoom.retentionSettings?.autoArchiveEnabled || false);
      setAutoDelete(activeRoom.retentionSettings?.autoDeleteEnabled || false);
      setNotifyBefore(activeRoom.retentionSettings?.notifyBeforeCleanup || true);
    }
  }, [activeRoom, showSettingsPanel]);

  const handleCreateDiscussion = async (type: 'EXPENSE_DISCUSSION' | 'SETTLEMENT_DISCUSSION', refId: string) => {
    try {
      const room = await getOrCreateRoom(groupId, type, refId);
      setActiveRoom(room);
      setShowSidebarOnMobile(false);
    } catch (err) {
      console.error('Failed to start discussion', err);
    }
  };

  const handleSendMessageSubmit = async (content: string, type: any, attachments?: string[]) => {
    if (!activeRoom) return;
    try {
      await sendMessage(
        content,
        type,
        activeRoom.referenceId,
        replyingMessage?._id || undefined,
        attachments
      );
      setReplyingMessage(null);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleEditMessageSubmit = () => {
    if (!editingMessageId || !editingMessageText.trim()) return;
    editMessage(editingMessageId, editingMessageText.trim());
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const handleReactionToggle = (messageId: string, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      removeReaction(messageId, emoji);
    } else {
      addReaction(messageId, emoji);
    }
  };

  const handleSaveRetentionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom) return;
    try {
      await updateRetention(activeRoom._id, {
        policy: retentionPolicy,
        customDays: retentionPolicy === 'CUSTOM' ? customDays : undefined,
        autoArchiveEnabled: autoArchive,
        autoDeleteEnabled: autoDelete,
        notifyBeforeCleanup: notifyBefore
      });
      alert('Retention configurations updated successfully');
      setShowSettingsPanel(false);
    } catch (err) {
      console.error('Failed to save retention settings', err);
      alert('Failed to save retention settings');
    }
  };

  const handleTriggerManualCleanup = async () => {
    if (!activeRoom) return;
    if (!cleanupBeforeDate) {
      alert('Please specify a cutoff date.');
      return;
    }
    const confirmMsg = `Are you sure you want to manually ${manualCleanupAction.toLowerCase()} all messages in this room created before ${new Date(cleanupBeforeDate).toLocaleDateString()}?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await manualCleanup(activeRoom._id, {
        action: manualCleanupAction,
        beforeDate: cleanupBeforeDate
      });
      alert('Manual cleanup job completed successfully');
      setCleanupBeforeDate('');
    } catch (err) {
      console.error('Failed cleanup', err);
      alert('Failed manual cleanup');
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMessages(activeRoom._id, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Failed search', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportTranscript = (format: 'json' | 'csv' | 'txt') => {
    if (!activeRoom) return;
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const downloadUrl = `${serverUrl}/chat/rooms/${activeRoom._id}/export?format=${format}`;
    window.open(downloadUrl, '_blank');
  };

  const lookupExpense = (expenseId: string) => {
    return expenses.find(e => e._id === expenseId);
  };

  const lookupSettlement = (settlementId: string) => {
    return settlements.find(s => s._id === settlementId);
  };

  const pinnedMessages = messages.filter(m => m.isPinned);

  const activeTypingList = activeRoom ? (typingUsers[activeRoom._id] || []) : [];

  return (
    <div className="flex h-[600px] w-full border border-border bg-card rounded-2xl overflow-hidden shadow-xl font-sans relative">
      
      <div className={cn(
        "w-full md:w-64 border-r border-border bg-secondary/20 flex flex-col h-full select-none shrink-0",
        (!activeRoom || showSidebarOnMobile) ? "flex" : "hidden md:flex"
      )}>
        
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <MessageSquare size={13} className="text-primary" />
            Chat Rooms
          </h2>
        </div>

        <div className="flex bg-secondary/50 border-b border-border p-1 text-[9px] font-bold uppercase tracking-wider">
          <button 
            onClick={() => setActiveChannelTab('all')}
            className={cn("flex-1 py-1 rounded cursor-pointer transition-colors", activeChannelTab === 'all' ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            All
          </button>
          <button 
            onClick={() => setActiveChannelTab('expense')}
            className={cn("flex-1 py-1 rounded cursor-pointer transition-colors", activeChannelTab === 'expense' ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Expenses
          </button>
          <button 
            onClick={() => setActiveChannelTab('settlement')}
            className={cn("flex-1 py-1 rounded cursor-pointer transition-colors", activeChannelTab === 'settlement' ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Settlements
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
          {isLoadingRooms && (
            <div className="flex items-center justify-center p-6 text-[10px] text-muted-foreground font-semibold">
              Loading chat rooms...
            </div>
          )}

          {activeChannelTab === 'all' && (
            <>
              {rooms.map((room) => {
                const isSelected = activeRoom?._id === room._id;
                return (
                  <button
                    key={room._id}
                    onClick={() => handleRoomSelect(room)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all cursor-pointer font-bold text-xs",
                      isSelected 
                        ? "bg-primary text-primary-foreground font-extrabold shadow-sm" 
                        : "text-foreground hover:bg-secondary/75"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {room.type === 'GROUP_CHAT' ? (
                        <MessageSquare size={14} className={isSelected ? "text-primary-foreground" : "text-muted-foreground"} />
                      ) : (
                        <Megaphone size={14} className={isSelected ? "text-primary-foreground" : "text-muted-foreground"} />
                      )}
                      <span className="truncate">
                        {room.type === 'GROUP_CHAT' ? 'Group Chat' : 'Announcements'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {(activeChannelTab === 'all' || activeChannelTab === 'expense') && (
            <div className="space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold px-3 py-1 mt-2.5">
                Expense Chats
              </div>
              {expenses.map((exp) => {
                const expRoom = rooms.find(r => r.type === 'EXPENSE_DISCUSSION' && r.referenceId === exp._id);
                const isSelected = activeRoom?._id === expRoom?._id;
                return (
                  <button
                    key={exp._id}
                    onClick={() => handleCreateDiscussion('EXPENSE_DISCUSSION', exp._id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all cursor-pointer font-bold text-xs border border-transparent",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "text-foreground hover:bg-secondary/70"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <DollarSign size={13} className={isSelected ? "text-primary-foreground" : "text-emerald-500"} />
                      <span className="truncate">{exp.description}</span>
                    </div>
                    <span className={cn("text-[9px] shrink-0 font-extrabold", isSelected ? "text-primary-foreground" : "text-muted-foreground")}>
                      {groupCurrency}{exp.amount}
                    </span>
                  </button>
                );
              })}
              {expenses.length === 0 && (
                <div className="text-[9px] italic text-muted-foreground font-semibold px-3 py-2 select-none">
                  No expenses recorded
                </div>
              )}
            </div>
          )}

          {(activeChannelTab === 'all' || activeChannelTab === 'settlement') && (
            <div className="space-y-1">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold px-3 py-1 mt-2.5">
                Settlement Chats
              </div>
              {settlements.map((setl) => {
                const setlRoom = rooms.find(r => r.type === 'SETTLEMENT_DISCUSSION' && r.referenceId === setl._id);
                const isSelected = activeRoom?._id === setlRoom?._id;
                
                const debtorMember = members.find(m => m.user._id === setl.payer);
                const creditorMember = members.find(m => m.user._id === setl.recipient);
                const desc = `${debtorMember?.user?.username || 'Debtor'} ➔ ${creditorMember?.user?.username || 'Creditor'}`;

                return (
                  <button
                    key={setl._id}
                    onClick={() => handleCreateDiscussion('SETTLEMENT_DISCUSSION', setl._id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all cursor-pointer font-bold text-xs border border-transparent",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "text-foreground hover:bg-secondary/70"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Wallet size={13} className={isSelected ? "text-primary-foreground" : "text-indigo-500"} />
                      <span className="truncate">{desc}</span>
                    </div>
                    <span className={cn("text-[9px] shrink-0 font-extrabold", isSelected ? "text-primary-foreground" : "text-muted-foreground")}>
                      {groupCurrency}{setl.amount}
                    </span>
                  </button>
                );
              })}
              {settlements.length === 0 && (
                <div className="text-[9px] italic text-muted-foreground font-semibold px-3 py-2 select-none">
                  No settlement consolidation
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col h-full bg-background min-w-0",
        (activeRoom && !showSidebarOnMobile) ? "flex" : "hidden md:flex"
      )}>
        {activeRoom ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => setShowSidebarOnMobile(true)}
                  className="md:hidden p-1.5 text-muted-foreground hover:text-foreground mr-1.5 border border-border rounded-lg bg-secondary/40 flex items-center justify-center cursor-pointer shrink-0 animate-in fade-in duration-200"
                  title="Back to Rooms"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-widest leading-none flex items-center gap-1.5 truncate">
                    {activeRoom.type === 'GROUP_CHAT' && 'Group Main Chat'}
                    {activeRoom.type === 'ANNOUNCEMENT_CHANNEL' && 'Announcement Channel'}
                    {activeRoom.type === 'EXPENSE_DISCUSSION' && 'Expense Discussion'}
                    {activeRoom.type === 'SETTLEMENT_DISCUSSION' && 'Settlement Discussion'}
                  </h3>
                  {activeRoom.type === 'ANNOUNCEMENT_CHANNEL' && (
                    <p className="text-[8px] font-bold text-primary tracking-widest mt-1 uppercase">Read-Only for Members</p>
                  )}
                  {activeRoom.type === 'EXPENSE_DISCUSSION' && activeRoom.referenceId && (() => {
                    const exp = lookupExpense(activeRoom.referenceId);
                    return exp && (
                      <p className="text-[9px] text-muted-foreground mt-1.5 font-medium truncate max-w-sm">
                        Discussing: <strong>{exp.description}</strong> ({groupCurrency} {exp.amount})
                      </p>
                    );
                  })()}
                  {activeRoom.type === 'SETTLEMENT_DISCUSSION' && activeRoom.referenceId && (() => {
                    const setl = lookupSettlement(activeRoom.referenceId);
                    return setl && (
                      <p className="text-[9px] text-muted-foreground mt-1.5 font-medium truncate max-w-sm">
                        Discussing Settlement Request: <strong>{groupCurrency} {setl.amount}</strong>
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setShowSearchPanel(!showSearchPanel);
                    setShowSettingsPanel(false);
                  }}
                  className={cn("p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors", showSearchPanel && "bg-secondary text-foreground")}
                  title="Search messages"
                >
                  <Search size={14} />
                </button>

                <div className="relative group/export">
                  <button 
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title="Export transcript"
                  >
                    <Download size={14} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 hidden group-hover/export:flex flex-col bg-card border border-border shadow-xl rounded-lg py-1 min-w-[100px] z-20">
                    <button
                      onClick={() => handleExportTranscript('json')}
                      className="px-2.5 py-1.5 text-[9px] font-bold text-left hover:bg-secondary text-foreground cursor-pointer"
                    >
                      Export JSON
                    </button>
                    <button
                      onClick={() => handleExportTranscript('csv')}
                      className="px-2.5 py-1.5 text-[9px] font-bold text-left hover:bg-secondary text-foreground cursor-pointer border-t border-border/50"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleExportTranscript('txt')}
                      className="px-2.5 py-1.5 text-[9px] font-bold text-left hover:bg-secondary text-foreground cursor-pointer border-t border-border/50"
                    >
                      Export TXT
                    </button>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      setShowSettingsPanel(!showSettingsPanel);
                      setShowSearchPanel(false);
                    }}
                    className={cn("p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors", showSettingsPanel && "bg-secondary text-foreground")}
                    title="Retention Settings"
                  >
                    <Settings size={14} />
                  </button>
                )}
              </div>
            </div>

            {pinnedMessages.length > 0 && (
              <div className="bg-secondary/40 border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-[10px] text-muted-foreground font-semibold select-none shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 truncate">
                  <Pin size={11} className="text-primary fill-primary/30 shrink-0" />
                  <span className="truncate">
                    <strong>Pinned Message:</strong> "{pinnedMessages[pinnedMessages.length - 1].content}"
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-bold">
                  {isAdminOrOwner && (
                    <button
                      onClick={() => togglePin(pinnedMessages[pinnedMessages.length - 1]._id, false)}
                      className="text-destructive hover:underline cursor-pointer"
                    >
                      Unpin
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-row min-h-0 relative">
              
              <div className="flex-1 flex flex-col p-4 space-y-3 min-w-0 h-full justify-between">
                
                {editingMessageId && (
                  <div className="bg-secondary border border-border rounded-xl p-3 flex flex-col gap-2 select-none shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Editing message</span>
                      <button onClick={() => setEditingMessageId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editingMessageText} 
                        onChange={(e) => setEditingMessageText(e.target.value)}
                        className="flex-1 bg-background border border-border rounded-lg text-xs py-1.5 px-2.5 focus:outline-none"
                      />
                      <button 
                        onClick={handleEditMessageSubmit}
                        className="bg-primary text-primary-foreground font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground select-none font-semibold">
                    Loading messages thread...
                  </div>
                ) : (
                  <MessageList
                    messages={messages}
                    currentUserId={currentUserId}
                    onEdit={(id, text) => {
                      setEditingMessageId(id);
                      setEditingMessageText(text);
                    }}
                    onDelete={deleteMessage}
                    onReaction={handleReactionToggle}
                    onReply={(msg) => setReplyingMessage(msg)}
                    onPin={togglePin}
                    expenses={expenses}
                    settlements={settlements}
                    members={members}
                    groupCurrency={groupCurrency}
                    onViewExpense={onViewExpense}
                    onViewSettlement={onViewSettlement}
                    onLoadMore={() => fetchMessages(activeRoom._id, true)}
                    hasMore={!!nextCursor}
                    isAdminOrOwner={isAdminOrOwner}
                  />
                )}

                {activeTypingList.length > 0 && (
                  <div className="text-[10px] text-muted-foreground font-medium italic animate-pulse px-1 select-none">
                    {activeTypingList.map((u) => u.username).join(', ')} {activeTypingList.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}

                <MessageInput
                  onSend={handleSendMessageSubmit}
                  onTyping={(isTyping) => setTyping(activeRoom._id, isTyping)}
                  members={members}
                  replyingTo={replyingMessage}
                  onCancelReply={() => setReplyingMessage(null)}
                  disabled={activeRoom.type === 'ANNOUNCEMENT_CHANNEL' && !isAdminOrOwner}
                  placeholder={
                    activeRoom.type === 'ANNOUNCEMENT_CHANNEL' && !isAdminOrOwner
                      ? "Only admins can send announcements."
                      : "Type a message... Use @ to mention."
                  }
                />
              </div>

              {showSettingsPanel && isOwner && (
                <div className="w-full md:w-72 border-l border-border bg-card md:bg-secondary/15 p-4 absolute md:relative inset-y-0 right-0 z-20 overflow-y-auto flex flex-col gap-4 animate-in slide-in-from-right duration-200 select-none shadow-md shrink-0">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Settings size={13} className="text-primary" />
                      Retention Settings
                    </h4>
                    <button onClick={() => setShowSettingsPanel(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRetentionSettings} className="space-y-4 text-xs font-normal">
                    <div className="space-y-1">
                      <label className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">History Retention Policy</label>
                      <select
                        value={retentionPolicy}
                        onChange={(e) => setRetentionPolicy(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-lg py-1.5 px-2.5 focus:outline-none"
                      >
                        <option value="FOREVER">Keep Forever</option>
                        <option value="30_DAYS">Delete after 30 Days</option>
                        <option value="90_DAYS">Delete after 90 Days</option>
                        <option value="1_YEAR">Delete after 1 Year</option>
                        <option value="CUSTOM">Custom Range</option>
                      </select>
                    </div>

                    {retentionPolicy === 'CUSTOM' && (
                      <div className="space-y-1">
                        <label className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">Retention Days</label>
                        <input
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(parseInt(e.target.value, 10))}
                          className="w-full bg-background border border-border rounded-lg py-1.5 px-2.5 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-3 bg-secondary/35 border border-border/60 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="font-bold text-foreground text-[11px] block">Auto Archiving</label>
                          <p className="text-[9px] text-muted-foreground mt-0.5 font-medium leading-none">Move inactive chats to archive</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoArchive}
                          onChange={(e) => setAutoArchive(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
                        <div>
                          <label className="font-bold text-foreground text-[11px] block">Auto Deletion</label>
                          <p className="text-[9px] text-muted-foreground mt-0.5 font-medium leading-none">Soft delete matured history</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoDelete}
                          onChange={(e) => setAutoDelete(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
                        <div>
                          <label className="font-bold text-foreground text-[11px] block">Cleanup Alerts</label>
                          <p className="text-[9px] text-muted-foreground mt-0.5 font-medium leading-none">Warn members 7 days prior</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyBefore}
                          onChange={(e) => setNotifyBefore(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold uppercase py-2 rounded-lg text-[10px] tracking-wider cursor-pointer shadow"
                    >
                      Save Configuration
                    </button>
                  </form>

                  <div className="border-t border-border pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manual History Purge</h5>
                    
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">Purge Action</label>
                      <select
                        value={manualCleanupAction}
                        onChange={(e) => setManualCleanupAction(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-lg py-1.5 px-2.5 focus:outline-none"
                      >
                        <option value="ARCHIVE">Archive history</option>
                        <option value="DELETE">Soft delete history</option>
                      </select>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider block">Cutoff Date</label>
                      <input
                        type="date"
                        value={cleanupBeforeDate}
                        onChange={(e) => setCleanupBeforeDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg py-1.5 px-2.5 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTriggerManualCleanup}
                      className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/95 font-bold uppercase py-2 rounded-lg text-[10px] tracking-wider cursor-pointer shadow"
                    >
                      Trigger Manual Purge
                    </button>
                  </div>
                </div>
              )}

              {showSearchPanel && (
                <div className="w-full md:w-72 border-l border-border bg-card md:bg-secondary/15 p-4 absolute md:relative inset-y-0 right-0 z-20 overflow-y-auto flex flex-col gap-4 animate-in slide-in-from-right duration-200 select-none shadow-md shrink-0">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Search size={13} className="text-primary" />
                      Search History
                    </h4>
                    <button onClick={() => setShowSearchPanel(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Search Input bar */}
                  <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Keyword or message..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg text-xs py-1.5 px-2.5 focus:outline-none"
                    />
                    <button 
                      type="submit"
                      className="p-1.5 bg-primary text-primary-foreground rounded-lg cursor-pointer"
                    >
                      <Search size={14} />
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto space-y-2.5">
                    {isSearching ? (
                      <div className="text-[10px] text-muted-foreground font-semibold py-4 text-center">Searching logs...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground italic py-6 text-center">No matching results.</div>
                    ) : (
                      searchResults.map((resMsg) => (
                        <div 
                          key={resMsg._id} 
                          className="p-2.5 border border-border/80 bg-card rounded-xl text-left select-text relative"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1 mb-1 text-[8px] font-bold text-muted-foreground uppercase">
                            <span>{resMsg.senderId?.username}</span>
                            <span>{new Date(resMsg.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-foreground font-medium leading-relaxed">{resMsg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-14 h-14 bg-secondary border border-border rounded-2xl flex items-center justify-center text-2xl mb-4">
              💬
            </div>
            <h3 className="text-sm font-bold text-foreground">Select a Chat Room</h3>
            <p className="text-xs text-muted-foreground max-w-[280px] mt-1 leading-normal font-medium">
              Choose a channel on the left to start communication or reference an expense conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ChatContainer;
