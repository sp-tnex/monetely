import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../config/api';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  PlusCircle,
  Search,
  ArrowRight,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

interface Group {
  _id: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: string;
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    welcomeBack: "Welcome Back",
    monitorBalances: "Monitor your shared balances, settle up debts, and manage expenses.",
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    createGroup: "Create New Group",
  },
  es: {
    welcomeBack: "Bienvenido de nuevo",
    monitorBalances: "Monitoree sus saldos compartidos, liquide deudas y gestione gastos.",
    goodMorning: "Buenos días",
    goodAfternoon: "Buenas tardes",
    goodEvening: "Buenas noches",
    createGroup: "Crear nuevo grupo",
  },
  fr: {
    welcomeBack: "Bon retour",
    monitorBalances: "Suivez vos soldes partagés, réglez vos dettes et gérez vos dépenses.",
    goodMorning: "Bon matin",
    goodAfternoon: "Bon après-midi",
    goodEvening: "Bonsoir",
    createGroup: "Créer un groupe",
  },
  de: {
    welcomeBack: "Willkommen zurück",
    monitorBalances: "Überwachen Sie Ihre gemeinsamen Kontostände, begleichen Sie Schulden und verwalten Sie Ausgaben.",
    goodMorning: "Guten Morgen",
    goodAfternoon: "Guten Tag",
    goodEvening: "Guten Abend",
    createGroup: "Neue Gruppe erstellen",
  },
  ja: {
    welcomeBack: "おかえりなさい",
    monitorBalances: "共有バランスの監視、負債の精算、経費の管理を行います。",
    goodMorning: "おはようございます",
    goodAfternoon: "こんにちは",
    goodEvening: "こんばんは",
    createGroup: "新規グループ作成",
  },
  zh: {
    welcomeBack: "欢迎回来",
    monitorBalances: "监控您的共享余额，结清债务，并管理支出。",
    goodMorning: "早上好",
    goodAfternoon: "下午好",
    goodEvening: "晚上好",
    createGroup: "创建新小组",
  },
  hi: {
    welcomeBack: "वापसी पर स्वागत है",
    monitorBalances: "अपने साझा संतुलन की निगरानी करें, ऋण चुकाएं, और खर्चों का प्रबंधन करें।",
    goodMorning: "शुभ प्रभात",
    goodAfternoon: "नमस्कार",
    goodEvening: "शुभ संध्या",
    createGroup: "नया समूह बनाएं",
  }
};

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'owed' | 'owe' | 'settled'>('all');
  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [isBalancesLoading, setIsBalancesLoading] = useState(true);

  const [groupBalances, setGroupBalances] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<{ owed: Record<string, number>; owe: Record<string, number> }>({
    owed: {},
    owe: {},
  });

  const [groupsPage, setGroupsPage] = useState(1);
  const GROUPS_PER_PAGE = 6;

  useEffect(() => {
    setGroupsPage(1);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    const fetchGroupsAndBalances = async () => {
      setIsGroupsLoading(true);
      setIsBalancesLoading(true);
      try {
        const response = await api.get('/groups');
        const groupsData: Group[] = response.data.data.groups;
        setGroups(groupsData);
        setIsGroupsLoading(false);

        if (groupsData.length === 0) {
          setIsBalancesLoading(false);
          return;
        }

        const settlementsPromises = groupsData.map(async (group) => {
          try {
            const res = await api.get(`/groups/${group._id}/settlements`);
            return { groupId: group._id, transactions: res.data.data.transactions || [] };
          } catch (err) {
            console.error(`Failed to fetch settlements for group ${group._id}`, err);
            return { groupId: group._id, transactions: [] };
          }
        });

        const settlementsResults = await Promise.all(settlementsPromises);

        const balances: Record<string, number> = {};
        const owedMap: Record<string, number> = {};
        const oweMap: Record<string, number> = {};

        settlementsResults.forEach(({ groupId, transactions }) => {
          const groupObj = groupsData.find((g) => g._id === groupId);
          const currency = groupObj?.currency || 'USD';
          
          let groupBalance = 0;
          transactions.forEach((tx: any) => {
            if (tx.from === user?.id) {
              groupBalance -= tx.amount;
              oweMap[currency] = (oweMap[currency] || 0) + tx.amount;
            } else if (tx.to === user?.id) {
              groupBalance += tx.amount;
              owedMap[currency] = (owedMap[currency] || 0) + tx.amount;
            }
          });
          balances[groupId] = groupBalance;
        });

        setGroupBalances(balances);
        setTotals({ owed: owedMap, owe: oweMap });
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
        setIsGroupsLoading(false);
      } finally {
        setIsBalancesLoading(false);
      }
    };

    if (user?.id) {
      fetchGroupsAndBalances();
    }
  }, [user?.id]);

  const computeNetBalance = () => {
    const net: Record<string, number> = {};
    const currencies = new Set([...Object.keys(totals.owed), ...Object.keys(totals.owe)]);
    currencies.forEach((curr) => {
      const owed = totals.owed[curr] || 0;
      const owe = totals.owe[curr] || 0;
      const diff = owed - owe;
      if (Math.abs(diff) > 0.01) {
        net[curr] = diff;
      }
    });
    return net;
  };

  const netBalance = computeNetBalance();

  const getGreeting = () => {
    const lang = user?.language || 'en';
    const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
    try {
      const userTimeZone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const hourStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: userTimeZone,
      }).format(new Date());
      
      const cleanHour = hourStr.replace(/\D/g, '');
      const hr = parseInt(cleanHour, 10);
      
      if (!isNaN(hr)) {
        if (hr >= 5 && hr < 12) return t.goodMorning;
        if (hr >= 12 && hr < 17) return t.goodAfternoon;
        return t.goodEvening;
      }
    } catch (e) {
      console.error('Failed to calculate user timezone greeting', e);
    }
    
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return t.goodMorning;
    if (hr >= 12 && hr < 17) return t.goodAfternoon;
    return t.goodEvening;
  };

  const getInitials = (name: string) => {
    if (!name) return 'GP';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const balance = groupBalances[group._id] || 0;
    if (activeFilter === 'owed') return balance > 0.01;
    if (activeFilter === 'owe') return balance < -0.01;
    if (activeFilter === 'settled') return Math.abs(balance) <= 0.01;
    return true;
  });

  const renderCurrencyPills = (totalsMap: Record<string, number>, type: 'owed' | 'owe' | 'net') => {
    const activeTotals = Object.entries(totalsMap).filter(([_, val]) => Math.abs(val) > 0.01);
    if (activeTotals.length === 0) {
      return <span className="text-sm font-semibold text-muted-foreground">All Settled Up</span>;
    }
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {activeTotals.map(([curr, val]) => {
          let badgeClass = 'bg-secondary/40 border-border text-muted-foreground';
          if (type === 'owed' || (type === 'net' && val > 0)) {
            badgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          } else if (type === 'owe' || (type === 'net' && val < 0)) {
            badgeClass = 'bg-destructive/10 text-destructive border-destructive/20';
          }
          return (
            <span
              key={curr}
              className={cn(
                "text-sm font-bold px-2.5 py-1 rounded-lg border tracking-wide",
                badgeClass
              )}
            >
              {curr} {Math.abs(val).toFixed(2)}
            </span>
          );
        })}
      </div>
    );
  };

  const isNetPositive = Object.values(netBalance).some(val => val > 0.01);
  const isNetNegative = Object.values(netBalance).some(val => val < -0.01);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6">
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground text-lg font-bold shrink-0 uppercase">
              {user?.username ? user.username.slice(0, 2) : 'ME'}
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {(() => {
                  const lang = user?.language || 'en';
                  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
                  return t.welcomeBack;
                })()}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                {getGreeting()}, {user?.username || 'User'}!
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(() => {
                  const lang = user?.language || 'en';
                  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
                  return t.monitorBalances;
                })()}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/groups/new')} className="shrink-0 flex items-center gap-2 font-medium py-2 text-xs">
            <PlusCircle size={14} />
            Create New Group
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={cn(
          "border relative overflow-hidden bg-card rounded-lg",
          isNetPositive ? "border-green-600/30" :
          isNetNegative ? "border-red-600/30" :
          "border-border"
        )}>
          <div className="p-5 flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
                Net Balance
              </span>
              <div className="mt-1 min-h-[32px] flex items-center">
                {isBalancesLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  renderCurrencyPills(netBalance, 'net')
                )}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1.5 block">
                {isNetPositive ? 'Overall outstanding receivable' : isNetNegative ? 'Overall outstanding payable' : 'Your balances are settled up'}
              </span>
            </div>
            <div className={cn(
              "p-2 rounded-lg border shrink-0",
              isNetPositive ? "bg-green-500/10 border-green-500/20 text-green-600" :
              isNetNegative ? "bg-destructive/10 border-destructive/20 text-destructive" :
              "bg-secondary text-muted-foreground border-border"
            )}>
              {isNetPositive ? <TrendingUp size={16} /> : isNetNegative ? <TrendingDown size={16} /> : <Award size={16} />}
            </div>
          </div>
        </div>

        <div className="border border-border bg-card relative overflow-hidden rounded-lg">
          <div className="p-5 flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
                You Are Owed
              </span>
              <div className="mt-1 min-h-[32px] flex items-center">
                {isBalancesLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  renderCurrencyPills(totals.owed, 'owed')
                )}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1.5 block flex items-center gap-1">
                <ArrowUpRight size={10} className="text-green-600 shrink-0" /> Total pending collection
              </span>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 shrink-0">
              <Wallet size={16} />
            </div>
          </div>
        </div>

        <div className="border border-border bg-card relative overflow-hidden rounded-lg sm:col-span-2 lg:col-span-1">
          <div className="p-5 flex items-start justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
                You Owe
              </span>
              <div className="mt-1 min-h-[32px] flex items-center">
                {isBalancesLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  renderCurrencyPills(totals.owe, 'owe')
                )}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1.5 block flex items-center gap-1">
                <ArrowDownRight size={10} className="text-destructive shrink-0" /> Total pending payments
              </span>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive shrink-0">
              <Wallet size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Expense Groups</h2>
            <p className="text-xs text-muted-foreground">Select a group to log bills or process settlements.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="flex items-center bg-secondary/80 border border-border p-0.5 rounded-lg shrink-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'owed', label: 'Owed' },
                { id: 'owe', label: 'Owe' },
                { id: 'settled', label: 'Settled' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={cn(
                    "text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap select-none border",
                    activeFilter === tab.id
                      ? "bg-card text-foreground border-border font-bold shadow-none"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-52 shrink-0">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg bg-card text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {isGroupsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-border bg-card rounded-lg p-5 flex flex-col gap-3">
                <div className="flex gap-2.5 items-center">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full mt-2 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="border border-dashed border-border py-12 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="p-3.5 rounded-full bg-secondary text-muted-foreground mb-3">
              <Users size={24} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No groups found</h3>
            <p className="text-muted-foreground text-xs max-w-xs mt-0.5 px-4">
              {searchQuery || activeFilter !== 'all'
                ? 'Try adjusting your search terms or active filters.'
                : 'Create your first expense sharing group to start splitting bills.'}
            </p>
            {activeFilter === 'all' && !searchQuery ? (
              <Button onClick={() => navigate('/groups/new')} className="mt-4 flex items-center gap-1.5 text-xs py-1.5">
                <PlusCircle size={14} />
                Create New Group
              </Button>
            ) : (
              <Button onClick={() => { setSearchQuery(''); setActiveFilter('all'); }} variant="secondary" className="mt-4 text-xs font-semibold rounded-lg py-1.5">
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const startIndex = (groupsPage - 1) * GROUPS_PER_PAGE;
                const endIndex = startIndex + GROUPS_PER_PAGE;
                const groupsToDisplay = filteredGroups.slice(startIndex, endIndex);

                return groupsToDisplay.map((group) => {
                  const balance = groupBalances[group._id] || 0;
                  const initials = getInitials(group.name);
                  const isOwed = balance > 0.01;

                  return (
                    <div
                      key={group._id}
                      onClick={() => navigate(`/groups/${group._id}`)}
                      className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-5 hover:bg-secondary/20 transition-colors duration-150 cursor-pointer overflow-hidden"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-foreground bg-secondary border border-border font-bold text-sm shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col items-end shrink-0 select-none">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary border border-border/80 uppercase tracking-widest text-muted-foreground">
                              {group.currency}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-2 font-normal">
                              Created {new Date(group.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-foreground mt-3 group-hover:text-primary transition-colors line-clamp-1">
                          {group.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px] font-normal leading-relaxed">
                          {group.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest select-none">Your Balance</span>
                          {isBalancesLoading ? (
                            <Skeleton className="h-4 w-16" />
                          ) : Math.abs(balance) <= 0.01 ? (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border select-none">
                              Settled
                            </span>
                          ) : isOwed ? (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded border border-green-200">
                              Receivable: {group.currency} {balance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-destructive bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-200">
                              Payable: {group.currency} {Math.abs(balance).toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground group-hover:text-foreground mt-0.5">
                          <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold select-none">
                            View details
                          </span>
                          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {filteredGroups.length > GROUPS_PER_PAGE && (
              <div className="flex justify-between items-center bg-card border border-border p-3 rounded-lg select-none">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={groupsPage === 1}
                  onClick={() => setGroupsPage(prev => Math.max(prev - 1, 1))}
                  className="text-xs h-8 px-3"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground font-semibold">
                  Page {groupsPage} of {Math.ceil(filteredGroups.length / GROUPS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={groupsPage >= Math.ceil(filteredGroups.length / GROUPS_PER_PAGE)}
                  onClick={() => setGroupsPage(prev => Math.min(prev + 1, Math.ceil(filteredGroups.length / GROUPS_PER_PAGE)))}
                  className="text-xs h-8 px-3"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
