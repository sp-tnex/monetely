import React, { useState, useEffect } from 'react';
import { api } from '../../config/api';
import { useToastStore } from '../../store/toastStore';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Sparkles,
  UserPlus,
  UserMinus,
  LogOut,
  Mail,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RefreshCw,
  Shield,
  PlusCircle,
  Edit3,
  Trash2,
  DollarSign,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface ActivityItem {
  _id: string;
  group: string;
  actor: {
    _id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityHistoryProps {
  groupId: string;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ groupId }) => {
  const { addToast } = useToastStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/groups/${groupId}/activity`);
      setActivities(response.data.data.activities || []);
    } catch (err: any) {
      console.error('Failed to fetch group activities:', err);
      addToast(err.response?.data?.message || 'Failed to load activity history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchActivities();
    }
  }, [groupId]);

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'GROUP_CREATED':
        return {
          icon: <Sparkles size={16} />,
          colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25',
          dotColor: 'bg-indigo-500'
        };
      case 'MEMBER_ADDED':
        return {
          icon: <UserPlus size={16} />,
          colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
          dotColor: 'bg-emerald-500'
        };
      case 'MEMBER_REMOVED':
        return {
          icon: <UserMinus size={16} />,
          colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/25',
          dotColor: 'bg-rose-500'
        };
      case 'MEMBER_LEFT':
        return {
          icon: <LogOut size={16} />,
          colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
          dotColor: 'bg-amber-500'
        };
      case 'MEMBER_INVITED':
        return {
          icon: <Mail size={16} />,
          colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/25',
          dotColor: 'bg-purple-500'
        };
      case 'INVITE_ACCEPTED':
        return {
          icon: <CheckCircle2 size={16} />,
          colorClass: 'text-green-500 bg-green-500/10 border-green-500/25',
          dotColor: 'bg-green-500'
        };
      case 'INVITE_DECLINED':
        return {
          icon: <XCircle size={16} />,
          colorClass: 'text-red-500 bg-red-500/10 border-red-500/25',
          dotColor: 'bg-red-500'
        };
      case 'INVITE_REVOKED':
        return {
          icon: <ShieldAlert size={16} />,
          colorClass: 'text-orange-500 bg-orange-500/10 border-orange-500/25',
          dotColor: 'bg-orange-500'
        };
      case 'INVITE_RESENT':
        return {
          icon: <RefreshCw size={16} className="animate-spin-slow" />,
          colorClass: 'text-sky-500 bg-sky-500/10 border-sky-500/25',
          dotColor: 'bg-sky-500'
        };
      case 'ROLE_CHANGED':
        return {
          icon: <Shield size={16} />,
          colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
          dotColor: 'bg-amber-500'
        };
      case 'EXPENSE_ADDED':
        return {
          icon: <PlusCircle size={16} />,
          colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
          dotColor: 'bg-emerald-500'
        };
      case 'EXPENSE_UPDATED':
        return {
          icon: <Edit3 size={16} />,
          colorClass: 'text-teal-500 bg-teal-500/10 border-teal-500/25',
          dotColor: 'bg-teal-500'
        };
      case 'EXPENSE_DELETED':
        return {
          icon: <Trash2 size={16} />,
          colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/25',
          dotColor: 'bg-rose-500'
        };
      case 'SETTLEMENT_RECORDED':
        return {
          icon: <DollarSign size={16} />,
          colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
          dotColor: 'bg-emerald-500'
        };
      default:
        return {
          icon: <Activity size={16} />,
          colorClass: 'text-muted-foreground bg-secondary border-border/80',
          dotColor: 'bg-muted-foreground'
        };
    }
  };

  const getUserInitials = (username: string) => {
    if (!username) return 'U';
    return username.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 py-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1 pt-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-border rounded-2xl bg-secondary/5">
        <div className="p-4 bg-secondary/40 rounded-full text-muted-foreground mb-4">
          <Activity size={32} />
        </div>
        <h4 className="text-base font-bold text-foreground">No activities recorded yet</h4>
        <p className="text-xs text-muted-foreground max-w-xs mt-1">
          Actions like adding members, updating roles, and recording expenses will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Group Activity History
        </h3>
        <button
          onClick={fetchActivities}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-all"
        >
          <RefreshCw size={12} />
          Refresh Log
        </button>
      </div>

      <div className="relative border-l border-border/60 ml-4 md:ml-6 pl-6 md:pl-8 space-y-6">
        {activities.map((item) => {
          const { icon, colorClass, dotColor } = getActionStyle(item.action);
          const initials = getUserInitials(item.actor?.username || 'System');

          return (
            <div key={item._id} className="relative group/item">
              <span className={cn(
                "absolute -left-[31px] md:-left-[39px] top-1.5 flex h-4 w-4 rounded-full border border-card items-center justify-center shadow-sm shrink-0",
                dotColor
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-card" />
              </span>

              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card hover:bg-secondary/15 border border-border/60 hover:border-border p-4 rounded-2xl shadow-sm transition-all duration-200">
                <div className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                  colorClass
                )}>
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {item.actor && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-black uppercase shrink-0">
                          {initials}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {item.actor.username}
                        </span>
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock size={11} />
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
