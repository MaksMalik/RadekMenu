import { motion } from 'framer-motion';
import { Undo2, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onProfileOpen: () => void;
}

export function Header({ onProfileOpen }: HeaderProps) {
  const { state, dispatch } = useUser();
  const { user, signOut } = useAuth();
  const canUndo = state.historyStack.length > 0;

  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-white/90 to-white/70 dark:from-slate-800/90 dark:to-slate-800/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <img src="/foodus-logo.png" alt="Smakołysz" className="w-10 h-10 rounded-xl" />
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
            Smakołysz
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
            title={dark ? 'Tryb jasny' : 'Tryb ciemny'}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </motion.button>

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
                className="w-8 h-8 rounded-full ring-2 ring-emerald-200 shadow-sm"
                referrerPolicy="no-referrer"
              />
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => void signOut()}
              className="group relative p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Wyloguj"
            >
              <LogOut size={14} />
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium text-white bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Wyloguj
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}
