import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Archive,
  Download,
  Trash2,
  RefreshCw,
  HardDrive,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Select } from '../../components/ui/Select';
import { api } from '../../config/api';
import { useToastStore } from '../../store/toastStore';

interface SettingsState {
  retentionPolicy: string;
  autoArchiveEnabled: boolean;
  notifyBeforeDeletion: boolean;
  exportBeforeDeletion: boolean;
  allowPermanentDeletion: boolean;
  monthlyBudget: number;
}

export const RetentionSettings: React.FC = () => {
  const { addToast } = useToastStore();

  const [settings, setSettings] = useState<SettingsState>({
    retentionPolicy: 'FOREVER',
    autoArchiveEnabled: true,
    notifyBeforeDeletion: true,
    exportBeforeDeletion: true,
    allowPermanentDeletion: false,
    monthlyBudget: 0,
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [archiveCutoffMonths, setArchiveCutoffMonths] = useState<string>('6');

  const policyOptions = [
    { label: 'Keep Data Forever', value: 'FOREVER' },
    { label: 'Delete after 6 Months', value: 'SIX_MONTHS' },
    { label: 'Delete after 1 Year', value: 'ONE_YEAR' },
    { label: 'Delete after 2 Years', value: 'TWO_YEARS' },
    { label: 'Delete after 5 Years', value: 'FIVE_YEARS' },
  ];

  const fetchSettingsAndWarnings = async () => {
    try {
      const [settingsRes, warningsRes] = await Promise.all([
        api.get('/users/retention'),
        api.get('/users/retention/warnings'),
      ]);

      if (settingsRes.data?.data) {
        setSettings(settingsRes.data.data);
      }
      setWarnings(warningsRes.data.data || []);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to load retention settings', 'error');
    }
  };

  useEffect(() => {
    fetchSettingsAndWarnings();
  }, []);

  const handleUpdateSettings = async (updates: Partial<SettingsState>) => {
    setIsUpdating(true);
    
    setSettings((prev) => ({ ...prev, ...updates }));

    try {
      const res = await api.patch('/users/retention', {
        ...settings,
        ...updates
      });

      if (res.data?.data) {
        setSettings(res.data.data);
      }
      addToast('Retention settings saved successfully', 'success');
    } catch (err: any) {
      fetchSettingsAndWarnings();
      addToast('Failed to update retention preferences', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManualArchive = async () => {
    setIsActionLoading('archive');
    try {
      const now = new Date();
      now.setMonth(now.getMonth() - parseInt(archiveCutoffMonths));

      const res = await api.post('/users/retention/archive', { olderThan: now.toISOString() });
      addToast(`Successfully archived ${res.data.data.count} expenses!`, 'success');
    } catch (err: any) {
      addToast('Failed to archive expenses', 'error');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRestore = async () => {
    setIsActionLoading('restore');
    try {
      const res = await api.post('/users/retention/restore');
      addToast(`Restored ${res.data.data.count} expenses back to ACTIVE!`, 'success');
    } catch (err: any) {
      addToast('Failed to restore data', 'error');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'html') => {
    try {
      const response = await api.get(`/users/retention/export?format=${format}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monetely_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Backup export downloaded successfully!', 'success');
    } catch (err: any) {
      addToast('Export download failed', 'error');
    }
  };

  const handlePurge = async () => {
    if (!window.confirm('WARNING: This will immediately soft-delete all currently ARCHIVED expenses. This action cannot be undone unless restored from a backup. Proceed?')) return;
    setIsActionLoading('purge');
    try {
      const res = await api.delete('/users/retention/archive');
      addToast(`Permanently deleted ${res.data.data.count} archived expenses.`, 'success');
    } catch (err: any) {
      addToast('Failed to delete archived records', 'error');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleWarningAction = async (warningId: string, action: 'APPROVE' | 'CANCEL' | 'EXTEND') => {
    try {
      await api.post(`/users/retention/warnings/${warningId}/action`, { action });
      addToast(`Cleanup scheduled resolved as: ${action}`, 'success');
      fetchSettingsAndWarnings();
    } catch (err: any) {
      addToast('Failed to perform warning resolution action', 'error');
    }
  };

  const formatTargetMonth = (monthNum: number, yearNum: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[monthNum - 1] || 'Month ' + monthNum} ${yearNum}`;
  };

  const isGlobalLoading = isUpdating || isActionLoading !== null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
            <HardDrive size={18} />
          </div>
          <div>
            <CardTitle className="text-lg">Data Retention Preferences</CardTitle>
            <CardDescription>Configure how long historical expense data is stored before auto-archiving or deleting</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 bg-secondary/30 rounded-lg border border-border">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Retention Policy Period</span>
              <span className="text-xs text-muted-foreground mt-0.5">Define your account lifetime for expenses</span>
            </div>
            <div className="w-full sm:w-64">
              <Select
                label=""
                value={settings.retentionPolicy}
                onChange={(e) => handleUpdateSettings({ retentionPolicy: e.target.value })}
                options={policyOptions}
                disabled={isGlobalLoading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold">Auto-Archive Old Records</span>
                <span className="text-xs text-muted-foreground mt-0.5">Automatically move old transactions into optimized archive storage instead of deleting</span>
              </div>
              <Switch
                checked={settings.autoArchiveEnabled}
                onChange={(checked) => handleUpdateSettings({ autoArchiveEnabled: checked })}
                disabled={isGlobalLoading}
              />
            </div>

            <div className="flex justify-between items-center py-3 border-b border-border">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold">Notify Before Deletion</span>
                <span className="text-xs text-muted-foreground mt-0.5">Receive warnings 7 days before scheduled cleanup tasks execute</span>
              </div>
              <Switch
                checked={settings.notifyBeforeDeletion}
                onChange={(checked) => handleUpdateSettings({ notifyBeforeDeletion: checked })}
                disabled={isGlobalLoading}
              />
            </div>

            <div className="flex justify-between items-center py-3 border-b border-border">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold">Export Before Cleanup</span>
                <span className="text-xs text-muted-foreground mt-0.5">Generate backups automatically before background cleanup jobs prune expenses</span>
              </div>
              <Switch
                checked={settings.exportBeforeDeletion}
                onChange={(checked) => handleUpdateSettings({ exportBeforeDeletion: checked })}
                disabled={isGlobalLoading}
              />
            </div>

            <div className="flex justify-between items-center py-3">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold text-destructive">Allow Permanent Deletion</span>
                <span className="text-xs text-muted-foreground mt-0.5">Authorize background cleanups to permanently erase transactions older than retention policy</span>
              </div>
              <Switch
                checked={settings.allowPermanentDeletion}
                onChange={(checked) => handleUpdateSettings({ allowPermanentDeletion: checked })}
                disabled={isGlobalLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
              <ShieldAlert size={18} />
            </div>
            <div>
              <CardTitle className="text-base text-destructive">Upcoming Deletion Schedules</CardTitle>
              <CardDescription className="text-destructive/80">Action required: items matching your retention cutoff will be permanently erased.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-2">
            {warnings.map((w) => (
              <div key={w._id} className="p-4 bg-card rounded-lg border border-destructive/20 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4 text-xs">
                  <div className="flex flex-col">
                    <p className="font-bold text-foreground text-sm">
                      {w.expenseCount} expenses from {formatTargetMonth(w.targetMonth, w.targetYear)} scheduled for cleanup.
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Deletion execution target date: <strong>{new Date(w.scheduledDeletionDate).toLocaleDateString()}</strong>
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 font-semibold uppercase tracking-wider rounded-md border text-[10px] shrink-0 ${
                    w.status === 'PENDING' 
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' 
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                  }`}>
                    {w.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleWarningAction(w._id, 'APPROVE')} 
                    disabled={isGlobalLoading}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <FileCheck size={12} /> Approve Deletion
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => handleWarningAction(w._id, 'EXTEND')} 
                    disabled={isGlobalLoading}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <RefreshCw size={12} /> Extend (30 Days)
                  </Button>
                  <Button 
                    size="sm" 
                    variant="primary" 
                    onClick={() => handleWarningAction(w._id, 'CANCEL')} 
                    disabled={isGlobalLoading}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    Cancel Deletion
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
            <Archive size={18} />
          </div>
          <div>
            <CardTitle className="text-lg">Manual Storage Operations</CardTitle>
            <CardDescription>Directly manage backups, manual archival triggers, or database purges</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-secondary/30 rounded-lg border border-border flex flex-col gap-4 justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-foreground">Manual Archiving</span>
                <span className="text-xs text-muted-foreground">Force-archive files prior to baseline server workflows.</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="flex-1">
                  <Select
                    label=""
                    value={archiveCutoffMonths}
                    onChange={(e) => setArchiveCutoffMonths(e.target.value)}
                    disabled={isGlobalLoading}
                    options={[
                      { label: 'Older than 3 Months', value: '3' },
                      { label: 'Older than 6 Months', value: '6' },
                      { label: 'Older than 1 Year', value: '12' },
                      { label: 'Older than 2 Years', value: '24' },
                    ]}
                  />
                </div>
                <Button 
                  onClick={handleManualArchive} 
                  isLoading={isActionLoading === 'archive'} 
                  disabled={isGlobalLoading}
                  className="shrink-0"
                >
                  Archive Now
                </Button>
              </div>
              <Button 
                onClick={handleRestore} 
                variant="secondary" 
                isLoading={isActionLoading === 'restore'} 
                disabled={isGlobalLoading}
                className="w-full flex items-center justify-center gap-2 text-xs"
              >
                <RefreshCw size={14} /> Restore All Archived Expenses
              </Button>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg border border-border flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-foreground">Export Backup</span>
                <span className="text-xs text-muted-foreground">Download copies of your data record immediately.</span>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="secondary" disabled={isGlobalLoading} onClick={() => handleExport('json')} className="flex-1 flex items-center justify-center gap-1 text-xs">
                    <Download size={12} /> JSON
                  </Button>
                  <Button size="sm" variant="secondary" disabled={isGlobalLoading} onClick={() => handleExport('csv')} className="flex-1 flex items-center justify-center gap-1 text-xs">
                    <Download size={12} /> CSV
                  </Button>
                  <Button size="sm" variant="secondary" disabled={isGlobalLoading} onClick={() => handleExport('html')} className="flex-1 flex items-center justify-center gap-1 text-xs">
                    <Download size={12} /> HTML
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handlePurge} 
                variant="primary" 
                isLoading={isActionLoading === 'purge'} 
                disabled={isGlobalLoading}
                className="w-full flex items-center justify-center gap-2 text-xs"
              >
                <Trash2 size={14} /> Wipe Archived Records Permanently
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};