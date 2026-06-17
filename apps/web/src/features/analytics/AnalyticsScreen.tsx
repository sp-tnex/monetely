import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  Lock,
  Unlock,
  Eye,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { api } from '../../config/api';
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

interface AnalyticsScreenProps {
  expenses: any[];
  members: Member[];
  currency: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#ef4444',
  travel: '#3b82f6', 
  rent: '#10b981', 
  utilities: '#f59e0b', 
  entertainment: '#ec4899', 
  shopping: '#8b5cf6', 
  healthcare: '#06b6d4', 
  education: '#84cc16', 
  general: '#64748b', 
};


const CategoryPieChart = lazy(() => import('./components/ChartsModule').then(m => ({ default: m.CategoryPieChart })));
const MemberBarChart = lazy(() => import('./components/ChartsModule').then(m => ({ default: m.MemberBarChart })));
const DailySpendingAreaChart = lazy(() => import('./components/ChartsModule').then(m => ({ default: m.DailySpendingAreaChart })));
const YearlySpendingLineChart = lazy(() => import('./components/ChartsModule').then(m => ({ default: m.YearlySpendingLineChart })));
const SpendingHeatmap = lazy(() => import('./components/ChartsModule').then(m => ({ default: m.SpendingHeatmap })));

const ChartSkeleton = ({ type = 'rect' }: { type?: 'circle' | 'rect' }) => {
  if (type === 'circle') {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] w-full gap-4">
        <div className="h-36 w-36 rounded-full border-[16px] border-muted animate-pulse flex items-center justify-center">
          <div className="h-6 w-14 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex justify-center gap-2.5 w-full mt-3">
          <div className="h-3.5 w-10 bg-muted rounded animate-pulse" />
          <div className="h-3.5 w-10 bg-muted rounded animate-pulse" />
          <div className="h-3.5 w-10 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col justify-between h-[280px] w-full p-4 border border-border rounded-lg bg-secondary/30">
      <div className="flex items-end justify-between h-48 w-full gap-3">
        <div className="h-[20%] w-full bg-muted rounded-t animate-pulse" />
        <div className="h-[50%] w-full bg-muted rounded-t animate-pulse" />
        <div className="h-[80%] w-full bg-muted rounded-t animate-pulse" />
        <div className="h-[40%] w-full bg-muted rounded-t animate-pulse" />
        <div className="h-[70%] w-full bg-muted rounded-t animate-pulse" />
        <div className="h-[30%] w-full bg-muted rounded-t animate-pulse" />
        <div className="h-[90%] w-full bg-muted rounded-t animate-pulse" />
      </div>
      <div className="h-3.5 w-full bg-muted rounded animate-pulse mt-4" />
    </div>
  );
};

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  currency,
}) => {
  const { addToast } = useToastStore();
  const groupId = window.location.pathname.split('/').pop() || '';

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'categories' | 'members' | 'trends' | 'fy' | 'closing'>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [userReport, setUserReport] = useState<any>(null);
  const [groupReport, setGroupReport] = useState<any>(null);
  const [categoryReport, setCategoryReport] = useState<any>(null);
  const [trendReport, setTrendReport] = useState<any>(null);
  const [fyReport, setFyReport] = useState<any>(null);
  const [closingStatuses, setClosingStatuses] = useState<any[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [fyYear, setFyYear] = useState<number>(new Date().getFullYear());
  const [trendView, setTrendView] = useState<'chart' | 'heatmap' | 'grid'>('chart');

  const months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];

  const years = [2024, 2025, 2026, 2027, 2028];

  const currentMonthLabel = months.find((m) => m.value === selectedMonth)?.label || 'Month';

  const fetchAnalyticsData = async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const summaryRes = await api.get(`/groups/${groupId}/analytics/summary?month=${selectedMonth}&year=${selectedYear}`);
      setSummary(summaryRes.data.data);

      const userRes = await api.get(`/groups/${groupId}/analytics/user?month=${selectedMonth}&year=${selectedYear}`);
      setUserReport(userRes.data.data);

      const groupRes = await api.get(`/groups/${groupId}/analytics/group?month=${selectedMonth}&year=${selectedYear}`);
      setGroupReport(groupRes.data.data);

      const catRes = await api.get(`/groups/${groupId}/analytics/categories?month=${selectedMonth}&year=${selectedYear}`);
      setCategoryReport(catRes.data.data);

      const trendRes = await api.get(`/groups/${groupId}/analytics/trends?month=${selectedMonth}&year=${selectedYear}`);
      setTrendReport(trendRes.data.data);

      const closingRes = await api.get(`/groups/${groupId}/analytics/closing/statuses`);
      setClosingStatuses(closingRes.data.data || []);
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to fetch analytics metrics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFyData = async () => {
    if (!groupId) return;
    try {
      const fyRes = await api.get(`/groups/${groupId}/analytics/financial-year?year=${fyYear}`);
      setFyReport(fyRes.data.data);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to fetch FY analytics', 'error');
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [groupId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab === 'fy') {
      fetchFyData();
    }
  }, [groupId, fyYear, activeTab]);

  const handleCloseMonth = async () => {
    if (!groupId) return;
    if (!window.confirm(`Are you sure you want to close accounts for ${currentMonthLabel} ${selectedYear}? This will lock editing and generate an immutable report snapshot.`)) return;

    try {
      await api.post(`/groups/${groupId}/analytics/closing/close`, { month: selectedMonth, year: selectedYear });
      addToast(`Month ${currentMonthLabel} ${selectedYear} closed successfully!`, 'success');
      fetchAnalyticsData();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to close month', 'error');
    }
  };

  const handleReopenMonth = async (monthNum: number, yearNum: number) => {
    if (!groupId) return;
    if (!window.confirm(`Are you sure you want to reopen ${months.find(m => m.value === monthNum)?.label} ${yearNum}?`)) return;

    try {
      await api.post(`/groups/${groupId}/analytics/closing/reopen`, { month: monthNum, year: yearNum });
      addToast(`Month reopened successfully!`, 'success');
      fetchAnalyticsData();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to reopen month', 'error');
    }
  };

  const handleLockMonth = async (monthNum: number, yearNum: number) => {
    if (!groupId) return;
    if (!window.confirm(`Are you sure you want to permanently lock ${months.find(m => m.value === monthNum)?.label} ${yearNum}? It cannot be reopened.`)) return;

    try {
      await api.post(`/groups/${groupId}/analytics/closing/lock`, { month: monthNum, year: yearNum });
      addToast(`Month locked permanently.`, 'success');
      fetchAnalyticsData();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to lock month', 'error');
    }
  };

  const handleViewSnapshot = async (monthNum: number, yearNum: number) => {
    if (!groupId) return;
    try {
      const res = await api.get(`/groups/${groupId}/analytics/closing/snapshot?month=${monthNum}&year=${yearNum}`);
      setSelectedSnapshot(res.data.data);
    } catch (err: any) {
      addToast('Failed to fetch snapshot detail', 'error');
    }
  };


  const maxSpenderVal = useMemo(() => {
    if (!groupReport?.memberContributions || groupReport.memberContributions.length === 0) return 1;
    return Math.max(...groupReport.memberContributions.map((m: any) => m.totalPaid), 1);
  }, [groupReport]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/20 p-4 rounded-xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <Calendar className="text-primary" size={20} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Analysis Target</span>
            <span className="text-sm font-bold text-foreground mt-0.5">{currentMonthLabel} {selectedYear}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            label=""
            value={selectedMonth.toString()}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            options={months.map((m) => ({ label: m.label, value: m.value.toString() }))}
          />
          <Select
            label=""
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            options={years.map((y) => ({ label: y.toString(), value: y.toString() }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap bg-secondary/30 rounded-lg p-1 border border-border">
        {['overview', 'monthly', 'categories', 'members', 'trends', 'fy', 'closing'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 min-w-[90px] py-2 rounded-md text-xs font-bold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-card text-foreground border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'fy' ? 'Financial Years' : tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-secondary/30 rounded-lg border border-border animate-pulse" />
          <div className="h-64 bg-secondary/30 rounded-lg border border-border animate-pulse" />
        </div>
      ) : (
        <> 
          {activeTab === 'overview' && summary && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-border/60 hover:border-primary/30 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3.5 bg-primary/10 rounded-2xl text-primary shrink-0">
                      <DollarSign size={22} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Spent</span>
                      <span className="text-xl font-black mt-1.5 truncate">{currency} {summary.totalSpent.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
                      <Layers size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Transactions</span>
                      <span className="text-xl font-black mt-1.5">{summary.totalExpenses}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Top Spender</span>
                      <span className="text-sm font-bold text-foreground mt-2 truncate">{summary.topSpender}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Daily Average</span>
                      <span className="text-xl font-black mt-1.5">{currency} {summary.averageDailySpend.toFixed(0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">Monthly Spend Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3 py-2">
                    <div className={`p-3 rounded-lg border shrink-0 ${
                      summary.growthPercentage > 0 
                        ? 'bg-destructive/5 text-destructive border-destructive/20' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {summary.growthPercentage > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-black">{summary.growthPercentage > 0 ? '+' : ''}{summary.growthPercentage}%</span>
                      <span className="text-xs text-muted-foreground mt-0.5">Growth compared to previous month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">Budget Utilization</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col py-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-black">{summary.budgetUtilization}%</span>
                      <span className="text-xs text-muted-foreground">utilized</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3 border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          summary.budgetUtilization > 100 ? 'bg-destructive' : (summary.budgetUtilization > 80 ? 'bg-amber-500' : 'bg-primary')
                        }`}
                        style={{ width: `${Math.min(summary.budgetUtilization, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">Month Accounting Status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3 py-2">
                    <div className={`p-3 rounded-lg border shrink-0 ${
                      summary.isClosed 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : 'bg-primary/5 text-primary border-primary/20'
                    }`}>
                      {summary.isClosed ? <Lock size={18} /> : <Unlock size={18} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-extrabold uppercase tracking-wide">{summary.isClosed ? 'Closed & Locked' : 'Open for edits'}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {summary.isClosed ? 'Immutable snapshot active' : 'Transactions can be modified'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {userReport && (
                <Card className="border-border bg-secondary/30">
                  <CardHeader>
                    <CardTitle className="text-base font-black">Your Personal Finance Breakdown ({currentMonthLabel})</CardTitle>
                    <CardDescription>Metrics showing your balance, payment logs, and categories for this month</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    <div className="flex flex-col p-4 bg-card rounded-lg border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Paid</span>
                      <span className="text-xl font-black mt-2 text-foreground">{currency} {userReport.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col p-4 bg-card rounded-lg border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Owed (To Others)</span>
                      <span className="text-xl font-black mt-2 text-destructive">{currency} {userReport.totalOwed.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col p-4 bg-card rounded-lg border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Net Received</span>
                      <span className="text-xl font-black mt-2 text-emerald-500">{currency} {userReport.totalReceived.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="flex flex-col gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Monthly History & Closings</CardTitle>
                  <CardDescription>Overview of previous closed ledger months and snapshots</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Period</th>
                          <th className="pb-3 font-semibold text-right">Closing Status</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {closingStatuses.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                              No closed ledger periods recorded yet.
                            </td>
                          </tr>
                        ) : (
                          closingStatuses.map((st) => (
                            <tr key={st._id} className="text-sm">
                              <td className="py-4 font-bold text-foreground">
                                {months.find((m) => m.value === st.month)?.label} {st.year}
                              </td>
                              <td className="py-4 text-right">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                  st.status === 'LOCKED' 
                                    ? 'bg-destructive/5 text-destructive border-destructive/20' 
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {st.status === 'LOCKED' ? <Lock size={12} /> : <Unlock size={12} />}
                                  {st.status}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => handleViewSnapshot(st.month, st.year)} className="flex items-center gap-1 text-xs">
                                    <Eye size={12} /> View Snapshot
                                  </Button>
                                  {st.status === 'CLOSED' && (
                                    <Button size="sm" variant="danger" onClick={() => handleReopenMonth(st.month, st.year)} className="flex items-center gap-1 text-xs">
                                      Reopen
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'categories' && categoryReport && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Spending by Category</CardTitle>
                    <CardDescription>Relative costs share distribution chart</CardDescription>
                  </CardHeader>
                  <CardContent className="py-6 pt-2">
                    {categoryReport.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-xs">
                        No spending registered in category chart
                      </div>
                    ) : (
                      <Suspense fallback={<ChartSkeleton type="circle" />}>
                        <CategoryPieChart data={categoryReport} currency={currency} />
                      </Suspense>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-7">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Category Insights</CardTitle>
                    <CardDescription>Archived growth and period-over-period details</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex flex-col gap-4">
                      {categoryReport.map((c: any) => {
                        const growth = c.growthComparedToPrevMonth;
                        const isUp = growth > 0;
                        const color = CATEGORY_COLORS[c.category.toLowerCase()] || '#94a3b8';

                        return (
                          <div key={c.category} className="p-3 bg-secondary/30 rounded-lg border border-border flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-foreground capitalize truncate">{c.category}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                                  {c.percentageShare}% of monthly spend
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 shrink-0 text-right">
                              <div className="flex flex-col">
                                <span className="text-sm font-extrabold text-foreground">{currency} {c.totalAmount.toFixed(2)}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">This Month</span>
                              </div>

                              <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md border ${
                                growth === 0 
                                  ? 'bg-secondary text-secondary-foreground border-border' 
                                  : (isUp ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-emerald-50 text-emerald-800 border-emerald-200')
                              }`}>
                                {growth === 0 ? '' : (isUp ? '▲' : '▼')}
                                {Math.abs(growth).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'members' && groupReport && (
            <div className="flex flex-col gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Group Member Contributions</CardTitle>
                  <CardDescription>Breakdown of payments made by members this month</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {groupReport.memberContributions.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No spending record logged for group members this month
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-6">
                        <Suspense fallback={<ChartSkeleton type="rect" />}>
                          <MemberBarChart data={groupReport.memberContributions} currency={currency} />
                        </Suspense>
                      </div>
                      <div className="lg:col-span-6 flex flex-col gap-5 pt-3">
                        {groupReport.memberContributions.map((m: any) => {
                          const ratio = (m.totalPaid / maxSpenderVal) * 100;
                          return (
                            <div key={m.userId} className="flex flex-col gap-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-foreground text-sm">{m.username}</span>
                                <span className="font-black text-muted-foreground">
                                  {currency} {m.totalPaid.toFixed(2)} ({m.count} expenses)
                                </span>
                              </div>
                              <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-300"
                                  style={{ width: `${ratio}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Settlement Summary</CardTitle>
                  <CardDescription>Debts resolved and payments logged this month</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border mb-4 self-start">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Total Settled:</span>
                    <span className="text-base font-black text-emerald-500">{currency} {groupReport.totalSettled.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                    {groupReport.settlementSummary.length === 0 ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        No settlements completed this month.
                      </div>
                    ) : (
                      groupReport.settlementSummary.map((s: any) => (
                        <div key={s._id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-xs">
                          <span className="font-semibold">
                            <strong>{s.payer?.username || 'Member'}</strong> paid <strong>{s.recipient?.username || 'Member'}</strong>
                          </span>
                          <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                            {currency} {s.amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'trends' && trendReport && (
            <div className="flex flex-col gap-6">
              <Card className="border-border">
                <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-4">
                  <div>
                    <CardTitle>Daily Spending (This Month)</CardTitle>
                    <CardDescription>Aggregated transactions per calendar day</CardDescription>
                  </div>
                  
                  <div className="flex bg-secondary/50 rounded-lg p-1 border border-border self-end text-xs font-bold scale-95">
                    {(['chart', 'heatmap', 'grid'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setTrendView(view)}
                        className={`px-3 py-1.5 rounded-md capitalize transition-all cursor-pointer ${
                          trendView === view
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {view === 'grid' ? 'Grid Cards' : view}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="py-6 pt-2">
                  {trendReport.dailySpending.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No daily spending record to plot trends.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {trendView === 'chart' && (
                        <Suspense fallback={<ChartSkeleton type="rect" />}>
                          <DailySpendingAreaChart 
                            data={trendReport.dailySpending} 
                            year={selectedYear} 
                            month={selectedMonth} 
                            currency={currency} 
                          />
                        </Suspense>
                      )}
                      
                      {trendView === 'heatmap' && (
                        <Suspense fallback={<ChartSkeleton type="rect" />}>
                          <SpendingHeatmap 
                            data={trendReport.dailySpending} 
                            year={selectedYear} 
                            month={selectedMonth} 
                            currency={currency} 
                          />
                        </Suspense>
                      )}

                      {trendView === 'grid' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          {trendReport.dailySpending.map((d: any) => (
                            <div key={d.day} className="p-3 bg-secondary/15 rounded-lg border border-border text-center flex flex-col justify-center">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">Day {d.day}</span>
                              <span className="text-sm font-extrabold mt-1 text-foreground">{currency} {d.amount.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'fy' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-secondary/20 p-4 rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Financial Year Selection</span>
                  <span className="text-sm font-bold text-foreground mt-0.5">FY {fyYear}-{fyYear + 1} (April - March)</span>
                </div>
                <Select
                  label=""
                  value={fyYear.toString()}
                  onChange={(e) => setFyYear(parseInt(e.target.value))}
                  options={years.map((y) => ({ label: `FY ${y}-${(y + 1).toString().slice(-2)}`, value: y.toString() }))}
                />
              </div>

              {fyReport ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card className="border-border">
                      <CardContent className="p-5 flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Spent in Year</span>
                        <span className="text-2xl font-black mt-2">{currency} {fyReport.totalSpend.toFixed(2)}</span>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardContent className="p-5 flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Transaction Count</span>
                        <span className="text-2xl font-black mt-2">{fyReport.totalExpenses}</span>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardContent className="p-5 flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest font-extrabold">Yearly Budget Status</span>
                        <span className="text-lg font-extrabold mt-3 uppercase text-primary">
                          {fyReport.budgetPerformance > 0 ? `${fyReport.budgetPerformance}% Utilization` : 'No Budget Set'}
                        </span>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Yearly Spending Trend</CardTitle>
                      <CardDescription>Month-over-month cumulative spending trend for the financial year period</CardDescription>
                    </CardHeader>
                    <CardContent className="py-6 pt-2">
                      {(!fyReport.monthlyBreakdown || fyReport.monthlyBreakdown.length === 0) ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">No monthly trend data available.</div>
                      ) : (
                        <Suspense fallback={<ChartSkeleton type="rect" />}>
                          <YearlySpendingLineChart data={fyReport.monthlyBreakdown} currency={currency} />
                        </Suspense>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Yearly Category Breakdown</CardTitle>
                      <CardDescription>Aggregate category cost totals for the year period</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 flex flex-col gap-3">
                      {fyReport.categorySummary.map((c: any) => (
                        <div key={c.category} className="flex justify-between items-center text-xs p-3 bg-secondary/10 border border-border rounded-lg">
                          <span className="font-bold capitalize">{c.category}</span>
                          <span className="font-extrabold text-foreground">{currency} {c.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Select a year to display Financial Year analytics data.
                </div>
              )}
            </div>
          )}

          {activeTab === 'closing' && (
            <div className="flex flex-col gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Monthly Ledger Closing Controls</CardTitle>
                  <CardDescription>Close or lock month accounts to generate immutable snapshots and prevent edits</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6 pt-2">
                  <div className="p-4 bg-secondary/15 rounded-lg border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col">
                      <h4 className="text-sm font-black text-foreground">Target Period: {currentMonthLabel} {selectedYear}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Closing this month will lock all expenses, compile balance ledgers, and prevent any members from modifying data.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {summary?.isClosed ? (
                        <>
                          <Button variant="secondary" onClick={() => handleReopenMonth(selectedMonth, selectedYear)} className="flex items-center gap-1.5 scale-90">
                            <Unlock size={14} /> Reopen Month
                          </Button>
                          <Button variant="danger" onClick={() => handleLockMonth(selectedMonth, selectedYear)} className="flex items-center gap-1.5 scale-90">
                            <Lock size={14} /> Lock Permanently
                          </Button>
                        </>
                      ) : (
                        <Button onClick={handleCloseMonth} className="flex items-center gap-1.5 scale-90">
                          <Lock size={14} /> Close Month & Create Snapshot
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-4">
                    <h3 className="text-sm font-black uppercase text-muted-foreground tracking-wider">Closing Ledger History</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {closingStatuses.map((st) => (
                        <div key={st._id} className="p-4 bg-card rounded-lg border border-border flex flex-col justify-between hover:border-primary transition-all">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase">{st.year}</span>
                            <span className="text-base font-black text-foreground mt-0.5">
                              {months.find((m) => m.value === st.month)?.label}
                            </span>
                            <span className={`inline-flex items-center gap-1 self-start text-[10px] font-bold px-2 py-0.5 rounded-full mt-3 uppercase tracking-wider ${
                              st.status === 'LOCKED' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {st.status === 'LOCKED' ? <Lock size={10} /> : <Unlock size={10} />}
                              {st.status}
                            </span>
                          </div>
                          
                          <Button size="sm" variant="secondary" onClick={() => handleViewSnapshot(st.month, st.year)} className="mt-4 flex items-center justify-center gap-1.5 text-xs w-full">
                            <FileText size={12} /> View Snapshot Ledger
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedSnapshot && (
            <div className="mt-6">
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-black">Immutable Monthly Snapshot: {months.find(m => m.value === selectedSnapshot.month)?.label} {selectedSnapshot.year}</CardTitle>
                    <CardDescription>Locked ledger record snapshot generated on month close</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedSnapshot(null)}>Close View</Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Spent</span>
                      <p className="text-lg font-black mt-1">{currency} {selectedSnapshot.totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Transactions</span>
                      <p className="text-lg font-black mt-1">{selectedSnapshot.totalExpenses}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Top Category</span>
                      <p className="text-sm font-bold mt-2 truncate capitalize">{selectedSnapshot.topCategory}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Top Spender</span>
                      <p className="text-sm font-bold mt-2 truncate">{selectedSnapshot.topSpender}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Category Summary</h4>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {selectedSnapshot.categorySummary.map((c: any) => (
                          <div key={c.category} className="flex justify-between items-center text-xs p-2 bg-card rounded-md border border-border">
                            <span className="font-semibold capitalize">{c.category}</span>
                            <span className="font-bold">{currency} {c.amount.toFixed(2)} ({c.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Member Contributions</h4>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {selectedSnapshot.memberSummary.map((m: any) => (
                          <div key={m.user} className="flex justify-between items-center text-xs p-2 bg-card rounded-md border border-border">
                            <span className="font-semibold">{m.username}</span>
                            <span className="font-bold text-muted-foreground">Paid: {currency} {m.paid.toFixed(2)} | Owed: {currency} {m.owed.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsScreen;
