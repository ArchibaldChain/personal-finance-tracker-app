import { createContext, useContext, useState } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  activeUserId: number | null;
  signIn: (userId: number) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  activeUserId: null,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Starts unauthenticated — user must pick an account on the login page.
  // When GSP is integrated:
  //   - check localStorage for a saved token on init
  //   - replace signIn with Firebase signInWithPopup → store token + userId
  //   - replace signOut with Firebase signOut() + clear storage
  const [activeUserId, setActiveUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem('activeUserId');
    return saved ? Number(saved) : null;
  });

  function signIn(userId: number) {
    localStorage.setItem('activeUserId', String(userId));
    setActiveUserId(userId);
  }

  function signOut() {
    localStorage.removeItem('activeUserId');
    setActiveUserId(null);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: activeUserId !== null,
        activeUserId,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
