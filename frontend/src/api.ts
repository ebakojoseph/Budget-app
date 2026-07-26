import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE = Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
const KEY = "budget_session_token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(KEY);
}

async function req(path: string, opts: RequestInit = {}, requireAuth = true) {
  const url = `${BASE}/api${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (requireAuth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(url, { ...opts, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  if (res.status === 204) return null;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const api = {
  createSessionWithGoogle: async (accessToken: string) => {
    const res = await fetch(`${BASE}/session/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google login failed: ${text}`);
    }

    return res.json();
  },

  // Your other API calls remain unchanged...
};

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function fmtMonth(month: string) {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

export function fmtMoney(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}
