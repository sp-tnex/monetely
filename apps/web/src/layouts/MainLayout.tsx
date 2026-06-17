import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { api } from '../config/api';
import {
  Wallet,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  PlusCircle,
  Settings,
  Mail,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../utils/cn';

export const MainLayout: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!user) return;
      try {
        const res = await api.get('/invites/pending');
        setPendingCount(res.data.data.invites?.length || 0);
      } catch (err) {
        console.error('Failed to fetch pending invites count', err);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/groups/new', label: 'Create Group', icon: <PlusCircle size={18} /> },
    {
      to: '/profile?tab=invites',
      label: 'Invites',
      icon: <Mail size={18} />,
      badge: pendingCount > 0 ? pendingCount : undefined
    },
    { to: '/profile', label: 'Settings', icon: <Settings size={18} /> },
  ];
  const handleLogout = () => {
    clearAuth();
    addToast('Logged out successfully', 'success');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-150 font-sans">
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card p-5 gap-5 shrink-0 relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-secondary border border-border rounded-lg text-foreground flex items-center justify-center shrink-0">
            <Wallet size={16} />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">Monetely</span>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 p-2.5 bg-secondary/50 rounded-lg border border-border">
            <Avatar name={user.username} src={user.avatarUrl} size="sm" className="border border-border/80" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate text-foreground leading-tight">
                {user.username}
              </span>
              <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                {user.email}
              </span>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1 flex-1">
          {navLinks.map((link) => {
            const isActive = link.to === '/profile?tab=invites'
              ? (location.pathname === '/profile' && location.search.includes('tab=invites'))
              : link.to === '/profile'
                ? (location.pathname === '/profile' && !location.search.includes('tab=invites'))
                : location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center justify-between w-full py-2 px-3 transition-colors text-xs font-medium rounded-lg select-none',
                  isActive
                    ? 'bg-secondary text-foreground font-bold border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn('transition-colors', isActive && 'text-foreground')}>{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 pt-4 border-t border-border">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card md:hidden relative z-20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary border border-border rounded-lg text-foreground flex items-center justify-center shrink-0">
              <Wallet size={14} />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">Monetely</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg border border-border bg-secondary/50 text-foreground cursor-pointer hover:bg-secondary transition-colors"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex flex-col w-64 max-w-[80vw] bg-card border-r border-border p-5 gap-5 h-full z-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-secondary border border-border rounded-lg text-foreground flex items-center justify-center">
                    <Wallet size={14} />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    Monetely
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg border border-border hover:bg-secondary text-foreground cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {user && (
                <div className="flex items-center gap-2.5 p-2.5 bg-secondary/50 rounded-lg border border-border">
                  <Avatar name={user.username} src={user.avatarUrl} size="sm" className="border border-border" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate leading-tight text-foreground">
                      {user.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1 flex-1">
                {navLinks.map((link) => {
                  const isActive = link.to === '/profile?tab=invites'
                    ? (location.pathname === '/profile' && location.search.includes('tab=invites'))
                    : link.to === '/profile'
                      ? (location.pathname === '/profile' && !location.search.includes('tab=invites'))
                      : location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between w-full py-2 px-3 text-xs font-medium rounded-lg transition-colors',
                        isActive
                          ? 'bg-secondary text-foreground font-bold border border-border'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {link.icon}
                        <span className="truncate">{link.label}</span>
                      </div>
                      {link.badge !== undefined && (
                        <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-1 pt-4 border-t border-border">
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
