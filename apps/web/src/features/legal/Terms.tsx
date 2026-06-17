import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8 relative transition-colors duration-200 overflow-x-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-3xl bg-card border border-border rounded-lg p-6 sm:p-10 overflow-hidden shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6 mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center">
              <ShieldCheck size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Terms of Service
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last updated: June 12, 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-muted-foreground/60" />
            <span className="text-xs font-bold text-muted-foreground/80 font-mono tracking-wider">Monetely</span>
          </div>
        </div>

        <div className="space-y-6 text-sm text-foreground/85 leading-relaxed overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin relative z-10">
          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">1.</span> Agreement to Terms
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Welcome to Monetely. By accessing or using our application, websites, or services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">2.</span> Account Registration & Security
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              To use most features of the Services, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information. You are solely responsible for safeguarding your password and account credentials, and you agree to notify us immediately of any unauthorized activity.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">3.</span> Expense Sharing & Financial Splits
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Monetely provides automatic expense sharing and split minimization calculation tools. Monetely is a utility application to help calculate transactions and does not act as a financial institution, escrow holder, or money transmitter. Any settling of debts, transfer of funds, or financial agreements made within groups are the sole responsibility of the users involved.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">4.</span> User Conduct & Acceptable Use
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              You agree not to use the Services to post false or misleading transaction data, engage in fraudulent behavior, harass other users, or attempt to disrupt the performance and security of our platform. We reserve the right to suspend or terminate accounts that violate these rules.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">5.</span> Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              The Services are provided on an "as is" and "as available" basis without warranties of any kind. Monetely does not guarantee that calculations will be error-free or that the platform will always be accessible. You use the Services at your own discretion and risk.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">6.</span> Limitation of Liability
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              To the maximum extent permitted by law, Monetely and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">7.</span> Modifications to Terms
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.
            </p>
          </section>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/50 relative z-10">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 font-semibold hover:bg-secondary/50 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Terms;
