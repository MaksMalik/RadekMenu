import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Responsive modal wrapper.
 * - Below 640px: renders as a bottom sheet (full width, anchored bottom, slide-up/down).
 * - At >= 640px: renders as a centered dialog.
 * Interactive controls get min 44x44px touch targets via the `touch-target` utility class.
 */
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom sheet (< 640px) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-h-[100dvh] flex flex-col bg-white rounded-t-3xl shadow-xl overflow-hidden sm:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-[env(safe-area-inset-bottom,16px)]">
              {children}
            </div>
          </motion.div>

          {/* Centered dialog (>= 640px) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative hidden sm:flex sm:flex-col bg-white rounded-3xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Zamknij"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
