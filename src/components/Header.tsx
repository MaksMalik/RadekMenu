import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';

interface HeaderProps {
  onProfileOpen: () => void;
}

export function Header({ onProfileOpen }: HeaderProps) {
  const { state, dispatch } = useUser();
  const { user, signOut } = useAuth();
  const canUndo = state.historyStack.length > 0;

  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Cofnij"
          >
            <Undo2 size={17} />
            <span className="hidden sm:inline">Cofnij</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onProfileOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings size={17} />
            <span className="hidden sm:inline">Ustawienia</span>
          </motion.button>

          {/* User avatar dropdown */}
          <div className="relative ml-2 pl-2 border-l border-slate-200 dark:border-slate-700" ref={menuRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu użytkownika"
              aria-expanded={menuOpen}
              className="block rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Avatar'}
                  className="w-8 h-8 rounded-full ring-2 ring-emerald-200 dark:ring-emerald-500/40 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-emerald-200 dark:ring-emerald-500/40 shadow-sm bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                  {(user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-30 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                >
                  {/* User identity header */}
                  {(user?.displayName || user?.email) && (
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      {user?.displayName && (
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {user.displayName}
                        </p>
                      )}
                      {user?.email && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Dark mode toggle */}
                  <button
                    onClick={() => setDark(d => !d)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {dark ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-400" />}
                    {dark ? 'Tryb jasny' : 'Tryb ciemny'}
                  </button>

                  {/* Sign out */}
                  <button
                    onClick={() => { setMenuOpen(false); void signOut(); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={16} />
                    Wyloguj
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
