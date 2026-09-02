import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { clearAuth, loadAuth, saveAuth, type Role, type StoredAuth } from "./tokenStorage";

interface AuthContextValue {
  auth: StoredAuth | null;
  role: Role | null;
  login: (auth: StoredAuth) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => loadAuth());

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      role: auth?.role ?? null,
      login: (nextAuth) => {
        saveAuth(nextAuth);
        setAuth(nextAuth);
      },
      logout: () => {
        clearAuth();
        setAuth(null);
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
