import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearSession, loadSession, saveSession, type Role, type Session } from "./tokenStorage";

interface AuthContextValue {
  session: Session | null;
  role: Role | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      role: session?.role ?? null,
      login: (nextSession) => {
        saveSession(nextSession);
        setSession(nextSession);
      },
      logout: () => {
        clearSession();
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
