import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Smile, X, AtSign } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MessageInputProps {
  onSend: (content: string, type: 'TEXT' | 'IMAGE' | 'EXPENSE_REF' | 'SETTLEMENT_REF', attachments?: string[]) => void;
  onTyping: (isTyping: boolean) => void;
  members: any[];
  replyingTo: any | null;
  onCancelReply: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '💡', '✅', '❌'];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  members,
  replyingTo,
  onCancelReply,
  placeholder = "Type your message...",
  disabled = false
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, 2000);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1 && (lastAtIdx === 0 || textBeforeCursor[lastAtIdx - 1] === ' ')) {
      const query = textBeforeCursor.slice(lastAtIdx + 1);
      if (!query.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(query.toLowerCase());
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const filteredMembers = members.filter((member) => {
    const name = member.user?.username || '';
    return name.toLowerCase().includes(mentionFilter) && member.user?._id;
  });

  const handleSelectMention = (username: string) => {
    if (!inputRef.current) return;
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPosition);
    const textAfterCursor = text.slice(cursorPosition);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtIdx) + `@${username} ` + textAfterCursor;
      setText(newText);
      setShowMentions(false);
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const nextCursor = lastAtIdx + username.length + 2;
          inputRef.current.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectMention(filteredMembers[mentionIndex].user.username);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    const type = attachments.length > 0 ? 'IMAGE' : 'TEXT';
    onSend(trimmed, type, attachments.length > 0 ? attachments : undefined);
    
    setText('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setShowMentions(false);

    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }, 0);
  };

  const handleAddMockImage = () => {
    const url = window.prompt("Enter an image URL for attachment:");
    if (url && url.startsWith('http')) {
      setAttachments((prev) => [...prev, url]);
    } else if (url) {
      alert("Invalid image URL. Must start with http/https");
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col border border-border bg-card rounded-xl shadow-md p-2 relative font-sans">
      
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-card border border-border shadow-xl rounded-lg overflow-hidden py-1 z-30 animate-in slide-in-from-bottom-2 duration-100">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-secondary/35 text-[9px] text-muted-foreground uppercase font-bold tracking-wider select-none">
            <AtSign size={10} />
            <span>Mention Group Member</span>
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {filteredMembers.map((member, idx) => (
              <li key={member.user._id}>
                <button
                  onClick={() => handleSelectMention(member.user.username)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer",
                    idx === mentionIndex ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary"
                  )}
                >
                  <span>@{member.user.username}</span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold px-1 rounded bg-secondary">
                    {member.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {replyingTo && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/25 rounded-lg px-3 py-1.5 mb-2 text-[10px] text-muted-foreground font-medium animate-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-foreground">Replying to @{replyingTo.senderId?.username}</span>
            <span className="truncate opacity-80">"{replyingTo.content}"</span>
          </div>
          <button 
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 mb-2 bg-secondary/20 rounded-lg border border-border/40">
          {attachments.map((url, idx) => (
            <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border bg-card shadow-sm group">
              <img src={url} alt="preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-background/80 border border-border rounded-full flex items-center justify-center text-foreground hover:bg-destructive hover:text-white cursor-pointer select-none"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        
        <button
          onClick={handleAddMockImage}
          disabled={disabled}
          className="p-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition-colors"
          title="Attach Image URL"
        >
          <Image size={15} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="p-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-secondary transition-colors"
            title="Emoji Picker"
          >
            <Smile size={15} />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-card border border-border shadow-xl rounded-lg p-2 grid grid-cols-4 gap-1.5 z-30 animate-in fade-in-90 zoom-in-95 duration-100">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleInsertEmoji(emoji)}
                  className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center text-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Text Input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          style={{ resize: 'none' }}
          className="flex-1 max-h-24 min-h-[36px] bg-transparent border-0 focus:ring-0 text-xs font-normal leading-relaxed text-foreground placeholder:text-muted-foreground py-2 px-1 focus:outline-none scrollbar-none"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          className={cn(
            "p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95",
            (!text.trim() && attachments.length === 0) || disabled
              ? "text-muted-foreground/60 cursor-not-allowed bg-transparent"
              : "text-primary-foreground bg-primary hover:bg-primary/90 shadow-md shadow-primary/10"
          )}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
