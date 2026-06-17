import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../config/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Users, LogIn, UserPlus, ShieldAlert, Check } from 'lucide-react';

export const InviteAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/invites/token/${token}`);
        setInvite(response.data.data.invite);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'This invite link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsProcessing(true);
    try {
      await api.post(`/invites/token/${token}/accept`);
      addToast(`Joined group successfully!`, 'success');
      if (invite?.group?._id) {
        navigate(`/groups/${invite.group._id}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to join group', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setIsProcessing(true);
    try {
      await api.post(`/invites/token/${token}/decline`);
      addToast('Invite declined', 'success');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to decline invite', 'error');
      setIsProcessing(false);
    }
  };

  const handleRedirect = (path: '/login' | '/register') => {
    if (token) {
      localStorage.setItem('pending_invite_token', token);
    }
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border shadow-xl">
          <CardContent className="p-8 flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full rounded-lg mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5 dark:bg-destructive/10 shadow-xl">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="p-4 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <ShieldAlert size={36} />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">Invite Error</CardTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full mt-4 bg-secondary text-foreground hover:bg-secondary/80 border">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) return null;

  const groupName = invite.group?.name || 'Shared Expense Group';
  const groupDescription = invite.group?.description || '';
  const inviterName = invite.inviter?.username || 'Someone';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-4 rounded-full bg-primary/10 text-primary border border-primary/20 w-fit mb-4">
            <Users size={32} />
          </div>
          <CardTitle className="text-2xl font-bold">Group Invitation</CardTitle>
          <CardDescription>
            You have been invited to join a group on Monetely
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 flex flex-col gap-6">
          <div className="bg-secondary/45 border rounded-xl p-5 text-center flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Invited By
            </span>
            <span className="text-base font-bold text-foreground">
              {inviterName}
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
              To Join Group
            </span>
            <span className="text-xl font-extrabold text-primary break-words">
              {groupName}
            </span>
            {groupDescription && (
              <p className="text-xs text-muted-foreground italic mt-1 break-words">
                "{groupDescription}"
              </p>
            )}
          </div>

          {user ? (
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleAccept}
                isLoading={isProcessing}
                className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Check size={16} />
                Accept Invite & Join Group
              </Button>
              <Button
                onClick={handleDecline}
                disabled={isProcessing}
                className="w-full h-11 bg-secondary text-foreground hover:bg-secondary/80 border text-sm font-semibold"
              >
                Decline Invitation
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs text-muted-foreground px-4">
                Please log in or register a new Monetely account to accept this invitation.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <Button
                  onClick={() => handleRedirect('/login')}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold h-11"
                >
                  <LogIn size={14} />
                  Log In
                </Button>
                <Button
                  onClick={() => handleRedirect('/register')}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold h-11 bg-secondary text-foreground hover:bg-secondary/80 border"
                >
                  <UserPlus size={14} />
                  Sign Up
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default InviteAccept;
