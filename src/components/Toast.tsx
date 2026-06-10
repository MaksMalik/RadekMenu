import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = getToastConfig(toast.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm ${config.bg} ${config.border}`}
    >
      <config.Icon size={18} className={config.iconColor} />
      <p className={`text-sm font-medium flex-1 ${config.textColor}`}>{toast.message}</p>
      <button
        onClick={onDismiss}
        className={`p-1 rounded-full hover:bg-black/5 transition-colors ${config.iconColor}`}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-emerald-50',
        border: 'border border-emerald-200',
        iconColor: 'text-emerald-600',
        textColor: 'text-emerald-800',
        Icon: CheckCircle2,
      };
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border border-red-200',
        iconColor: 'text-red-600',
        textColor: 'text-red-800',
        Icon: AlertCircle,
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border border-amber-200',
        iconColor: 'text-amber-600',
        textColor: 'text-amber-800',
        Icon: AlertTriangle,
      };
  }
}
