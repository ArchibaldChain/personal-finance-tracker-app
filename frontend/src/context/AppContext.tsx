import { createContext, useContext, useEffect, useState } from 'react';
import { getDefaultLedger, listUsers } from '../api/ledgers';
import { useAuth } from './AuthContext';
import type { User } from '../types';

interface AppUser {
  id: number;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface AppContextValue {
  ledgerId: number | null;
  user: AppUser | null;
  allUsers: User[];
  loading: boolean;
  refreshUsers: () => void;
  refreshCurrentUser: () => void;
}

const AppContext = createContext<AppContextValue>({
  ledgerId: null,
  user: null,
  allUsers: [],
  loading: true,
  refreshUsers: () => {},
  refreshCurrentUser: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { activeUserId } = useAuth();
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  function refreshUsers() {
    listUsers().then(setAllUsers).catch(console.error);
  }

  function loadLedger(userId: number) {
    setLoading(true);
    getDefaultLedger(userId)
      .then((ledger) => {
        setLedgerId(ledger.id);
        setUser({
          id: ledger.owner.id,
          displayName: ledger.owner.display_name,
          email: ledger.owner.email,
          avatarUrl: ledger.owner.avatar_url,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function refreshCurrentUser() {
    if (activeUserId != null) loadLedger(activeUserId);
  }

  // Re-fetch whenever the signed-in user changes
  useEffect(() => {
    if (activeUserId == null) {
      setLedgerId(null);
      setUser(null);
      return;
    }
    loadLedger(activeUserId);
  }, [activeUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load user list once on mount (needed for login page)
  useEffect(() => {
    refreshUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{ ledgerId, user, allUsers, loading, refreshUsers, refreshCurrentUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  return useContext(AppContext);
}
