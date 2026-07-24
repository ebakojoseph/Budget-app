# BudgetTracker — PRD

## Overview
Mobile personal finance app converted from the user's "July 2026 Budget.xlsx" workbook.
Replicates 3 sheets (Summary, Transactions, Accounts) as native mobile screens and adds charts, month picker, live CRUD, and cloud storage.

## Tech
- **Frontend**: Expo Router (React Native), react-native-gifted-charts, expo-image, expo-linear-gradient, expo-font (Plus Jakarta Sans + Space Grotesk)
- **Backend**: FastAPI + Motor (MongoDB), all routes under `/api`
- **Auth**: None (single-user MVP)

## Features Implemented
1. **Dashboard**: hero balance card (start / end / saved), Expenses vs Income summary, segmented tabs, budget-category progress bars, month picker modal, Quick Add FAB
2. **Transactions**: Expense/Income segmented list grouped by day, add/edit/delete via bottom-sheet-style editor, category picker
3. **Accounts**: Net worth card, 20 accounts seeded from workbook grouped by Cash / Registered / Investment / Crypto / Other, per-account brought-forward vs balance change, add/edit/delete
4. **Investments**: SVG donut chart of 9 allocation buckets (EF 5%, Grow 15%, FHSA 30%, RRSP 10%, RESP 10%, EJ TFSA 10%, PJ TFSA 30%, Non-Registered 0%, Crypto 10%), edit each % via modal, live-calculated monetary distribution from actual income
5. **Categories**: Add/edit/delete via editor screen from Dashboard
6. **Auto-seed**: Backend seeds July-2026 categories, sample transactions, and 20 accounts on first startup

## Backend Endpoints
- `GET/POST /api/categories`, `PUT/DELETE /api/categories/{id}`
- `GET/POST /api/transactions`, `PUT/DELETE /api/transactions/{id}`
- `GET/POST /api/accounts`, `PUT/DELETE /api/accounts/{id}`
- `GET /api/allocations`, `PUT /api/allocations/{id}`
- `GET /api/summary?month=YYYY-MM`, `GET /api/months`, `POST /api/seed`

## Design
Sage green (#4B6955) + warm sand (#F9F9F7). Plus Jakarta Sans body, Space Grotesk numeric. iOS-native clean personality with glassmorphism hero.

## Known Limitations
- Default allocation totals 120% (matches original workbook overallocation) — UI warns the user.
- No auth, no multi-user, no push notifications.
