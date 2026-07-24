import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
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

export type TxType = "expense" | "income" | "transfer";

export type Category = {
  id: string;
  name: string;
  type: "expense" | "income";
  planned: number;
  month: string;
  actual?: number;
  diff?: number;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: TxType;
  month: string;
  account_id?: string | null;
  to_account_id?: string | null;
};

export type Account = {
  id: string;
  name: string;
  group: string;
  balance: number;
  brought_forward: number;
};

export type Allocation = { id: string; name: string; percent: number };

export type Summary = {
  month: string;
  starting_balance: number;
  end_balance: number;
  saved_this_month: number;
  planned_expense: number;
  actual_expense: number;
  planned_income: number;
  actual_income: number;
  categories: Category[];
};

export type Budget = {
  id: string;
  month: string;
  name: string;
  share_token?: string | null;
  share_write?: boolean;
};

export type BalanceSnapshot = {
  id: string;
  account_id: string;
  month: string;
  balance: number;
};

export const api = {
  // auth
  createSession: (session_token: string) =>
    req("/auth/session", { method: "POST", body: JSON.stringify({ session_token }) }, false),

  seed: () => req("/seed", { method: "POST" }, false),
  getMonths: (): Promise<{ months: string[] }> => req("/months"),
  getSummary: (month: string): Promise<Summary> => req(`/summary?month=${month}`),
  getCharts: () => req("/charts"),

  listCategories: (month: string): Promise<Category[]> => req(`/categories?month=${month}`),
  createCategory: (body: Partial<Category>): Promise<Category> =>
    req("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<Category>): Promise<Category> =>
    req(`/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategory: (id: string) => req(`/categories/${id}`, { method: "DELETE" }),

  listTransactions: (params: { month?: string; type?: string; account_id?: string } = {}): Promise<Transaction[]> => {
    const p = new URLSearchParams();
    if (params.month) p.set("month", params.month);
    if (params.type) p.set("type", params.type);
    if (params.account_id) p.set("account_id", params.account_id);
    const q = p.toString();
    return req(`/transactions${q ? `?${q}` : ""}`);
  },
  createTransaction: (body: Partial<Transaction>): Promise<Transaction> =>
    req("/transactions", { method: "POST", body: JSON.stringify(body) }),
  updateTransaction: (id: string, body: Partial<Transaction>): Promise<Transaction> =>
    req(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTransaction: (id: string) => req(`/transactions/${id}`, { method: "DELETE" }),

  listAccounts: (): Promise<Account[]> => req("/accounts"),
  createAccount: (body: Partial<Account>): Promise<Account> =>
    req("/accounts", { method: "POST", body: JSON.stringify(body) }),
  updateAccount: (id: string, body: Partial<Account>): Promise<Account> =>
    req(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteAccount: (id: string) => req(`/accounts/${id}`, { method: "DELETE" }),

  listAllocations: (): Promise<Allocation[]> => req("/allocations"),
  updateAllocation: (id: string, percent: number): Promise<Allocation> =>
    req(`/allocations/${id}`, { method: "PUT", body: JSON.stringify({ percent }) }),

  listSnapshots: (month?: string): Promise<BalanceSnapshot[]> =>
    req(`/balance-snapshots${month ? `?month=${month}` : ""}`),
  createSnapshot: (body: { account_id: string; month: string; balance: number }) =>
    req("/balance-snapshots", { method: "POST", body: JSON.stringify(body) }),

  rollover: (from_month: string, to_month: string) =>
    req("/rollover", { method: "POST", body: JSON.stringify({ from_month, to_month }) }),

  listBudgets: (): Promise<Budget[]> => req("/budgets"),
  createBudget: (body: { month: string; name: string }): Promise<Budget> =>
    req("/budgets", { method: "POST", body: JSON.stringify(body) }),
  deleteBudget: (id: string) => req(`/budgets/${id}`, { method: "DELETE" }),
  shareBudget: (id: string, write: boolean): Promise<{ share_token: string; write: boolean }> =>
    req(`/budgets/${id}/share`, { method: "POST", body: JSON.stringify({ write }) }),
  unshareBudget: (id: string) => req(`/budgets/${id}/share`, { method: "DELETE" }),
  getShared: (token: string) => req(`/shared/${token}`, {}, false),

  exportExcelUrl: async (month: string) => {
    const t = await getToken();
    return { url: `${BASE}/api/export/excel?month=${month}`, token: t };
  },
};

export function fmtMoney(n: number, currency = "$") {
  if (n === null || n === undefined || isNaN(n)) return `${currency}0.00`;
  const abs = Math.abs(n);
  const s = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}${currency}${s}`;
}

export function fmtMonth(ym: string) {
  if (!ym || ym === "now") return "Now";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function fmtMonthShort(ym: string) {
  if (!ym || ym === "now") return "Now";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "short" });
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
