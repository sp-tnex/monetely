import React, { useState, useEffect } from 'react';
import { api } from '../../config/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import { useToastStore } from '../../store/toastStore';
import { 
  FileText, 
  FileSpreadsheet, 
  Database,
  Loader2, 
  FolderDown, 
  UserSquare2 
} from 'lucide-react';

export const ExportSettings: React.FC = () => {
  const { addToast } = useToastStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [exportingType, setExportingType] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const res = await api.get('/groups');
        const groupsList = res.data.data.groups || [];
        setGroups(groupsList);
        if (groupsList.length > 0) {
          setSelectedGroupId(groupsList[0]._id);
        }
      } catch (err) {
        console.error('Failed to load groups for export', err);
      } finally {
        setIsLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  const triggerDownload = (data: any, contentType: string, defaultFilename: string) => {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type: 'user' | 'group', format: 'pdf' | 'excel' | 'csv') => {
    const targetGroupId = selectedGroupId;
    if (type === 'group' && !targetGroupId) {
      addToast('Please select a group first.', 'error');
      return;
    }

    const stateKey = `${type}-${format}`;
    setExportingType(stateKey);

    try {
      const endpoint = type === 'user' 
        ? `/exports/user?format=${format}` 
        : `/exports/group/${targetGroupId}?format=${format}`;

      const response = await api.get(endpoint, { responseType: 'blob' });
      
      const headerVal = response.headers['content-type'];
      const contentType = typeof headerVal === 'string' ? headerVal : 'application/octet-stream';
      
      let filename = `monetely_${type}_report_${Date.now()}`;
      if (format === 'pdf') filename += '.pdf';
      else if (format === 'excel') filename += '.xlsx';
      else filename += '.csv';

      triggerDownload(response.data, contentType, filename);
      addToast(`Exported ${format.toUpperCase()} report successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Failed to export ${format.toUpperCase()} report.`, 'error');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl animate-in fade-in duration-200">
      <Card className="border-border overflow-hidden bg-card/60 backdrop-blur-xs relative before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-emerald-500/10 before:to-indigo-500/10 before:rounded-xl before:-z-10">
        <CardHeader className="flex flex-row items-center gap-3.5 pb-2">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
            <UserSquare2 size={22} />
          </div>
          <div>
            <CardTitle className="text-lg">Personal Financial Statement</CardTitle>
            <CardDescription>
              Export a complete aggregate report across all groups you are part of
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col gap-5">
          <p className="text-xs text-muted-foreground leading-relaxed font-normal">
            Your User Report generates an consolidated breakdown containing your net balance, total personal spending, active debts, 
            category breakdown, and recent transaction ledger history across the workspace.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {/* PDF Option */}
            <button
              onClick={() => handleExport('user', 'pdf')}
              disabled={exportingType !== null}
              className="group p-4 border border-border bg-secondary/20 hover:bg-secondary/50 disabled:opacity-50 transition-all rounded-xl flex flex-col items-center gap-3 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 group-hover:bg-red-500/20">
                {exportingType === 'user-pdf' ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-xs text-foreground">PDF Document</span>
                <span className="text-[10px] text-muted-foreground leading-normal font-normal">
                  Beautifully designed visual summary statement
                </span>
              </div>
            </button>

            <button
              onClick={() => handleExport('user', 'excel')}
              disabled={exportingType !== null}
              className="group p-4 border border-border bg-secondary/20 hover:bg-secondary/50 disabled:opacity-50 transition-all rounded-xl flex flex-col items-center gap-3 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20">
                {exportingType === 'user-excel' ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={20} />}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-xs text-foreground">Excel Worksheet</span>
                <span className="text-[10px] text-muted-foreground leading-normal font-normal">
                  Tabbed spreadsheet with styled formulas & columns
                </span>
              </div>
            </button>

            <button
              onClick={() => handleExport('user', 'csv')}
              disabled={exportingType !== null}
              className="group p-4 border border-border bg-secondary/20 hover:bg-secondary/50 disabled:opacity-50 transition-all rounded-xl flex flex-col items-center gap-3 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500/20">
                {exportingType === 'user-csv' ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-xs text-foreground">Raw CSV Stream</span>
                <span className="text-[10px] text-muted-foreground leading-normal font-normal">
                  Lightweight stream file for accounting imports
                </span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border overflow-hidden bg-card/60 backdrop-blur-xs relative">
        <CardHeader className="flex flex-row items-center gap-3.5 pb-2">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20">
            <FolderDown size={22} />
          </div>
          <div>
            <CardTitle className="text-lg">Group Financial Statement</CardTitle>
            <CardDescription>
              Export detailed ledgers and settlement sheets for a specific group
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Select Group to Export
            </label>
            {isLoadingGroups ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal py-2">
                <Loader2 className="animate-spin" size={14} /> Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <p className="text-xs text-amber-500 border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 rounded-lg font-medium">
                You are not a member of any active billing groups yet.
              </p>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full max-w-md bg-secondary/40 hover:bg-secondary/60 transition-colors border border-border text-foreground rounded-lg p-2.5 text-xs font-semibold outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name} ({group.currency})
                  </option>
                ))}
              </select>
            )}
          </div>

          {groups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <button
                onClick={() => handleExport('group', 'pdf')}
                disabled={exportingType !== null}
                className="group p-4 border border-border bg-secondary/20 hover:bg-secondary/50 disabled:opacity-50 transition-all rounded-xl flex flex-col items-center gap-3 text-center cursor-pointer hover:scale-[1.02]"
              >
                <div className="p-3 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 group-hover:bg-red-500/20">
                  {exportingType === 'group-pdf' ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs text-foreground">PDF Document</span>
                  <span className="text-[10px] text-muted-foreground leading-normal font-normal">
                    Structured spending summary and member roles
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleExport('group', 'excel')}
                disabled={exportingType !== null}
                className="group p-4 border border-border bg-secondary/20 hover:bg-secondary/50 disabled:opacity-50 transition-all rounded-xl flex flex-col items-center gap-3 text-center cursor-pointer hover:scale-[1.02]"
              >
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20">
                  {exportingType === 'group-excel' ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={20} />}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs text-foreground">Excel Worksheet</span>
                  <span className="text-[10px] text-muted-foreground leading-normal font-normal">
                    Complete sheet containing members, expenses & settlements
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleExport('group', 'csv')}
                disabled={exportingType !== null}
                className="group p-4 border border-border bg-secondary/20 hover:bg-secondary/50 disabled:opacity-50 transition-all rounded-xl flex flex-col items-center gap-3 text-center cursor-pointer hover:scale-[1.02]"
              >
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500/20">
                  {exportingType === 'group-csv' ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs text-foreground">Raw CSV Stream</span>
                  <span className="text-[10px] text-muted-foreground leading-normal font-normal">
                    Stream records of all transactions
                  </span>
                </div>
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
