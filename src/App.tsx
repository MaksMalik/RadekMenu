import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { ProfileDrawer } from './components/ProfileDrawer';
import { DietView } from './components/DietView';
import { WorkoutView } from './components/WorkoutView';
import { LoginScreen } from './components/LoginScreen';

type Tab = 'dieta' | 'trening';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dieta');
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans text-slate-800">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onProfileOpen={() => setProfileOpen(true)}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dieta' ? <DietView /> : <WorkoutView />}
          </motion.div>
        </AnimatePresence>
      </main>
      <ProfileDrawer isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <UserProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </UserProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
