import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, User, Salad, LogOut, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onProfileOpen: () => void;
}

export function Header({ onProfileOpen }: HeaderProps) {
  const { state, dispatch } = useUser();
  const { user, signOut } = useAuth();
  const canUndo = state.historyStack.length > 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        {/* Logo + Title */}
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

        {/* Right: actions */}
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

          <div className="relative" ref={menuRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center rounded-full hover:ring-2 hover:ring-emerald-100 transition-all"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Użytkownik'}
                  className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User size={17} className="text-emerald-600" />
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                >
                  <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-br from-emerald-50/50 to-transparent">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {user?.displayName ?? 'Użytkownik'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onProfileOpen();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Settings size={16} /> Profil &amp; Cele
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} /> Wyloguj się
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
