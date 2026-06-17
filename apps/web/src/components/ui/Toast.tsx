import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import type { Toast as ToastType } from '../../store/toastStore';
import { cn } from '../../utils/cn';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastCardProps {
  toast: ToastType;
  onClose: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  };

  const bgClasses = {
    success: 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10',
    error: 'border-destructive/20 bg-destructive/5 dark:bg-destructive/10',
    info: 'border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border bg-card text-foreground pointer-events-auto',
        bgClasses[toast.type]
      )}
    >
      {icons[toast.type]}
      <div className="flex-1 text-sm font-medium text-foreground pr-2">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};
