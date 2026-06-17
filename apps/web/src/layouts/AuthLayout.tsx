import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Wallet, ArrowRight } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const { accessToken } = useAuthStore();

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background font-sans overflow-x-hidden transition-colors duration-200">
      <div className="hidden lg:flex lg:col-span-5 relative bg-card items-center justify-center p-12 overflow-hidden border-r border-border">
        <div className="relative z-10 flex flex-col gap-10 max-w-md text-foreground">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-secondary border border-border rounded-lg text-foreground flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">Monetely</span>
          </div>
 
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-border bg-secondary text-xs font-medium text-muted-foreground">
              Minimizing Splits Automatically
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-tight text-foreground">
              Expense sharing, <br />
              <span className="text-muted-foreground">reimagined for teams.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Keep track of bills, group expenses, and settle debts instantly. Monetely calculates minimized transaction routes automatically to save everyone time and money.
            </p>
          </div>
 
          <div className="relative p-6 rounded-lg bg-secondary/40 border border-border flex flex-col gap-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/60 font-mono">paris_trip_2026</span>
            </div>
 
            <div className="flex flex-col gap-4 relative">
              <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-card border border-border">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider">
                  <span>Standard Expenses (3 transactions)</span>
                  <span className="text-red-500 font-semibold font-mono">$350 total</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Emma owes Noah</span>
                    <span className="font-mono font-semibold">$150.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Noah owes Sophia</span>
                    <span className="font-mono font-semibold">$100.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sophia owes Emma</span>
                    <span className="font-mono font-semibold">$100.00</span>
                  </div>
                </div>
              </div>
 
              <div className="flex justify-center items-center gap-2 my-1">
                <div className="h-[1px] flex-1 bg-border" />
                <div className="px-2 py-0.5 rounded bg-secondary border border-border text-[9px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                  Minimized by algorithm
                </div>
                <div className="h-[1px] flex-1 bg-border" />
              </div>
 
              {/* Box 2: After Simplification */}
              <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex justify-between items-center text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  <span>Optimized Settlements (1 transaction)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Saved 66% transactions</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Emma</span>
                      <ArrowRight size={10} className="text-emerald-500" />
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Sophia</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">$50.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 md:p-16 relative bg-background min-h-screen transition-colors duration-200">
        <div className="flex lg:hidden items-center justify-between w-full relative z-10 mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-card rounded-lg border border-border text-foreground">
              <Wallet size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">Monetely</span>
          </div>
        </div>
 
        <div className="hidden lg:block" />
 
        <div className="w-full max-w-[420px] mx-auto relative z-10 py-8">
          <Outlet />
        </div>
 
        <div className="w-full text-center relative z-10 text-[11px] text-muted-foreground font-medium flex flex-wrap items-center justify-center gap-1.5 mt-8">
          <span>&copy; {new Date().getFullYear()} Monetely Inc.</span>
          <span>&bull;</span>
          <Link to="/terms" className="hover:text-foreground hover:underline transition-all">Terms of Service</Link>
          <span>&bull;</span>
          <Link to="/privacy" className="hover:text-foreground hover:underline transition-all">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
};
