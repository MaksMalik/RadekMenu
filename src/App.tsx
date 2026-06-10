import { useState } from 'react';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './components/Toast';
import { Header } from './components/Header';
import { ProfileDrawer } from './components/ProfileDrawer';
import { DietView } from './components/DietView';

function AppContent() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans text-slate-800">
      <Header onProfileOpen={() => setProfileOpen(true)} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <DietView />
      </main>
      <ProfileDrawer isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </UserProvider>
  );
}
