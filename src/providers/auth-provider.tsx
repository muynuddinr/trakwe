"use client";
import { demoAuth, SESSION_KEY } from "@/lib/auth";
import type { DemoAccount } from "@/types";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
interface AuthContextValue {
  account: DemoAccount | null;
  ready: boolean;
  login: (account: DemoAccount) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setAccount(demoAuth.restore());
    sync();
    setReady(true);
    const interval = setInterval(sync, 60000);
    const storage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) sync();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("pageshow", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", storage);
      window.removeEventListener("pageshow", sync);
    };
  }, []);
  function login(account: DemoAccount) {
    setAccount(account);
    router.replace("/dashboard");
  }
  function logout() {
    demoAuth.logout();
    setAccount(null);
    router.replace("/login");
  }
  return (
    <AuthContext.Provider value={{ account, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
