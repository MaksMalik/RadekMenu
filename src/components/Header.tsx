import { motion } from 'framer-motion';
import { Undo2, Salad, Settings, LogOut } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onProfileOpen: () => void;
}

export function Header({ onProfileOpen }: HeaderProps) {
  const { state, dispatch } = useUser();
  const { user, signOut } = useAuth();
  const canUndo = state.historyStack.length > 0;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200/50">
            <Salad size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              Silhouette Planner
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">Twój plan rekompozycji</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Cofnij"
          >
            <Undo2 size={17} />
            <span className="hidden sm:inline">Cofnij</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onProfileOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <Settings size={17} />
            <span className="hidden sm:inline">Ustawienia</span>
          </motion.button>

          {/* User avatar & sign out */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'Avatar'}
                className="w-8 h-8 rounded-full border border-slate-200"
                referrerPolicy="no-referrer"
              />
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Wyloguj"
            >
              <LogOut size={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}
