import React, { useState, useEffect } from 'react';
import { api } from '../../config/api';
import { useToastStore } from '../../store/toastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Mail, Link as LinkIcon, Copy, Check, Clock, Trash, Download, RefreshCw } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onInviteSuccess?: () => void;
}

interface Invite {
  _id: string;
  type: 'EMAIL' | 'USERNAME' | 'LINK';
  inviteeEmail?: string;
  inviteeUsername?: string;
  token: string;
  expiresAt?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  createdAt: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

const formatExpiry = (expiresAt?: string) => {
  if (!expiresAt) return 'Never expires';
  const date = new Date(expiresAt);
  if (date.getTime() < Date.now()) return 'Expired';
  return `Expires ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onInviteSuccess,
}) => {
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'user' | 'link'>('user');

  const [inviteMethod, setInviteMethod] = useState<'EMAIL' | 'USERNAME'>('EMAIL');
  const [inviteValue, setInviteValue] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  const fetchInvites = async () => {
    if (!groupId) return;
    setIsLoadingInvites(true);
    try {
      const response = await api.get(`/groups/${groupId}/invites`);
      setInvites(response.data.data.invites || []);
    } catch (err) {
      console.error('Failed to fetch group invites', err);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvites();
      setInviteValue('');
      setInviteRole('MEMBER');
      setGeneratedLink('');
      setQrCodeDataUrl('');
    }
  }, [isOpen, groupId]);

  const handleUserInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteValue.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        type: inviteMethod,
        role: inviteRole
      };
      if (inviteMethod === 'EMAIL') {
        payload.email = inviteValue.trim();
      } else {
        payload.username = inviteValue.trim();
      }

      await api.post(`/groups/${groupId}/invites`, payload);
      addToast(`Invite sent successfully to ${inviteValue}!`, 'success');
      setInviteValue('');
      fetchInvites();
      if (onInviteSuccess) onInviteSuccess();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to send invite', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post(`/groups/${groupId}/invites`, {
        type: 'LINK',
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });

      const { invite, qrCode } = response.data.data;
      const origin = window.location.origin;
      const link = `${origin}/invite/${invite.token}`;

      setGeneratedLink(link);
      if (qrCode) {
        setQrCodeDataUrl(qrCode);
      }
      addToast('Invite link generated successfully!', 'success');
      fetchInvites();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to generate invite link', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    addToast('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await api.delete(`/groups/${groupId}/invites/${inviteId}`);
      addToast('Invite revoked successfully', 'success');
      fetchInvites();
      if (onInviteSuccess) onInviteSuccess();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to revoke invite', 'error');
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await api.post(`/groups/${groupId}/invites/${inviteId}/resend`);
      addToast('Invite resent successfully!', 'success');
      fetchInvites();
      if (onInviteSuccess) onInviteSuccess();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to resend invite', 'error');
    }
  };


  const userInvites = invites.filter(inv => inv.type !== 'LINK');
  const linkInvites = invites.filter(inv => inv.type === 'LINK');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Members to Group" className="max-w-xl">
      <div className="flex flex-col gap-6">
        <div className="flex border-b border-border/80 pb-px">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
              activeTab === 'user'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail size={16} />
            Invite User
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
              activeTab === 'link'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LinkIcon size={16} />
            Link & QR Code
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'user' && (
          <div className="flex flex-col gap-5">
            <form onSubmit={handleUserInviteSubmit} className="flex flex-col gap-4">
              <div className="flex bg-secondary/50 p-1 rounded-lg border border-border max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    setInviteMethod('EMAIL');
                    setInviteValue('');
                  }}
                  className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                    inviteMethod === 'EMAIL' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteMethod('USERNAME');
                    setInviteValue('');
                  }}
                  className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                    inviteMethod === 'USERNAME' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Username
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <Input
                    label={inviteMethod === 'EMAIL' ? 'Email Address' : 'Username'}
                    placeholder={inviteMethod === 'EMAIL' ? 'friend@example.com' : 'friend_username'}
                    value={inviteValue}
                    onChange={(e) => setInviteValue(e.target.value)}
                    type={inviteMethod === 'EMAIL' ? 'email' : 'text'}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Assign Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 py-1.5 border border-border bg-card rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <Button type="submit" isLoading={isSubmitting} className="h-10 px-5 w-full sm:w-auto flex items-center justify-center gap-2 shrink-0">
                  Send Invite
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-2 mt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pending Direct Invites
              </h4>
              {isLoadingInvites ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Loading invites...</div>
              ) : userInvites.length === 0 ? (
                <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                  No pending direct invites
                </div>
              ) : (
                <div className="flex flex-col border border-border rounded-lg divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {userInvites.map((inv) => (
                    <div key={inv._id} className="flex items-center justify-between p-3 text-xs">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                          {inv.type === 'EMAIL' ? inv.inviteeEmail : `@${inv.inviteeUsername}`}
                          <span className="text-[9px] font-black uppercase rounded-full bg-secondary text-muted-foreground px-1.5 py-0.5 border scale-90">
                            {inv.role || 'MEMBER'}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          Sent {new Date(inv.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResendInvite(inv._id)}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-all cursor-pointer"
                          title="Resend Invite"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv._id)}
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                          title="Revoke Invite"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'link' && (
          <div className="flex flex-col gap-5">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Link Expiration
                </label>
                <select
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-10 px-3 py-1.5 border border-border bg-card rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Never (Permanent Link)</option>
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
              <Button onClick={handleGenerateLink} isLoading={isGenerating} className="h-10 px-5 flex items-center gap-2">
                Generate Link & QR
              </Button>
            </div>

            {generatedLink && (
              <div className="flex flex-col gap-3 p-4 bg-secondary/20 rounded-xl border border-border/80">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Shareable Link</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 border border-border bg-card rounded-lg text-xs outline-none"
                    />
                    <Button onClick={handleCopyLink} className="p-2 shrink-0 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>

                {qrCodeDataUrl && (
                  <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
                    <div className="bg-white p-2 rounded-lg border border-border shrink-0">
                      <img src={qrCodeDataUrl} alt="Invite QR Code" className="w-28 h-28 object-contain" />
                    </div>
                    <div className="flex flex-col gap-2 text-center md:text-left">
                      <span className="text-xs font-semibold">QR Code Invite</span>
                      <p className="text-[10px] text-muted-foreground max-w-[200px]">
                        Scan this QR code with a phone camera to quickly join the group.
                      </p>
                      <a
                        href={qrCodeDataUrl}
                        download={`invite_qr_${groupId}.png`}
                        className="text-xs flex items-center justify-center md:justify-start gap-1 text-primary font-bold hover:underline mt-1"
                      >
                        <Download size={12} />
                        Download QR Code
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Share Links
              </h4>
              {isLoadingInvites ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Loading invites...</div>
              ) : linkInvites.length === 0 ? (
                <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                  No active share links generated
                </div>
              ) : (
                <div className="flex flex-col border border-border rounded-lg divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {linkInvites.map((inv) => {
                    const link = `${window.location.origin}/invite/${inv.token}`;
                    return (
                      <div key={inv._id} className="flex items-center justify-between p-3 text-xs gap-4">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-primary truncate select-all">
                            {link}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            {formatExpiry(inv.expiresAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link);
                              addToast('Copied to clipboard', 'success');
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                            title="Copy link"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv._id)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Revoke link"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
