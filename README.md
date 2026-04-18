# 💰 Finance Pro — Personal Finance Dashboard

A production-grade local finance tracker with a dark dashboard, real-time charts, and full CRUD across all financial data.

---
## 🚧 Status: Active Development
## ✨ Features

| Section | What it does |
|---|---|
| **Overview** | Cash flow charts, KPIs, income vs expense comparison |
| **Income** | Trend chart (yearly) or category pie (monthly), full transaction table |
| **Expense** | Same as Income but for expenses, with category breakdown |
| **Accounts** | Add/edit/delete accounts, see balances, assets vs liabilities |
| **Net Worth** | Running net worth trend, assets vs liabilities over time |
| **Budget** | Set monthly budgets, track spend vs budget with progress bars |

**Period Selector** (top right): Switch between Year and Month view across all sections.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js v18+** — https://nodejs.org

### macOS / Linux
```bash
chmod +x start.sh
./start.sh
```

### Windows
```
Double-click start.bat
```

Open **http://localhost:5173** in your browser.

---

## 📂 Project Structure

```
finance-pro/
├── start.sh / start.bat       ← One-click launch scripts
├── server/
│   ├── server.js              ← Express API (port 3001)
│   ├── finance.db             ← SQLite database (auto-created)
│   ├── db/
│   │   ├── database.js        ← Schema definition
│   │   └── seed.js            ← Sample data seeder
│   └── routes/
│       ├── transactions.js    ← Income & expense CRUD
│       ├── accounts.js        ← Account management
│       ├── budget.js          ← Budget items CRUD
│       └── overview.js        ← Dashboard aggregations
└── client/
    └── src/
        ├── App.jsx            ← Root layout
        ├── store/useStore.js  ← Global state (Zustand)
        ├── api/index.js       ← API abstraction
        ├── components/
        │   ├── Layout/        ← Sidebar, PeriodSelector
        │   ├── shared/        ← KPICard, DataTable, Modal
        │   └── sections/      ← Overview, Income, Expense, Accounts, NetWorth, Budget
        └── utils/formatters.js
```

---

## 🗄️ Database

SQLite file at `server/finance.db`. Three tables:

| Table | Purpose |
|---|---|
| `accounts` | Bank accounts, credit cards, investments |
| `transactions` | All income and expense transactions |
| `budget_items` | Monthly budget targets per category |

**Re-seed sample data:**
```bash
cd server && node db/seed.js
```

---

## 🔌 API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/overview?year=&month=` | Dashboard summary + monthly chart data |
| GET | `/api/overview/networth-trend?year=` | Monthly net worth history |
| GET | `/api/transactions?year=&month=&type=` | List transactions |
| GET | `/api/transactions/summary?year=&month=&type=` | Aggregated totals + by category |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/accounts` | List accounts with computed balances |
| GET | `/api/accounts/summary` | Assets / liabilities / net worth totals |
| POST/PUT/DELETE | `/api/accounts/:id` | Account CRUD |
| GET | `/api/budget?year=&month=` | Budget items with actual spend |
| GET | `/api/budget/summary` | Budget summary KPIs |
| POST/PUT/DELETE | `/api/budget/:id` | Budget item CRUD |

---

## 🛠️ Adding Your Own Data

### Add transactions via the UI
Click **+ Add Transaction** in the sidebar.

### Import from CSV (future)
You can insert directly into SQLite:
```bash
cd server
node -e "
const {getDb}=require('./db/database');
const db=getDb();
db.prepare(\`INSERT INTO transactions (date,type,category,subcategory,account_id,amount,notes) VALUES (?,?,?,?,?,?,?)\`)
  .run('2026-04-15','income','Salary','Employment',1,5500,'');
console.log('Done');
"
```

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| State | Zustand |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Dev runner | Concurrently |

---

## 🔧 Manual Start (if scripts don't work)

```bash
# Terminal 1 — API server
cd server
node server.js

# Terminal 2 — Frontend
cd client
npm run dev
```
