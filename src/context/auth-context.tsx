'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserRole } from '@/types';
import { DEMO_CREDENTIALS, ROLE_PERMISSIONS, NavItemKey } from '@/data/mock-credentials';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  hasPermission: (page: NavItemKey) => boolean;
  permissions: typeof ROLE_PERMISSIONS['Super Admin'] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'trackwe_demo_auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Restore session on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed && parsed.role && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read auth session from localStorage', e);
    }
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    // Artificial slight delay for realistic loading feel
    await new Promise((resolve) => setTimeout(resolve, 350));

    const trimmedEmail = email.trim().toLowerCase();
    const credEntry = Object.values(DEMO_CREDENTIALS).find(
      (c) => c.email.toLowerCase() === trimmedEmail
    );

    if (!credEntry) {
      return { success: false, error: 'User account not found. Please select a demo account or verify email.' };
    }

    if (credEntry.password !== pass) {
      return { success: false, error: 'Incorrect password. Demo password is: Trackwe@123' };
    }

    setUser(credEntry.user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credEntry.user));
    } catch (e) {
      console.warn('Failed to save session to localStorage', e);
    }

    return { success: true };
  };

  const quickLogin = async (roleName: UserRole) => {
    const cred = DEMO_CREDENTIALS[roleName];
    if (cred) {
      await login(cred.email, cred.password);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear session', e);
    }
  };

  const role = user?.role ?? null;
  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  const hasPermission = (pageKey: NavItemKey): boolean => {
    if (!permissions) return false;
    return permissions.allowedPages.includes(pageKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        quickLogin,
        logout,
        hasPermission,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
