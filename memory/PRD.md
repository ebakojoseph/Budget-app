# BudgetTracker — PRD (v2)

Mobile personal finance app derived from user's Excel workbook, extended with cloud sync, multi-account operations, budgets, sharing, and analytics.

## Auth
- **Emergent-managed Google OAuth**. Session token stored in expo-secure-store (mobile) / localStorage (web).
- Backend: `POST /api/auth/session` exchanges Emergent session_id → local session_token; `GET /api/auth/me`; `POST /api/auth/logout`.
- All data collections are scoped by `owner_id`. Existing (unclaimed) seed data is auto-migrated to the first authenticated user.

## Screens
1. **Login** — Google sign-in
2. **Dashboard (tab)** — monthly hero, expense vs income cards, per-category progress, month picker, quick-add FAB, header shortcuts to Charts/Budgets/Profile
3. **Transactions (tab)** — expense/income filter, grouped by day
4. **Accounts (tab)** — net worth, groups, tap-through to Account Detail. Multi-option FAB: Add account / Add transaction / Transfer
5. **Investments (tab)** — donut allocation, editable percentages
6. **Account Detail** — balance, gain/loss, per-account transactions, month-end balance entry, snapshots history
7. **Charts** — net-worth line, spending-by-category donut, planned-vs-actual bar
8. **Budgets** — save budget snapshots per month, share via link (read or read+write), export as .xlsx, roll forward categories + accounts to next month
9. **Profile / Settings** — user info, quick links, sign out
10. **Shared** — public `/shared/[token]` viewer with optional inline planned-amount edits

## Key Backend Endpoints (auth-required unless noted)
- `POST /api/auth/session`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET/POST /api/categories`, `PUT/DELETE /api/categories/{id}`
- `GET/POST /api/transactions` (type=expense/income/transfer, optional account_id / to_account_id)
- `GET/POST /api/accounts`, PUT/DELETE
- `GET /api/allocations`, `PUT /api/allocations/{id}`
- `GET/POST /api/balance-snapshots` (upserts and syncs account balance)
- `POST /api/rollover {from_month, to_month}`
- `GET /api/summary?month=YYYY-MM`, `GET /api/months`, `GET /api/charts`
- `GET/POST /api/budgets`, `DELETE`, `POST /api/budgets/{id}/share`, `DELETE /api/budgets/{id}/share`
- Public: `GET /api/shared/{token}`, `PUT /api/shared/{token}/category` (write share only)
- `GET /api/export/excel?month=YYYY-MM` — streams .xlsx

## Data Model additions (v2)
- `owner_id` on all collections
- `Transaction.account_id`, `Transaction.to_account_id`, type `transfer`
- New collections: `users`, `user_sessions`, `balance_snapshots`, `budgets`

## Business Logic
- Creating an income/expense transaction with an `account_id` adjusts that account's balance.
- A `transfer` decrements `from` and increments `to` account balance.
- End-of-month snapshot upserts and sets that account's balance to the reported value; the difference from brought-forward is the month's gain.
- Rollover: copies prior month's categories (only if the destination month is empty) and sets each account's `brought_forward` = current balance.

## Sharing
- Share link is `${EXPO_PUBLIC_BACKEND_URL}/shared/{token}`. Deep-linked web route in the app.
- Two modes: read-only, and read+write (recipient can update `planned` per category).
- Owner can revoke.

## Excel Export
- 3 sheets: Summary (balances, planned/actual per category), Transactions (dated, typed, with account names), Accounts (balance, brought forward, change).

## Design
Sage green (#4B6955) + warm sand (#F9F9F7). Plus Jakarta Sans body + Space Grotesk numeric.

## Known Limitations
- Deep link on native uses backend URL — best experienced on web / in-app WebView. On mobile Expo Go, opening `${BASE}/shared/{token}` in a browser is the fallback path.
- Rollover intentionally does not recreate account snapshots — brought-forward carries the closing balance implicitly.
