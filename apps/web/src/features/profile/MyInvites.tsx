import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../config/api';
import { useToastStore } from '../../store/toastStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Users, Check, X, Mail } from 'lucide-react';

interface Invite {
  _id: string;
  group: {
    _id: string;
    name: string;
    description?: string;
  };
  inviter: {
    username: string;
    email: string;
  };
  createdAt: string;
}

export interface MyInvitesProps {
  hideHeader?: boolean;
}

export const MyInvites: React.FC<MyInvitesProps> = ({ hideHeader = false }) => {
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchInvites = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/invites/pending');
      setInvites(response.data.data.invites || []);
    } catch (err) {
      console.error('Failed to fetch user invites', err);
      addToast('Failed to load invitations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleResponse = async (inviteId: string, action: 'accept' | 'decline', groupName: string, groupId?: string) => {
    setActionId(inviteId);
    try {
      await api.post(`/invites/${inviteId}/${action}`);
      if (action === 'accept') {
        addToast(`Successfully joined group "${groupName}"!`, 'success');
        if (groupId) {
          navigate(`/groups/${groupId}`);
          return;
        }
      } else {
        addToast(`Declined invitation to join "${groupName}"`, 'success');
      }
      fetchInvites();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || `Failed to ${action} invite`, 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!hideHeader && (
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Group Invitations</h1>
          <p className="text-muted-foreground mt-1">
            Review and respond to invitations to join shared expense groups.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <Card key={n} className="border-border">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : invites.length === 0 ? (
        <Card className="border-dashed border-border py-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-secondary/50 text-muted-foreground mb-4">
            <Mail size={32} />
          </div>
          <h3 className="text-lg font-semibold">No invitations found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            You don't have any pending invites to join expense groups at the moment.
          </p>
          <Button onClick={() => navigate('/')} className="mt-6">
            Back to Dashboard
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {invites.map((invite) => (
            <Card key={invite._id} className="border-border hover:border-gray-400 transition-colors">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-secondary text-foreground rounded-lg border border-border shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                      Invitation Received
                    </span>
                    <span className="text-base font-bold text-foreground mt-1 truncate">
                      {invite.group.name}
                    </span>
                    {invite.group.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-normal">
                        {invite.group.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-secondary/30 border border-border rounded-lg p-3 text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Invited by:</span>
                    <span className="font-semibold text-foreground">
                      {invite.inviter.username} ({invite.inviter.email})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="text-muted-foreground">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleResponse(invite._id, 'accept', invite.group.name, invite.group._id)}
                    isLoading={actionId === invite._id}
                    disabled={actionId !== null}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 h-8 font-medium rounded-lg"
                  >
                    <Check size={12} />
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleResponse(invite._id, 'decline', invite.group.name)}
                    disabled={actionId !== null}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 h-8 font-medium rounded-lg"
                  >
                    <X size={12} />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default MyInvites;
