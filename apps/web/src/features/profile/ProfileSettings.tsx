import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';
import { api } from '../../config/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import {
  Sun,
  Moon,
  Shield,
  User as UserIcon,
  Laptop,
  Smartphone,
  Tablet,
  Trash2,
  LogOut,
  AlertTriangle,
  Mail,
  HardDrive,
  Palette as PaletteIcon,
  Globe,
  Bell,
  Download,
  Wallet,
  QrCode
} from 'lucide-react';
import { RetentionSettings } from './RetentionSettings';
import { MyInvites } from './MyInvites';
import { ExportSettings } from './ExportSettings';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { cn } from '../../utils/cn';

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+00:00)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT+00:00)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+01:00)' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+01:00)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (GMT+05:30)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+09:00)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+08:00)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10:00)' },
  { value: 'Pacific/Auckland', label: 'Auckland (GMT+12:00)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English (EN)' },
  { value: 'es', label: 'Spanish (ES)' },
  { value: 'fr', label: 'French (FR)' },
  { value: 'de', label: 'German (DE)' },
  { value: 'ja', label: 'Japanese (JA)' },
  { value: 'zh', label: 'Chinese (ZH)' },
  { value: 'hi', label: 'Hindi (HI)' },
];

const hexToHslValues = (hex: string): string => {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

const hslValuesToHex = (hslStr: string): string => {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return '#000000';
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1].replace('%', '')) / 100;
  const l = parseInt(parts[2].replace('%', '')) / 100;

  let r = l;
  let g = l;
  let b = l;

  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const ProfileSettings: React.FC = () => {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const { theme, toggleTheme, darkPalette, customColors, setDarkPalette, setCustomColors } = useThemeStore();
  const { addToast } = useToastStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'general';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [username, setUsername] = useState(user?.username || '');
  const [email] = useState(user?.email || '');
  const [gravatarEmail, setGravatarEmail] = useState(user?.gravatarEmail || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [defaultCurrency, setDefaultCurrency] = useState(user?.defaultCurrency || 'USD');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [pushNotifications, setPushNotifications] = useState(user?.notificationPreferences?.push ?? true);
  const [systemNotifications, setSystemNotifications] = useState(user?.notificationPreferences?.system ?? true);
  const [webhookEnabled, setWebhookEnabled] = useState(user?.webhook?.enabled ?? false);
  const [webhookUrl, setWebhookUrl] = useState(user?.webhook?.url ?? '');
  const [webhookSecret, setWebhookSecret] = useState(user?.webhook?.secret ?? '');

  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [upiName, setUpiName] = useState(user?.upiName || '');
  const [upiVisibility, setUpiVisibility] = useState(user?.upiVisibility || 'Visible To Everyone');
  const [upiInstructions, setUpiInstructions] = useState(user?.upiInstructions || '');
  const [upiQrUrl, setUpiQrUrl] = useState(user?.upiQrUrl || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const [bgColor, setBgColor] = useState('#0f172a');
  const [cardColor, setCardColor] = useState('#151d30');
  const [borderColor, setBorderColor] = useState('#222e47');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setGravatarEmail(user.gravatarEmail || '');
      setDefaultCurrency(user.defaultCurrency || 'USD');
      setTimezone(user.timezone || 'UTC');
      setLanguage(user.language || 'en');
      setPushNotifications(user.notificationPreferences?.push ?? true);
      setSystemNotifications(user.notificationPreferences?.system ?? true);
      setWebhookEnabled(user.webhook?.enabled ?? false);
      setWebhookUrl(user.webhook?.url ?? '');
      setWebhookSecret(user.webhook?.secret ?? '');
      setUpiId(user.upiId || '');
      setUpiName(user.upiName || '');
      setUpiVisibility(user.upiVisibility || 'Visible To Everyone');
      setUpiInstructions(user.upiInstructions || '');
      setUpiQrUrl(user.upiQrUrl || '');
    }
  }, [user]);

  useEffect(() => {
    if (customColors) {
      setBgColor(hslValuesToHex(customColors.background));
      setCardColor(hslValuesToHex(customColors.card));
      setBorderColor(hslValuesToHex(customColors.border));
      setPrimaryColor(hslValuesToHex(customColors.primary));
    }
  }, [customColors]);

  const handleCustomColorChange = (key: 'background' | 'card' | 'border' | 'primary', hex: string) => {
    if (key === 'background') setBgColor(hex);
    if (key === 'card') setCardColor(hex);
    if (key === 'border') setBorderColor(hex);
    if (key === 'primary') setPrimaryColor(hex);

    setCustomColors({
      [key]: hexToHslValues(hex)
    });
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data.data);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchPendingInvitesCount = async () => {
    try {
      const response = await api.get('/invites/pending');
      setPendingInvitesCount(response.data.data.invites?.length || 0);
    } catch (err: any) {
      console.error('Failed to load pending invites count:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchPendingInvitesCount();

    const interval = setInterval(fetchPendingInvitesCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      addToast('Username is required', 'error');
      return;
    }

    if (upiId.trim() && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())) {
      addToast('Invalid UPI ID format. Should be username@bankname', 'error');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const response = await api.patch('/users/profile', {
        username: username.trim(),
        gravatarEmail: gravatarEmail.trim(),
        defaultCurrency,
        timezone,
        language,
        notificationPreferences: {
          push: pushNotifications,
          system: systemNotifications,
        },
        webhook: {
          url: webhookUrl.trim(),
          enabled: webhookEnabled,
        },
        upiId: upiId.trim(),
        upiName: upiName.trim(),
        upiVisibility,
        upiInstructions: upiInstructions.trim(),
        upiQrUrl: upiQrUrl.trim()
      });
      
      const updatedUser = response.data.data.user;
      
      setAuth(updatedUser, accessToken);
      addToast('Profile preferences updated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to update profile preferences', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('All password fields are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      addToast('New password must be at least 8 characters long', 'error');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await api.patch('/users/password', {
        currentPassword,
        newPassword,
      });
      addToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      addToast('Device session revoked successfully', 'success');
      fetchSessions();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to revoke session', 'error');
    }
  };

  const handleClearOtherSessions = async () => {
    try {
      await api.delete('/auth/sessions');
      addToast('Other sessions cleared successfully', 'success');
      fetchSessions();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to clear other sessions', 'error');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      addToast('Password is required to confirm deletion', 'error');
      return;
    }

    setIsDeletingAccount(true);

    try {
      await api.delete('/users/me', {
        data: { password: deletePassword }
      });
      addToast('Your account was successfully deleted', 'success');
      setIsDeleteModalOpen(false);
      clearAuth();
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <UserIcon size={18} /> },
    { id: 'upi', label: 'UPI Profile', icon: <Wallet size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'sessions', label: 'Sessions & Devices', icon: <Laptop size={18} /> },
    { id: 'retention', label: 'Data Retention', icon: <HardDrive size={18} /> },
    {
      id: 'invites',
      label: 'Group Invites',
      icon: <Mail size={18} />,
      badge: pendingInvitesCount > 0 ? pendingInvitesCount : undefined
    },
    { id: 'exports', label: 'Exports & Reports', icon: <Download size={18} /> },
  ];

  const presetOptions = [
    { id: 'midnight', label: 'Midnight', gradient: 'from-[#0f172a] to-[#6366f1]' },
    { id: 'charcoal', label: 'Charcoal', gradient: 'from-[#0e1117] to-[#3b82f6]' },
    { id: 'forest', label: 'Forest', gradient: 'from-[#08150f] to-[#22c55e]' },
    { id: 'amethyst', label: 'Amethyst', gradient: 'from-[#0d0714] to-[#a855f7]' },
    { id: 'custom', label: 'Custom', gradient: 'from-gray-500 via-gray-400 to-gray-600' }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account profile, visual preferences, security, and data lifecycles
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <aside className="w-full md:w-64 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto pb-3 md:pb-0 scrollbar-none border-b border-border md:border-b-0 md:border-r md:border-border md:pr-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0 w-auto md:w-full border',
                  isActive
                    ? 'bg-secondary text-foreground border-border font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-transparent'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-auto md:ml-2 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <div className="flex-1 w-full min-w-0">
          {activeTab === 'general' && (
            <div className="flex flex-col gap-8 max-w-2xl">
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-8">
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <UserIcon size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Profile Details</CardTitle>
                      <CardDescription>Update your public account information</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3.5 mb-2 p-3.5 bg-secondary/30 rounded-lg border border-border">
                      <Avatar name={username || user?.username || ''} src={user?.avatarUrl} size="lg" className="border border-border" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Profile Avatar</span>
                        <span className="text-xs text-muted-foreground mt-0.5 font-normal">
                          Enter your Gravatar email to fetch your avatar picture.
                        </span>
                      </div>
                    </div>

                    <Input
                      label="Username"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isUpdatingProfile}
                    />
                    <Input
                      label="Gravatar Email"
                      type="email"
                      placeholder="avatar-email@example.com"
                      value={gravatarEmail}
                      onChange={(e) => setGravatarEmail(e.target.value)}
                      disabled={isUpdatingProfile}
                      helperText="Fill in your Gravatar email above to show your custom avatar picture."
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      disabled={true}
                      helperText="Your email address is managed by organization settings and cannot be changed."
                    />
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Globe size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Regional Preferences</CardTitle>
                      <CardDescription>Configure default currency, timezone, and language preferences</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Default Currency"
                        options={CURRENCIES}
                        value={defaultCurrency}
                        onChange={(e) => setDefaultCurrency(e.target.value)}
                        disabled={isUpdatingProfile}
                        helperText="Default currency chosen when creating new billing groups"
                      />

                      <Select
                        label="Language Preference"
                        options={LANGUAGES}
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={isUpdatingProfile}
                        helperText="System interface language configuration"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1">
                          {(() => {
                            const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                            const uniqueTzList = Array.from(new Set([browserTz, ...TIMEZONES.map(t => t.value)]));
                            const timezoneOptions = uniqueTzList.map(tz => {
                              const matched = TIMEZONES.find(t => t.value === tz);
                              if (matched) return matched;
                              return { value: tz, label: tz.replace(/_/g, ' ') };
                            });
                            return (
                              <Select
                                label="Timezone"
                                options={timezoneOptions}
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                disabled={isUpdatingProfile}
                                helperText="Timezone for dates and local greeting time calculation"
                              />
                            );
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="shrink-0 self-start sm:self-auto h-9 font-semibold text-xs border-border"
                          onClick={() => {
                            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                            setTimezone(localTz);
                            addToast(`Detected timezone: ${localTz}`, 'success');
                          }}
                        >
                          Auto-Detect Timezone
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Bell size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Notification Preferences</CardTitle>
                      <CardDescription>Manage how and where you receive system notifications</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-4 divide-y divide-border/60">
                    <div className="flex justify-between items-center py-2 first:pt-0">
                      <div className="flex flex-col pr-4">
                        <span className="text-sm font-semibold">Push Notifications</span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Receive instant alerts on your mobile device or browser when balance changes
                        </span>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onChange={() => setPushNotifications(!pushNotifications)}
                        disabled={isUpdatingProfile}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <div className="flex flex-col pr-4">
                        <span className="text-sm font-semibold">System Dashboard Alerts</span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Show real-time toast alerts and notifications in your in-app notification box
                        </span>
                      </div>
                      <Switch
                        checked={systemNotifications}
                        onChange={() => setSystemNotifications(!systemNotifications)}
                        disabled={isUpdatingProfile}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Globe size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Webhook Integrations</CardTitle>
                      <CardDescription>Receive real-time system event payloads to your server</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center py-2 first:pt-0">
                      <div className="flex flex-col pr-4">
                        <span className="text-sm font-semibold">Enable Webhooks</span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Deliver JSON payloads for group, expense, and settlement events
                        </span>
                      </div>
                      <Switch
                        checked={webhookEnabled}
                        onChange={() => setWebhookEnabled(!webhookEnabled)}
                        disabled={isUpdatingProfile}
                      />
                    </div>

                    {webhookEnabled && (
                      <div className="flex flex-col gap-4 pt-4 border-t border-border animate-in fade-in duration-200">
                        <Input
                          label="Endpoint URL"
                          placeholder="https://api.yourdomain.com/webhooks"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          disabled={isUpdatingProfile}
                        />

                        {webhookSecret && (
                          <div className="flex flex-col gap-1.5 p-3 bg-secondary/30 rounded-lg border border-border">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signing Secret</span>
                            <div className="flex items-center justify-between gap-3 mt-1">
                              <code className="text-xs font-mono select-all break-all text-primary bg-primary/5 px-2 py-1 rounded">
                                {webhookSecret}
                              </code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 font-bold text-muted-foreground border border-border bg-card hover:bg-secondary/40 shrink-0 cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(webhookSecret);
                                  addToast('Signing secret copied to clipboard!', 'success');
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              Use this secret to verify signatures of incoming hook payloads to guarantee authenticity.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button type="submit" isLoading={isUpdatingProfile} className="self-start font-semibold">
                  Save Profile Settings
                </Button>
              </form>

              <Card className="border-border">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">System Preferences</CardTitle>
                    <CardDescription>Adjust the visual theme of the dashboard</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex justify-between items-center">
                  <div className="flex flex-col pr-4">
                    <span className="text-sm font-semibold">Dark Color Palette</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Toggle between high contrast dark and light surfaces
                    </span>
                  </div>
                  <Switch checked={theme === 'dark'} onChange={toggleTheme} />
                </CardContent>
              </Card>

              {theme === 'dark' && (
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <PaletteIcon size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Dark Mode Color Scheme</CardTitle>
                      <CardDescription>Select a built-in dark palette preset or configure a custom color palette</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-5">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {presetOptions.map((opt) => {
                        const isSelected = darkPalette === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDarkPalette(opt.id as any)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors",
                              isSelected
                                ? "border-primary bg-secondary text-foreground font-bold shadow-none"
                                : "border-border hover:border-muted-foreground/35 hover:bg-secondary/30 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className={cn("w-6 h-6 rounded-lg bg-gradient-to-br border border-black/10 shrink-0", opt.gradient)} />
                            <span className="text-[10px] tracking-wide uppercase font-bold">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {darkPalette === 'custom' && (
                      <div className="border-t border-border pt-4 mt-2 flex flex-col gap-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Custom Palette Colors</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Background</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => handleCustomColorChange('background', e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                              />
                              <span className="text-[11px] font-mono text-muted-foreground uppercase">{bgColor}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Card Surface</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={cardColor}
                                onChange={(e) => handleCustomColorChange('card', e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                              />
                              <span className="text-[11px] font-mono text-muted-foreground uppercase">{cardColor}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Borders</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={borderColor}
                                onChange={(e) => handleCustomColorChange('border', e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                              />
                              <span className="text-[11px] font-mono text-muted-foreground uppercase">{borderColor}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Primary Accent</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                              />
                              <span className="text-[11px] font-mono text-muted-foreground uppercase">{primaryColor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'upi' && (
            <div className="flex flex-col gap-8 max-w-2xl">
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-8 animate-in fade-in duration-200">
                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">UPI Settlement Settings</CardTitle>
                      <CardDescription>Configure your UPI profile to allow other group members to pay you instantly</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="flex-1">
                        <Input
                          label="UPI ID"
                          placeholder="rahul@paytm"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          disabled={isUpdatingProfile}
                          helperText="Standard formats like username@bank or phone@upi"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="shrink-0 h-9 font-semibold text-xs border border-border bg-card text-foreground hover:bg-secondary/40 select-none"
                        onClick={() => {
                          if (!upiId.trim()) {
                            addToast('Please enter a UPI ID to verify', 'error');
                            return;
                          }
                          const isValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim());
                          if (isValid) {
                            addToast('UPI ID format is valid!', 'success');
                          } else {
                            addToast('Invalid UPI ID format. Standard format is username@provider.', 'error');
                          }
                        }}
                      >
                        Verify UPI Format
                      </Button>
                    </div>

                    <Input
                      label="Preferred Payment Name"
                      placeholder="Rahul Kumar"
                      value={upiName}
                      onChange={(e) => setUpiName(e.target.value)}
                      disabled={isUpdatingProfile}
                      helperText="Name shown to payer in their UPI application"
                    />

                    <Select
                      label="UPI ID Visibility"
                      options={[
                        { value: 'Visible To Everyone', label: 'Visible To Everyone' },
                        { value: 'Visible To Group Members', label: 'Visible To Group Members' },
                        { value: 'Visible Only During Settlement', label: 'Visible Only During Settlement' },
                        { value: 'Hidden', label: 'Hidden (Privacy Mode)' }
                      ]}
                      value={upiVisibility}
                      onChange={(e) => setUpiVisibility(e.target.value as any)}
                      disabled={isUpdatingProfile}
                      helperText="Control who can see your payment details"
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">Custom Payment Instructions (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Please add 'Trip Expenses' as payment note."
                        value={upiInstructions}
                        onChange={(e) => setUpiInstructions(e.target.value)}
                        disabled={isUpdatingProfile}
                        className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    <Input
                      label="Custom QR Code URL (Optional)"
                      placeholder="https://example.com/my-qr.png"
                      value={upiQrUrl}
                      onChange={(e) => setUpiQrUrl(e.target.value)}
                      disabled={isUpdatingProfile}
                      helperText="Link to an uploaded QR code image, if you have one"
                    />

                    {upiId.trim() && /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim()) && (
                      <div className="p-3.5 bg-secondary/30 rounded-lg border border-border flex flex-col gap-2.5 leading-relaxed items-center justify-center text-center mt-3 animate-in slide-in-from-bottom-2 duration-200">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <QrCode size={12} />
                          Generated Static QR Preview
                        </span>
                        <div className="bg-white p-2 rounded-lg border border-border">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${upiName || user?.username || ''}`)}`}
                            alt="Static Payment QR Code"
                            className="w-32 h-32 select-none"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Scan to pay {upiName || user?.username || 'user'} directly via any UPI app
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button type="submit" isLoading={isUpdatingProfile} className="self-start font-semibold">
                  Save UPI Profile
                </Button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="flex flex-col gap-8 max-w-2xl">
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Shield size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Change Password</CardTitle>
                    <CardDescription>Ensure your account remains safe and secure</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                      helperText="At least 8 characters"
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                    />
                    <Button type="submit" variant="danger" isLoading={isUpdatingPassword} className="mt-2 self-start">
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-destructive bg-destructive/5">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions related to your user account</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-destructive">Delete User Account</span>
                    <span className="text-xs text-muted-foreground mt-0.5 font-normal text-destructive/80">
                      Permanently delete your account and clear all associated session data. This action is irreversible.
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    className="shrink-0 self-start sm:self-auto bg-destructive hover:bg-destructive/90 text-white"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="max-w-2xl">
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Active Sessions</CardTitle>
                    <CardDescription>Manage the devices and browser sessions logged into your account</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {isLoadingSessions ? (
                    <div className="space-y-3">
                      <div className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
                      <div className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6">No active sessions found.</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="divide-y divide-border">
                        {sessions.map((session) => {
                          const DeviceIcon = session.device === 'Mobile' ? Smartphone : session.device === 'Tablet' ? Tablet : Laptop;
                          return (
                            <div key={session.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-secondary/30 rounded-lg text-muted-foreground shrink-0 border border-border">
                                  <DeviceIcon size={18} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                                    {session.os} - {session.browser}
                                    {session.isCurrent && (
                                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
                                        This Device
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    IP: {session.ipAddress} • {session.isCurrent ? 'Active now' : `Last active: ${new Date(session.lastActiveAt).toLocaleString()}`}
                                  </span>
                                </div>
                              </div>
                              
                              {!session.isCurrent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() => handleRevokeSession(session.id)}
                                >
                                  <Trash2 size={16} className="mr-1" /> Revoke
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {sessions.filter(s => !s.isCurrent).length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="self-start mt-2 border-destructive text-destructive hover:bg-destructive/10"
                          onClick={handleClearOtherSessions}
                        >
                          <LogOut size={14} className="mr-1.5" /> Sign Out Other Devices
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="max-w-4xl">
              <RetentionSettings />
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="max-w-4xl">
              <MyInvites hideHeader />
            </div>
          )}

          {activeTab === 'exports' && (
            <div className="max-w-4xl">
              <ExportSettings />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePassword('');
        }}
        title="Confirm Account Deletion"
      >
        <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
          <div className="p-4 bg-destructive/5 border border-destructive text-destructive rounded-lg text-sm flex gap-3 items-start">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Warning: This action is permanent!</span>
              <span>
                By deleting your account, you will lose access to all your groups, budget charts, and expenses. 
                Any active memberships will be terminated immediately.
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-normal">
            Please enter your password to confirm that you want to permanently delete your account.
          </p>

          <Input
            label="Your Password"
            type="password"
            placeholder="••••••••"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={isDeletingAccount}
            required
          />

          <div className="flex gap-3 justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingAccount}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletePassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isDeletingAccount}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete Permanently
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfileSettings;
