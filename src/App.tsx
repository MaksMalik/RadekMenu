import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { ProfileDrawer } from './components/ProfileDrawer';
import { DietView } from './components/DietView';
import { LoginScreen } from './components/LoginScreen';

function AppContent() {
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <Header onProfileOpen={() => setProfileOpen(true)} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <DietView />
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
  if (!user) return <LoginScreen />;
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
