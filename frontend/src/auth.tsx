import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  picture: string;
};

type Ctx = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | undefined>(undefined);

const KEY = "budget_session_token";
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function storeGet(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(KEY);
}
async function storeSet(v: string) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(KEY, v);
  } else {
    await SecureStore.setItemAsync(KEY, v);
  }
}
async function storeDel() {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(KEY);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const t = await storeGet();
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.ok) {
        const u = await r.json();
        setToken(t);
        setUser(u);
      } else {
        await storeDel();
      }
    } catch {
      await storeDel();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSession = async (t: string, u: AuthUser) => {
    await storeSet(t);
    setToken(t);
    setUser(u);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${BASE}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await storeDel();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setSession, logout, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export function getStoredToken() {
  return storeGet();
}
