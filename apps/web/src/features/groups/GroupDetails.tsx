import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../config/api";
import { useToastStore } from "../../store/toastStore";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { Switch } from "../../components/ui/Switch";
import {
  History,
  TrendingUp,
  Wallet,
  UserPlus,
  PlusCircle,
  ArrowLeft,
  Users,
  Trash,
  Calendar,
  Settings as SettingsIcon,
  Activity,
  LogOut,
  Trash2,
  Download,
  Loader2,
  FileText,
  FileSpreadsheet,
  Database,
  Check,
  MessageCircle
} from "lucide-react";
import { cn } from "../../utils/cn";
import { InviteModal } from "./InviteModal";

import { ExpenseTimeline } from "../expenses/ExpenseTimeline";
import { ExpenseForm } from "../expenses/ExpenseForm";

const SettlementScreen = lazy(() => import("../settlements/SettlementScreen").then(m => ({ default: m.SettlementScreen })));
const AnalyticsScreen = lazy(() => import("../analytics/AnalyticsScreen").then(m => ({ default: m.AnalyticsScreen })));
const ActivityHistory = lazy(() => import("./ActivityHistory").then(m => ({ default: m.ActivityHistory })));
const ChatContainer = lazy(() => import("../../components/chat/ChatContainer").then(m => ({ default: m.ChatContainer })));

interface Member {
  _id: string;
  user: {
    _id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  monthlyBudget?: number;
  allowUpiSharing?: boolean;
  allowDirectSettlement?: boolean;
  showUpiToMembers?: boolean;
  settlementRemindersEnabled?: boolean;
  webhookUrl?: string;
  webhookEnabled?: boolean;
  webhookSecret?: string;
  reminderSchedule?: 'monthly' | 'weekly' | 'custom';
  reminderDay?: number;
}

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "INR", label: "INR (₹)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "JPY", label: "JPY (¥)" },
];

export const GroupDetails: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const announcementsObserverRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);

  const [expensesPage, setExpensesPage] = useState(1);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isLoadingMoreExpenses, setIsLoadingMoreExpenses] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("all");

  // Announcements and settings states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementExpires, setAnnouncementExpires] = useState("");
  const [announcementScheduled, setAnnouncementScheduled] = useState("");
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [hasMoreAnnouncements, setHasMoreAnnouncements] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isLoadingMoreAnnouncements, setIsLoadingMoreAnnouncements] = useState(false);

  const [allowUpiSharing, setAllowUpiSharing] = useState(true);
  const [allowDirectSettlement, setAllowDirectSettlement] = useState(true);
  const [showUpiToMembers, setShowUpiToMembers] = useState(true);
  const [settlementRemindersEnabled, setSettlementRemindersEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [reminderSchedule, setReminderSchedule] = useState<'monthly' | 'weekly' | 'custom'>("monthly");
  const [reminderDay, setReminderDay] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "timeline" | "settlement" | "analytics" | "activity" | "chat"
  >("timeline");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [groupInvites, setGroupInvites] = useState<any[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editMonthlyBudget, setEditMonthlyBudget] = useState(0);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchExpenses = async (pageNum: number, append: boolean, search: string, category: string) => {
    if (!groupId) return;
    if (pageNum === 1) {
      setIsLoadingExpenses(true);
    } else {
      setIsLoadingMoreExpenses(true);
    }
    try {
      const response = await api.get(`/groups/${groupId}/expenses`, {
        params: {
          page: pageNum,
          limit: 10,
          search: search || undefined,
          category: category !== 'all' ? category : undefined,
        }
      });
      const fetchedExpenses = response.data.data.expenses || response.data.data || [];
      
      setExpenses(prev => append ? [...prev, ...fetchedExpenses] : fetchedExpenses);
      setHasMoreExpenses(response.data.data.hasMore ?? false);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setIsLoadingExpenses(false);
      setIsLoadingMoreExpenses(false);
    }
  };

  const handleLoadMoreExpenses = () => {
    if (isLoadingExpenses || isLoadingMoreExpenses || !hasMoreExpenses) return;
    const nextPage = expensesPage + 1;
    setExpensesPage(nextPage);
    fetchExpenses(nextPage, true, expenseSearch, expenseCategory);
  };

  useEffect(() => {
    setExpensesPage(1);
    fetchExpenses(1, false, expenseSearch, expenseCategory);
  }, [groupId, expenseSearch, expenseCategory]);

  const fetchAnnouncements = async (pageNum: number, append: boolean) => {
    if (!groupId) return;
    if (pageNum === 1) {
      setIsLoadingAnnouncements(true);
    } else {
      setIsLoadingMoreAnnouncements(true);
    }
    try {
      const response = await api.get(`/groups/${groupId}/announcements`, {
        params: {
          page: pageNum,
          limit: 5,
        }
      });
      const fetchedAnnouncements = response.data.data.announcements || response.data.data || [];
      const total = response.data.data.total || 0;
      
      setAnnouncements(prev => append ? [...prev, ...fetchedAnnouncements] : fetchedAnnouncements);
      setHasMoreAnnouncements(pageNum * 5 < total);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoadingAnnouncements(false);
      setIsLoadingMoreAnnouncements(false);
    }
  };

  const handleLoadMoreAnnouncements = () => {
    if (isLoadingAnnouncements || isLoadingMoreAnnouncements || !hasMoreAnnouncements) return;
    const nextPage = announcementsPage + 1;
    setAnnouncementsPage(nextPage);
    fetchAnnouncements(nextPage, true);
  };

  useEffect(() => {
    setAnnouncementsPage(1);
    fetchAnnouncements(1, false);
  }, [groupId]);

  useEffect(() => {
    if (!hasMoreAnnouncements || isLoadingAnnouncements || isLoadingMoreAnnouncements) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadMoreAnnouncements();
      }
    }, { threshold: 0.1 });

    if (announcementsObserverRef.current) {
      observer.observe(announcementsObserverRef.current);
    }

    return () => {
      if (announcementsObserverRef.current) {
        observer.unobserve(announcementsObserverRef.current);
      }
    };
  }, [hasMoreAnnouncements, isLoadingAnnouncements, isLoadingMoreAnnouncements, announcementsPage]);

  const fetchData = async () => {
    if (!groupId) return;
    try {
      const [
        groupRes,
        membersRes,
        settlementsRes,
        historyRes,
        invitesRes,
      ] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/members`),
        api.get(`/groups/${groupId}/settlements`),
        api.get(`/groups/${groupId}/settlements/history`),
        api
          .get(`/groups/${groupId}/invites`)
          .catch(() => ({ data: { data: { invites: [] } } })),
      ]);

      setGroup(groupRes.data.data.group);
      setMembers(membersRes.data.data.members);
      setSettlements(
        settlementsRes.data.data.transactions || settlementsRes.data.data || [],
      );
      setSettlementHistory(
        historyRes.data.data.settlements || historyRes.data.data || [],
      );
      setGroupInvites(invitesRes.data?.data?.invites || []);
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to fetch group details",
        "error",
      );
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const openSettings = () => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || "");
      setEditCurrency(group.currency);
      setEditMonthlyBudget(group.monthlyBudget || 0);
      setAllowUpiSharing(group.allowUpiSharing ?? true);
      setAllowDirectSettlement(group.allowDirectSettlement ?? true);
      setShowUpiToMembers(group.showUpiToMembers ?? true);
      setSettlementRemindersEnabled(group.settlementRemindersEnabled ?? true);
      setWebhookUrl(group.webhookUrl || "");
      setWebhookEnabled(group.webhookEnabled ?? false);
      setWebhookSecret(group.webhookSecret || "");
      setReminderSchedule(group.reminderSchedule || "monthly");
      setReminderDay(group.reminderDay ?? 1);
      setIsSettingsOpen(true);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    if (!editName.trim()) {
      addToast("Group name is required", "error");
      return;
    }
    if (editName.trim().length < 3) {
      addToast("Group name must be at least 3 characters", "error");
      return;
    }

    setIsUpdatingGroup(true);
    try {
      await api.patch(`/groups/${groupId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        currency: editCurrency,
        monthlyBudget: editMonthlyBudget,
        allowUpiSharing,
        allowDirectSettlement,
        showUpiToMembers,
        settlementRemindersEnabled,
        webhookUrl: webhookUrl.trim(),
        webhookEnabled,
        reminderSchedule,
        reminderDay
      });
      addToast("Group settings updated successfully!", "success");
      setIsSettingsOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to update group settings",
        "error",
      );
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExport = async (format: "pdf" | "excel" | "csv" | "json") => {
    if (!groupId) return;
    setExportingFormat(format);
    try {
      const endpoint = format === "json"
        ? `/groups/${groupId}/export?format=json`
        : `/exports/group/${groupId}?format=${format}`;

      const response = await api.get(
        endpoint,
        {
          responseType: "blob",
        },
      );

      const contentType = response.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([response.data], {
        type: typeof contentType === "string" ? contentType : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const ext =
        format === "csv" ? "csv" : format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "json";
      link.setAttribute(
        "download",
        `monetely_group_${group?.name.replace(/\s+/g, "_") || groupId}.${ext}`,
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast(
        `Successfully exported report as ${format.toUpperCase()}`,
        "success",
      );
    } catch (err) {
      console.error(err);
      addToast(`Failed to export group report as ${format.toUpperCase()}`, "error");
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    const confirmMessage = `WARNING: Are you absolutely sure you want to delete the group "${group?.name}"?\n\nThis will permanently delete all expenses, transaction histories, settlements, and member affiliations. This action is irreversible.`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeletingGroup(true);
    try {
      await api.delete(`/groups/${groupId}`);
      addToast("Group deleted successfully", "success");
      setIsSettingsOpen(false);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to delete group",
        "error",
      );
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleAddExpenseSubmit = async (expenseData: any) => {
    if (!groupId) return;
    try {
      await api.post(`/groups/${groupId}/expenses`, expenseData);
      addToast("Expense recorded successfully!", "success");
      setIsAddExpenseOpen(false);
      fetchData();
      setExpensesPage(1);
      fetchExpenses(1, false, expenseSearch, expenseCategory);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to record expense",
        "error",
      );
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!groupId) return;
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;

    try {
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      addToast("Expense deleted successfully", "success");
      fetchData();
      setExpensesPage(1);
      fetchExpenses(1, false, expenseSearch, expenseCategory);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to delete expense",
        "error",
      );
    }
  };

  const handleRecordSettlement = async (
    from: string,
    to: string,
    amount: number,
    notes?: string,
    utrNumber?: string
  ) => {
    if (!groupId) return;
    try {
      await api.post(`/groups/${groupId}/settlements`, {
        payerId: from,
        recipientId: to,
        amount,
        notes: notes || "Settle Debt Consolidation",
        utrNumber
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to settle debt", "error");
      throw err;
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      addToast("Title and message are required", "error");
      return;
    }

    setIsSubmittingAnnouncement(true);
    try {
      await api.post(`/groups/${groupId}/announcements`, {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        expiresAt: announcementExpires || undefined,
        scheduledFor: announcementScheduled || undefined,
        isPinned: announcementPinned
      });
      addToast("Announcement created successfully!", "success");
      setIsAnnouncementModalOpen(false);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementExpires("");
      setAnnouncementScheduled("");
      setAnnouncementPinned(false);
      fetchData();
      setAnnouncementsPage(1);
      fetchAnnouncements(1, false);
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to create announcement", "error");
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!groupId) return;
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await api.delete(`/groups/${groupId}/announcements/${id}`);
      addToast("Announcement deleted successfully", "success");
      fetchData();
      setAnnouncementsPage(1);
      fetchAnnouncements(1, false);
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to delete announcement", "error");
    }
  };

  const handleTogglePinAnnouncement = async (id: string, isPinned: boolean) => {
    if (!groupId) return;
    try {
      await api.patch(`/groups/${groupId}/announcements/${id}/pin`, { isPinned: !isPinned });
      addToast(`Announcement ${!isPinned ? "pinned" : "unpinned"} successfully!`, "success");
      fetchData();
      setAnnouncementsPage(1);
      fetchAnnouncements(1, false);
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to update pinned status", "error");
    }
  };

  const handleRevokeGroupInvite = async (inviteId: string) => {
    if (!groupId) return;
    if (!window.confirm("Are you sure you want to revoke this invitation?"))
      return;
    try {
      await api.delete(`/groups/${groupId}/invites/${inviteId}`);
      addToast("Invite revoked successfully", "success");
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to revoke invite",
        "error",
      );
    }
  };

  const handleUpdateMemberRole = async (
    memberUserId: string,
    username: string,
    newRole: string,
  ) => {
    if (!groupId) return;

    let confirmMsg = `Are you sure you want to change ${username}'s role to ${newRole}?`;
    if (newRole === "OWNER") {
      confirmMsg = `WARNING: Transferring ownership will demote you to ADMIN. Are you absolutely sure you want to transfer ownership of "${group?.name}" to ${username}?`;
    }
    if (!window.confirm(confirmMsg)) {
      fetchData();
      return;
    }

    try {
      await api.patch(`/groups/${groupId}/members/${memberUserId}/role`, {
        role: newRole,
      });
      addToast("Member role updated successfully!", "success");
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to update member role",
        "error",
      );
      fetchData();
    }
  };

  const handleRemoveMember = async (memberUserId: string, username: string) => {
    if (!groupId) return;
    if (
      !window.confirm(
        `Are you sure you want to remove ${username} from the group?`,
      )
    )
      return;

    try {
      await api.delete(`/groups/${groupId}/members/${memberUserId}`);
      addToast(`${username} removed from the group`, "success");
      fetchData();
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || "Failed to remove member",
        "error",
      );
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !currentUser) return;

    const isSoleOwner =
      currentUserRole === "OWNER" &&
      members.filter((m) => m.role === "OWNER").length === 1;
    if (isSoleOwner) {
      addToast(
        "Cannot leave the group as the sole owner. Promote another member first.",
        "error",
      );
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to leave this group? You will lose access to all transaction records.",
      )
    )
      return;

    try {
      await api.delete(`/groups/${groupId}/members/${currentUser.id}`);
      addToast("You have successfully left the group", "success");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to leave group", "error");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "GP";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getUserInitials = (username: string) => {
    if (!username) return "U";
    return username.slice(0, 2).toUpperCase();
  };

  const getUsername = (userId: string) => {
    const member = members.find((m) => m.user?._id === userId);
    return member?.user?.username || "Unknown User";
  };

  const canModifyRole = (actorRole: string, targetRole: string) => {
    if (actorRole === "OWNER") return true;
    if (actorRole === "ADMIN") {
      return targetRole === "MEMBER" || targetRole === "VIEWER";
    }
    return false;
  };

  const allowedRolesForTarget = (actorRole: string, currentRole: string) => {
    if (actorRole === "OWNER") {
      return ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
    }
    if (actorRole === "ADMIN") {
      return ["MEMBER", "VIEWER"];
    }
    return [currentRole];
  };

  const canRemoveMember = (actorRole: string, targetRole: string) => {
    if (actorRole === "OWNER") return true;
    if (actorRole === "ADMIN") {
      return targetRole === "MEMBER" || targetRole === "VIEWER";
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const initials = getInitials(group.name);
  const currentUserMembership = members.find(
    (m) => m.user?._id === currentUser?.id,
  );
  const currentUserRole = currentUserMembership?.role || "MEMBER";
  const isOwner = currentUserRole === "OWNER";
  const isAdminOrOwner =
    currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isViewer = currentUserRole === "VIEWER";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150 font-sans">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer transition-colors self-start font-bold group select-none"
        >
          <ArrowLeft
            size={12}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Groups
        </button>

        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6">
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start md:items-center gap-4">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center text-foreground bg-secondary border border-border font-bold text-lg shrink-0 select-none">
                {initials}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight text-foreground">
                    {group.name}
                  </h1>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary border border-border uppercase tracking-widest shrink-0">
                    {group.currency}
                  </span>
                  {group.monthlyBudget && group.monthlyBudget > 0 ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 uppercase tracking-widest shrink-0">
                      Budget: {group.currency} {group.monthlyBudget}
                    </span>
                  ) : null}
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-normal font-normal">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium select-none text-[11px]">
                    <Calendar size={13} className="text-muted-foreground" />
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium select-none text-[11px]">
                    <Users size={13} className="text-muted-foreground" />
                    {members.length} member{members.length !== 1 && "s"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-stretch sm:justify-end">
              <Button
                variant="primary"
                onClick={() => setIsExportOpen(true)}
                className="shrink-0 h-9 w-9 p-0 rounded-lg"
                title="Export Group Data"
                aria-label="Export Group Data"
              >
                <Download size={14} />
              </Button>

              {isOwner && (
                <Button
                  variant="primary"
                  onClick={openSettings}
                  className="shrink-0 h-9 w-9 p-0 rounded-lg"
                  title="Manage Group Settings"
                  aria-label="Manage Group Settings"
                >
                  <SettingsIcon size={14} />
                </Button>
              )}

              {!isViewer && (
                <Button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center gap-1.5 font-medium rounded-lg justify-center px-4 py-2 text-xs h-9"
                >
                  <PlusCircle size={14} />
                  Add Group Expense
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4 w-full">
          <div className="flex bg-secondary/85 rounded-lg p-0.5 border border-border overflow-x-auto scrollbar-none select-none">
            <button
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap px-3 border uppercase tracking-wider",
                activeTab === "timeline"
                  ? "bg-card text-foreground border-border font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <History size={13} />
              <span>Timeline</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 text-[9px] rounded font-bold tracking-wide border",
                  activeTab === "timeline"
                    ? "bg-secondary text-foreground border-border"
                    : "bg-transparent text-muted-foreground border-transparent",
                )}
              >
                {expenses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("settlement")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap px-3 border uppercase tracking-wider",
                activeTab === "settlement"
                  ? "bg-card text-foreground border-border font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Wallet size={13} />
              <span>Settle Debts</span>
              {settlements.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] rounded font-bold tracking-wide bg-destructive/10 text-destructive border border-destructive/20">
                  {settlements.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap px-3 border uppercase tracking-wider",
                activeTab === "analytics"
                  ? "bg-card text-foreground border-border font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <TrendingUp size={13} />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap px-3 border uppercase tracking-wider",
                activeTab === "activity"
                  ? "bg-card text-foreground border-border font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Activity size={13} />
              <span>Activity</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap px-3 border uppercase tracking-wider",
                activeTab === "chat"
                  ? "bg-card text-foreground border-border font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageCircle size={13} />
              <span>Group Chat</span>
            </button>
          </div>

          {/* Render Active Tab screen */}
          <div className="w-full">
            {activeTab === "timeline" && (
              <div className="flex flex-col gap-4">
                {/* Group Announcements */}
                {announcements.length > 0 && (
                  <div className="flex flex-col gap-2.5 mb-2 max-h-[300px] overflow-y-auto pr-1 border border-border/40 p-1.5 rounded-xl bg-secondary/5 scrollbar-thin">
                    {announcements.map((ann) => (
                      <div
                        key={ann._id}
                        className={`p-4 rounded-xl border text-xs relative transition-all duration-200 ${
                          ann.isPinned
                            ? "bg-primary/5 border-primary/20"
                            : "bg-card border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              {ann.isPinned && (
                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  Pinned
                                </span>
                              )}
                              {ann.title}
                            </h4>
                            <p className="text-muted-foreground leading-relaxed mt-1 font-normal whitespace-pre-line">
                              {ann.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground select-none mt-2 block">
                              Posted by {getUsername(ann.createdBy)} • {new Date(ann.createdAt).toLocaleDateString()}
                              {ann.expiresAt && ` • Expires ${new Date(ann.expiresAt).toLocaleDateString()}`}
                            </span>
                          </div>

                          {isAdminOrOwner && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleTogglePinAnnouncement(ann._id, ann.isPinned)}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  ann.isPinned
                                    ? "text-primary hover:bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                }`}
                                title={ann.isPinned ? "Unpin Announcement" : "Pin Announcement"}
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(ann._id)}
                                className="p-1 rounded text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                title="Delete Announcement"
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {hasMoreAnnouncements && (
                      <div ref={announcementsObserverRef} className="flex justify-center items-center py-2 select-none">
                        <button
                          onClick={handleLoadMoreAnnouncements}
                          disabled={isLoadingMoreAnnouncements}
                          className="px-3 py-1.5 border border-border rounded-lg bg-card text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isLoadingMoreAnnouncements ? (
                            <>
                              <Loader2 className="animate-spin h-3 w-3" />
                              Loading more...
                            </>
                          ) : (
                            'Load More Announcements'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isAdminOrOwner && (
                  <Button
                    onClick={() => setIsAnnouncementModalOpen(true)}
                    className="self-start flex items-center gap-1.5 text-xs font-semibold h-8 rounded-lg py-1 px-3 border border-border bg-secondary/35 text-foreground hover:bg-secondary/60 cursor-pointer shadow-none"
                  >
                    <MessageCircle size={13} />
                    Post Announcement
                  </Button>
                )}

                <ExpenseTimeline
                  expenses={expenses}
                  members={members}
                  currentUserId={currentUser?.id || ""}
                  currency={group.currency}
                  onDeleteExpense={handleDeleteExpense}
                  searchQuery={expenseSearch}
                  setSearchQuery={setExpenseSearch}
                  selectedCategory={expenseCategory}
                  setSelectedCategory={setExpenseCategory}
                  hasMore={hasMoreExpenses}
                  onLoadMore={handleLoadMoreExpenses}
                  isLoadingMore={isLoadingMoreExpenses}
                  isLoading={isLoadingExpenses}
                />
              </div>
            )}

            {activeTab === "settlement" && (
              <Suspense fallback={
                <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider animate-pulse">Loading settlements...</span>
                </div>
              }>
                <SettlementScreen
                  transactions={settlements}
                  members={members}
                  currency={group.currency}
                  onRecordSettlement={handleRecordSettlement}
                  history={settlementHistory}
                  groupId={groupId || ''}
                  group={group}
                  onFetchData={fetchData}
                />
              </Suspense>
            )}

            {activeTab === "analytics" && (
              <Suspense fallback={
                <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider animate-pulse">Loading metrics...</span>
                </div>
              }>
                <AnalyticsScreen
                  expenses={expenses}
                  members={members}
                  currency={group.currency}
                />
              </Suspense>
            )}

            {activeTab === "activity" && (
              <Suspense fallback={
                <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider animate-pulse">Loading activities...</span>
                </div>
              }>
                <ActivityHistory groupId={groupId || ""} />
              </Suspense>
            )}

            {activeTab === "chat" && (
              <Suspense fallback={
                <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider animate-pulse">Loading chat room...</span>
                </div>
              }>
                <ChatContainer
                  groupId={groupId || ""}
                  currentUserId={currentUser?.id || ""}
                  members={members}
                  expenses={expenses}
                  settlements={settlements}
                  groupCurrency={group.currency}
                  onViewExpense={() => {
                    setActiveTab("timeline");
                  }}
                  onViewSettlement={() => {
                    setActiveTab("settlement");
                  }}
                  currentUserRole={currentUserRole}
                />
              </Suspense>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4 w-full">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="flex flex-row items-center gap-2.5 p-4 border-b border-border bg-secondary/30">
              <div className="p-1.5 bg-secondary border border-border rounded-lg text-foreground flex items-center justify-center">
                <Users size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">
                  Group Members
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Members who share balances in this project
                </p>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                {members.map((member) => {
                  if (!member.user) return null;
                  const memberInitials = getUserInitials(member.user.username);
                  const isUserSelf = member.user._id === currentUser?.id;
                  const canEditRole =
                    isAdminOrOwner &&
                    !isUserSelf &&
                    canModifyRole(currentUserRole, member.role);
                  const showRemove =
                    isAdminOrOwner &&
                    !isUserSelf &&
                    canRemoveMember(currentUserRole, member.role);

                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-2 hover:bg-secondary/40 rounded-lg transition-colors border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-secondary text-foreground flex items-center justify-center text-[10px] font-bold shrink-0 border border-border uppercase">
                          {memberInitials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate leading-tight flex items-center gap-1">
                            {member.user.username}
                            {isUserSelf && (
                              <span className="text-[8px] font-bold uppercase rounded bg-secondary text-muted-foreground px-1 border">
                                You
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {member.user.email}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {canEditRole ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateMemberRole(
                                member.user._id,
                                member.user.username,
                                e.target.value as any,
                              )
                            }
                            className="text-[9px] font-bold bg-card border border-border rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-primary/50 text-foreground uppercase tracking-wide"
                          >
                            {allowedRolesForTarget(
                              currentUserRole,
                              member.role,
                            ).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                              member.role === "OWNER"
                                ? "bg-amber-50/50 text-amber-800 border-amber-200"
                                : member.role === "ADMIN"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : member.role === "MEMBER"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-secondary text-muted-foreground border-border/80",
                            )}
                          >
                            {member.role}
                          </span>
                        )}

                        {showRemove && (
                          <button
                            onClick={() =>
                              handleRemoveMember(
                                member.user._id,
                                member.user.username,
                              )
                            }
                            className="p-1 rounded text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1.5 border-t border-border pt-3 mt-1">
                {!isViewer && (
                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold h-8 rounded-lg py-1"
                  >
                    <UserPlus size={12} />
                    Invite Members / Share Link
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold h-8 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 py-1"
                >
                  <LogOut size={12} />
                  Leave Group
                </Button>
              </div>

              {groupInvites.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-border pt-3 mt-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-0.5">
                    Pending Invitations ({groupInvites.length})
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {groupInvites.map((inv) => (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between p-2 hover:bg-secondary/45 rounded-lg border border-border/80 bg-secondary/15"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold truncate text-foreground leading-tight">
                            {inv.type === "LINK"
                              ? "Share Link"
                              : inv.type === "EMAIL"
                                ? inv.inviteeEmail
                                : `@${inv.inviteeUsername}`}
                          </span>
                          <span className="text-[8px] text-muted-foreground leading-none mt-1 uppercase font-bold tracking-wider">
                            {inv.type === "LINK"
                              ? "Any user"
                              : `${inv.type.toLowerCase()} invite`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRevokeGroupInvite(inv._id)}
                          className="p-1 rounded text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                          title="Revoke Invite"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Group Data Modal */}
      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Group Data"
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <p className="text-muted-foreground leading-normal font-normal">
            Download all transaction ledgers and balance histories for{" "}
            <strong>{group?.name}</strong>. Choose your preferred format below:
          </p>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => handleExport("pdf")}
              disabled={exportingFormat !== null}
              className="group p-3 border border-border bg-card hover:bg-secondary/40 disabled:opacity-50 transition-all rounded-lg flex flex-col items-center gap-2 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-2 bg-red-500/10 text-red-500 rounded-md border border-red-500/20 group-hover:bg-red-500/20">
                {exportingFormat === "pdf" ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
              </div>
              <span className="font-bold text-foreground text-xs">PDF Document</span>
              <span className="text-[9px] text-muted-foreground leading-tight font-normal">
                Print-ready visual summary
              </span>
            </button>

            <button
              onClick={() => handleExport("excel")}
              disabled={exportingFormat !== null}
              className="group p-3 border border-border bg-card hover:bg-secondary/40 disabled:opacity-50 transition-all rounded-lg flex flex-col items-center gap-2 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20 group-hover:bg-emerald-500/20">
                {exportingFormat === "excel" ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
              </div>
              <span className="font-bold text-foreground text-xs">Excel Sheet</span>
              <span className="text-[9px] text-muted-foreground leading-tight font-normal">
                Styled tabs with ledger data
              </span>
            </button>

            <button
              onClick={() => handleExport("csv")}
              disabled={exportingFormat !== null}
              className="group p-3 border border-border bg-card hover:bg-secondary/40 disabled:opacity-50 transition-all rounded-lg flex flex-col items-center gap-2 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-md border border-indigo-500/20 group-hover:bg-indigo-500/20">
                {exportingFormat === "csv" ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
              </div>
              <span className="font-bold text-foreground text-xs">CSV Stream</span>
              <span className="text-[9px] text-muted-foreground leading-tight font-normal">
                High-performance raw stream
              </span>
            </button>

            <button
              onClick={() => handleExport("json")}
              disabled={exportingFormat !== null}
              className="group p-3 border border-border bg-card hover:bg-secondary/40 disabled:opacity-50 transition-all rounded-lg flex flex-col items-center gap-2 text-center cursor-pointer hover:scale-[1.02]"
            >
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20 group-hover:bg-amber-500/20">
                {exportingFormat === "json" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              </div>
              <span className="font-bold text-foreground text-xs">JSON Backup</span>
              <span className="text-[9px] text-muted-foreground leading-tight font-normal">
                Raw database record format
              </span>
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setIsExportOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Group Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setIsUpdatingGroup(false);
        }}
        title="Manage Group Settings"
      >
        <form onSubmit={handleUpdateGroup} className="flex flex-col gap-5">
          <Input
            label="Group Name"
            placeholder="e.g. Ski Trip 2026, Apartment 4B"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={isUpdatingGroup || isDeletingGroup}
            required
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Sharing cabin booking, groceries, and travel costs"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            disabled={isUpdatingGroup || isDeletingGroup}
          />

          <Select
            label="Default Currency"
            options={CURRENCIES}
            value={editCurrency}
            onChange={(e) => setEditCurrency(e.target.value)}
            disabled={isUpdatingGroup || isDeletingGroup}
          />

          <Input
            label="Monthly Group Budget (Optional, 0 to disable)"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 500"
            value={editMonthlyBudget || ""}
            onChange={(e) =>
              setEditMonthlyBudget(parseFloat(e.target.value) || 0)
            }
            disabled={isUpdatingGroup || isDeletingGroup}
          />

          <div className="border-t border-border/60 pt-4 flex flex-col gap-4 text-xs">
            <span className="font-bold text-foreground uppercase tracking-wider block mb-1">
              Payment & Settlement Settings
            </span>

            <div className="flex justify-between items-center py-1">
              <div className="flex flex-col pr-4">
                <span className="font-semibold text-foreground text-left">Allow UPI Sharing</span>
                <span className="text-muted-foreground mt-0.5 font-normal text-[10px] text-left">
                  Permit group members to display their UPI payment details
                </span>
              </div>
              <Switch
                checked={allowUpiSharing}
                onChange={() => setAllowUpiSharing(!allowUpiSharing)}
                disabled={isUpdatingGroup}
              />
            </div>

            <div className="flex justify-between items-center py-1">
              <div className="flex flex-col pr-4">
                <span className="font-semibold text-foreground text-left">Allow Direct Settlement</span>
                <span className="text-muted-foreground mt-0.5 font-normal text-[10px] text-left">
                  Allow members to record direct settle payments without billing requests
                </span>
              </div>
              <Switch
                checked={allowDirectSettlement}
                onChange={() => setAllowDirectSettlement(!allowDirectSettlement)}
                disabled={isUpdatingGroup}
              />
            </div>

            <div className="flex justify-between items-center py-1">
              <div className="flex flex-col pr-4">
                <span className="font-semibold text-foreground text-left">Show UPI To Members</span>
                <span className="text-muted-foreground mt-0.5 font-normal text-[10px] text-left">
                  Reveal member UPI details to other members during settlement
                </span>
              </div>
              <Switch
                checked={showUpiToMembers}
                onChange={() => setShowUpiToMembers(!showUpiToMembers)}
                disabled={isUpdatingGroup}
              />
            </div>
          </div>

          <div className="border-t border-border/60 pt-4 flex flex-col gap-4 text-xs">
            <span className="font-bold text-foreground uppercase tracking-wider block mb-1">
              Outgoing Webhooks
            </span>

            <div className="flex justify-between items-center py-1">
              <div className="flex flex-col pr-4">
                <span className="font-semibold text-foreground text-left">Enable Webhooks</span>
                <span className="text-muted-foreground mt-0.5 font-normal text-[10px] text-left">
                  Trigger HTTP POST JSON payloads to your server on group events
                </span>
              </div>
              <Switch
                checked={webhookEnabled}
                onChange={() => setWebhookEnabled(!webhookEnabled)}
                disabled={isUpdatingGroup}
              />
            </div>

            {webhookEnabled && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <Input
                  label="Webhook URL"
                  placeholder="https://api.yourdomain.com/group-hooks"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={isUpdatingGroup}
                />
                
                {webhookSecret && (
                  <div className="p-2.5 bg-secondary/30 rounded-lg border border-border flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-left font-sans">Signing Secret</span>
                    <code className="font-mono text-[10px] break-all select-all text-primary bg-primary/5 px-1.5 py-0.5 rounded self-start mt-0.5">
                      {webhookSecret}
                    </code>
                    <span className="text-[9px] text-muted-foreground mt-1 text-left">
                      Payload signature is sent in the 'X-Monetely-Signature' header
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Automated Reminders */}
          <div className="border-t border-border/60 pt-4 flex flex-col gap-4 text-xs">
            <span className="font-bold text-foreground uppercase tracking-wider block mb-1">
              Automated Dues Reminders
            </span>

            <div className="flex justify-between items-center py-1">
              <div className="flex flex-col pr-4">
                <span className="font-semibold text-foreground text-left">Reminders Enabled</span>
                <span className="text-muted-foreground mt-0.5 font-normal text-[10px] text-left">
                  Automatically send outstanding balances notifications
                </span>
              </div>
              <Switch
                checked={settlementRemindersEnabled}
                onChange={() => setSettlementRemindersEnabled(!settlementRemindersEnabled)}
                disabled={isUpdatingGroup}
              />
            </div>

            {settlementRemindersEnabled && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                <Select
                  label="Reminder Schedule"
                  options={[
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                    { value: "custom", label: "Custom" }
                  ]}
                  value={reminderSchedule}
                  onChange={(e) => setReminderSchedule(e.target.value as any)}
                  disabled={isUpdatingGroup}
                />
                <Input
                  label="Reminder Day"
                  type="number"
                  min="0"
                  max="31"
                  value={reminderDay}
                  onChange={(e) => setReminderDay(parseInt(e.target.value) || 1)}
                  disabled={isUpdatingGroup}
                  helperText={reminderSchedule === 'weekly' ? '0=Sun, 1=Mon, ..., 6=Sat' : 'Day of month (1-31)'}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <Button
              type="button"
              className="bg-secondary text-secondary-foreground"
              disabled={isUpdatingGroup || isDeletingGroup}
              onClick={() => setIsSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isUpdatingGroup}
              disabled={isDeletingGroup}
            >
              Save Changes
            </Button>
          </div>

          <div className="border-t border-border/60 pt-5 mt-3">
            <span className="text-xs font-bold text-destructive uppercase tracking-widest block mb-2">
              Danger Zone
            </span>
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-destructive">
                  Delete this Group
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-normal text-destructive/80 font-normal">
                  Permanently delete all expenses, balances, and history. This
                  cannot be undone.
                </span>
              </div>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeletingGroup}
                disabled={isUpdatingGroup}
                className="bg-destructive hover:bg-destructive/90 text-white shrink-0 scale-95"
                onClick={handleDeleteGroup}
              >
                Delete Group
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        groupId={groupId || ""}
        onInviteSuccess={fetchData}
      />

      <Modal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        title="Post Group Announcement"
      >
        <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. Monthly Settlement Reminder, New Trip Rules"
            value={announcementTitle}
            onChange={(e) => setAnnouncementTitle(e.target.value)}
            disabled={isSubmittingAnnouncement}
            required
          />

          <div className="flex flex-col gap-1.5 text-xs text-left">
            <label className="font-semibold text-foreground mb-1 select-none">Message</label>
            <textarea
              rows={4}
              placeholder="Enter your announcement message here..."
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              disabled={isSubmittingAnnouncement}
              required
              className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expiry Date (Optional)"
              type="date"
              value={announcementExpires}
              onChange={(e) => setAnnouncementExpires(e.target.value)}
              disabled={isSubmittingAnnouncement}
            />
            <Input
              label="Schedule Date (Optional)"
              type="date"
              value={announcementScheduled}
              onChange={(e) => setAnnouncementScheduled(e.target.value)}
              disabled={isSubmittingAnnouncement}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border mt-1">
            <div className="flex flex-col pr-4 text-xs text-left">
              <span className="font-semibold text-foreground">Pin Announcement</span>
              <span className="text-muted-foreground mt-0.5 font-normal">
                Keep this announcement pinned at the top of the group stream
              </span>
            </div>
            <Switch
              checked={announcementPinned}
              onChange={() => setAnnouncementPinned(!announcementPinned)}
              disabled={isSubmittingAnnouncement}
            />
          </div>

          <div className="flex gap-2 w-full justify-end mt-2 pt-3 border-t border-border">
            <Button
              type="button"
              className="bg-secondary text-secondary-foreground font-semibold"
              onClick={() => setIsAnnouncementModalOpen(false)}
              disabled={isSubmittingAnnouncement}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmittingAnnouncement}
              className="font-semibold"
            >
              Publish Announcement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Add Shared Expense"
      >
        <ExpenseForm
          members={members}
          currency={group.currency}
          onSubmit={handleAddExpenseSubmit}
          onCancel={() => setIsAddExpenseOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default GroupDetails;
