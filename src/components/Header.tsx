import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, User, Utensils, Dumbbell, LogOut, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: 'dieta' | 'trening';
  onTabChange: (tab: 'dieta' | 'trening') => void;
  onProfileOpen: () => void;
}

export function Header({ activeTab, onTabChange, onProfileOpen }: HeaderProps) {
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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Utensils size={16} className="text-white" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            Silhouette Planner
          </h1>
        </div>

        {/* Center: Tabs */}
        <nav className="flex gap-1 bg-slate-100 rounded-full p-1 order-3 sm:order-none w-full sm:w-auto justify-center">
          {(['dieta', 'trening'] as const).map((tab) => (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={() => onTabChange(tab)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeTab === tab
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'dieta' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Utensils size={14} /> Dieta
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Dumbbell size={14} /> Trening
                </span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            className="p-2 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Cofnij"
          >
            <Undo2 size={18} />
          </motion.button>

          {/* User avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Użytkownik'}
                  className="w-8 h-8 rounded-full border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User size={16} className="text-emerald-600" />
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
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {user?.displayName ?? 'Użytkownik'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  {/* Actions */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onProfileOpen();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Settings size={16} /> Profil &amp; Cele
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
