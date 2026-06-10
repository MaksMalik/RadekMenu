import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithCredential, signOut as fbSignOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/config';

const GOOGLE_CLIENT_ID = '364237142982-1p71dgug0fajna11l1cilrcp0pkccetp.apps.googleusercontent.com';

interface GISAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
  }) => void;
  renderButton: (element: HTMLElement, config: {
    theme: string;
    size: string;
    width: number;
    text: string;
    locale: string;
  }) => void;
  disableAutoSelect: () => void;
  prompt: () => void;
}

interface GoogleGlobal {
  google?: {
    accounts?: {
      id?: GISAccountsId;
    };
  };
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  renderGoogleButton: (element: HTMLElement) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const gsiInitialized = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    const credential = GoogleAuthProvider.credential(response.credential);
    await signInWithCredential(auth, credential);
  }, []);

  // Load GIS script
  useEffect(() => {
    if (gsiInitialized.current) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const g = (window as unknown as GoogleGlobal).google;
      if (g?.accounts?.id) {
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: true,
        });
        gsiInitialized.current = true;
      }
    };
    document.head.appendChild(script);
  }, [handleCredentialResponse]);

  const renderGoogleButton = useCallback((element: HTMLElement) => {
    const g = (window as unknown as GoogleGlobal).google;
    if (g?.accounts?.id) {
      g.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        locale: 'pl',
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    const g = (window as unknown as GoogleGlobal).google;
    if (g?.accounts?.id) {
      g.accounts.id.disableAutoSelect();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, renderGoogleButton }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
