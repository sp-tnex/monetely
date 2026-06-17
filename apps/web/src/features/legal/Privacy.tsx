import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8 relative transition-colors duration-200 overflow-x-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-3xl bg-card border border-border rounded-lg p-6 sm:p-10 overflow-hidden shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6 mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center">
              <Lock size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Privacy Policy
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
              <span className="text-primary font-mono">1.</span> Introduction
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              At Monetely, we value your privacy. This Privacy Policy describes how we collect, use, process, and disclose your information when you access and use our Services. By using our Services, you consent to the practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">2.</span> Information We Collect
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              We collect information that you directly provide to us, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-xs sm:text-sm pl-2 mt-2 space-y-1">
              <li>Account information: email address, username, password.</li>
              <li>Group details: group names, expense descriptions, amounts, and division ratios.</li>
              <li>Settings and preferences: avatar configurations, currency preferences, and interface mode.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">3.</span> How We Use Your Information
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-xs sm:text-sm pl-2 mt-2 space-y-1">
              <li>To provide and maintain the core functionality of Monetely (calculating and minimizing splits).</li>
              <li>To manage your account, authenticate requests, and process invites.</li>
              <li>To communicate with you regarding security updates, technical announcements, or system changes.</li>
              <li>To improve our user interface, troubleshoot issues, and enhance general performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">4.</span> Sharing & Disclosure of Information
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Monetely does not sell or lease your personal information to third parties. Your expense data is shared only with other users who belong to the same groups. We may disclose information if required to comply with law, enforce our terms, or protect the rights and safety of Monetely and its users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">5.</span> Data Security & Protection
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              We employ industry-standard administrative, physical, and technical measures designed to safeguard your information from unauthorized access, loss, or alteration. However, please be aware that no security system is completely impenetrable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">6.</span> Data Retention & Account Deletion
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              We retain your information for as long as your account is active. You can delete your account or modify your profile information directly from settings at any time. When an account is deleted, your corresponding personal identifiable data is scrubbed or anonymized.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <span className="text-primary font-mono">7.</span> Updates to This Privacy Policy
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              We may update this Privacy Policy periodically. We will notify you of changes by posting the new policy here. We encourage you to review this Privacy Policy regularly for updates.
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

export default Privacy;
