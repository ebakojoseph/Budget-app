import Constants from "expo-constants";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req(path: string, opts: RequestInit = {}) {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export type TxType = "expense" | "income";

export type Category = {
  id: string;
  name: string;
  type: TxType;
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

export const api = {
  seed: () => req("/seed", { method: "POST" }),
  getMonths: (): Promise<{ months: string[] }> => req("/months"),
  getSummary: (month: string): Promise<Summary> => req(`/summary?month=${month}`),

  listCategories: (month: string): Promise<Category[]> => req(`/categories?month=${month}`),
  createCategory: (body: Partial<Category>): Promise<Category> =>
    req("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<Category>): Promise<Category> =>
    req(`/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategory: (id: string) => req(`/categories/${id}`, { method: "DELETE" }),

  listTransactions: (month?: string, type?: TxType): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (type) params.set("type", type);
    const q = params.toString();
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
};

export function fmtMoney(n: number, currency = "$") {
  if (n === null || n === undefined || isNaN(n)) return `${currency}0.00`;
  const abs = Math.abs(n);
  const s = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}${currency}${s}`;
}

export function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
