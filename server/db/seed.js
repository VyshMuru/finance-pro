// ⚠️ SEED DISABLED — Real data mode
// To re-enable for testing, remove this line:
process.exit(0);

const { getDb } = require('./database');

const db = getDb();

// Clear existing data
db.exec(`
  DELETE FROM transactions;
  DELETE FROM budget_items;
  DELETE FROM accounts;
  DELETE FROM sqlite_sequence WHERE name IN ('transactions','budget_items','accounts');
`);

// ─── ACCOUNTS ────────────────────────────────────────────────
const insertAccount = db.prepare(`
  INSERT INTO accounts (name, type, starting_balance) VALUES (?, ?, ?)
`);

const accounts = [
  { name: 'TD Chequing', type: 'checking', starting_balance: 3200 },
  { name: 'TD Savings',  type: 'savings',  starting_balance: 8000 },
  { name: 'TD Aeroplan CC', type: 'credit', starting_balance: -420 },
  { name: 'TD Rewards CC', type: 'credit', starting_balance: -80  },
  { name: 'TFSA', type: 'investment', starting_balance: 15000 },
  { name: 'RRSP', type: 'investment', starting_balance: 22000 },
];

const accountIds = {};
for (const acc of accounts) {
  const result = insertAccount.run(acc.name, acc.type, acc.starting_balance);
  accountIds[acc.name] = result.lastInsertRowid;
}

// ─── BUDGET ITEMS ────────────────────────────────────────────
const insertBudget = db.prepare(`
  INSERT INTO budget_items (category, type, monthly_amount) VALUES (?, ?, ?)
`);

const budgets = [
  { category: 'Salary', type: 'income', monthly_amount: 5500 },
  { category: 'Freelance', type: 'income', monthly_amount: 800 },
  { category: 'Investments', type: 'income', monthly_amount: 200 },
  { category: 'Housing', type: 'expense', monthly_amount: 1800 },
  { category: 'Groceries', type: 'expense', monthly_amount: 450 },
  { category: 'Transport', type: 'expense', monthly_amount: 250 },
  { category: 'Dining', type: 'expense', monthly_amount: 300 },
  { category: 'Utilities', type: 'expense', monthly_amount: 180 },
  { category: 'Health', type: 'expense', monthly_amount: 120 },
  { category: 'Entertainment', type: 'expense', monthly_amount: 150 },
  { category: 'Shopping', type: 'expense', monthly_amount: 200 },
  { category: 'Subscriptions', type: 'expense', monthly_amount: 80 },
  { category: 'Savings', type: 'expense', monthly_amount: 500 },
];

for (const b of budgets) {
  insertBudget.run(b.category, b.type, b.monthly_amount);
}

// ─── TRANSACTIONS ────────────────────────────────────────────
const insertTx = db.prepare(`
  INSERT INTO transactions (date, type, category, subcategory, account_id, amount, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function rand(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

function pad(n) { return String(n).padStart(2, '0'); }

// Helper to add transactions for a given year
function seedYear(year) {
  const months = year === 2026 ? 4 : 12; // 2026 only up to April

  for (let month = 1; month <= months; month++) {
    const mm = pad(month);
    const daysInMonth = new Date(year, month, 0).getDate();

    // --- INCOME ---
    // Salary - 15th of month
    insertTx.run(`${year}-${mm}-15`, 'income', 'Salary', 'Employment', accountIds['TD Chequing'], rand(5300, 5700), 'Biweekly paycheque');
    // Freelance - random day
    if (Math.random() > 0.3) {
      insertTx.run(`${year}-${mm}-${pad(rand(1,28)>>0)}`, 'income', 'Freelance', 'Web Dev', accountIds['TD Chequing'], rand(400, 1200), 'Client project');
    }
    // Investment returns - end of month
    insertTx.run(`${year}-${mm}-${pad(daysInMonth)}`, 'income', 'Investments', 'Dividends', accountIds['TFSA'], rand(80, 350), 'Monthly dividends');

    // --- EXPENSES ---
    // Rent
    insertTx.run(`${year}-${mm}-01`, 'expense', 'Housing', 'Rent', accountIds['TD Chequing'], rand(1750, 1850), 'Monthly rent');
    // Groceries (2-3x per month)
    insertTx.run(`${year}-${mm}-${pad(rand(3,8)>>0)}`, 'expense', 'Groceries', 'Supermarket', accountIds['TD Aeroplan CC'], rand(120, 180), 'Loblaws');
    insertTx.run(`${year}-${mm}-${pad(rand(12,17)>>0)}`, 'expense', 'Groceries', 'Supermarket', accountIds['TD Aeroplan CC'], rand(100, 160), 'Metro');
    insertTx.run(`${year}-${mm}-${pad(rand(22,27)>>0)}`, 'expense', 'Groceries', 'Specialty', accountIds['TD Aeroplan CC'], rand(40, 90), 'Costco run');
    // Transport
    insertTx.run(`${year}-${mm}-${pad(rand(1,5)>>0)}`, 'expense', 'Transport', 'Transit', accountIds['TD Rewards CC'], rand(150, 180), 'Monthly TTC pass');
    if (Math.random() > 0.5) {
      insertTx.run(`${year}-${mm}-${pad(rand(5,25)>>0)}`, 'expense', 'Transport', 'Rideshare', accountIds['TD Rewards CC'], rand(15, 45), 'Uber');
    }
    // Dining
    insertTx.run(`${year}-${mm}-${pad(rand(5,10)>>0)}`, 'expense', 'Dining', 'Restaurant', accountIds['TD Aeroplan CC'], rand(40, 90), 'Dinner out');
    insertTx.run(`${year}-${mm}-${pad(rand(14,20)>>0)}`, 'expense', 'Dining', 'Coffee', accountIds['TD Rewards CC'], rand(20, 50), 'Cafe');
    if (Math.random() > 0.4) {
      insertTx.run(`${year}-${mm}-${pad(rand(20,28)>>0)}`, 'expense', 'Dining', 'Takeout', accountIds['TD Aeroplan CC'], rand(30, 70), 'Delivery');
    }
    // Utilities
    insertTx.run(`${year}-${mm}-${pad(rand(10,15)>>0)}`, 'expense', 'Utilities', 'Hydro', accountIds['TD Chequing'], rand(60, 100), 'Hydro bill');
    insertTx.run(`${year}-${mm}-${pad(rand(10,15)>>0)}`, 'expense', 'Utilities', 'Internet', accountIds['TD Chequing'], rand(65, 80), 'Rogers internet');
    insertTx.run(`${year}-${mm}-${pad(rand(10,15)>>0)}`, 'expense', 'Utilities', 'Phone', accountIds['TD Chequing'], rand(45, 65), 'Cell plan');
    // Subscriptions
    insertTx.run(`${year}-${mm}-01`, 'expense', 'Subscriptions', 'Streaming', accountIds['TD Rewards CC'], 17.99, 'Netflix');
    insertTx.run(`${year}-${mm}-05`, 'expense', 'Subscriptions', 'Music', accountIds['TD Rewards CC'], 10.99, 'Spotify');
    insertTx.run(`${year}-${mm}-10`, 'expense', 'Subscriptions', 'Cloud', accountIds['TD Rewards CC'], 3.99, 'iCloud');
    // Health
    if (Math.random() > 0.4) {
      insertTx.run(`${year}-${mm}-${pad(rand(5,25)>>0)}`, 'expense', 'Health', 'Pharmacy', accountIds['TD Rewards CC'], rand(20, 80), 'Shoppers Drug Mart');
    }
    if (Math.random() > 0.6) {
      insertTx.run(`${year}-${mm}-${pad(rand(5,25)>>0)}`, 'expense', 'Health', 'Fitness', accountIds['TD Chequing'], rand(40, 80), 'Gym membership');
    }
    // Entertainment
    if (Math.random() > 0.5) {
      insertTx.run(`${year}-${mm}-${pad(rand(5,25)>>0)}`, 'expense', 'Entertainment', 'Events', accountIds['TD Aeroplan CC'], rand(30, 120), 'Concert / movie');
    }
    // Shopping
    if (Math.random() > 0.4) {
      insertTx.run(`${year}-${mm}-${pad(rand(5,25)>>0)}`, 'expense', 'Shopping', 'Clothing', accountIds['TD Aeroplan CC'], rand(50, 200), 'Clothes');
    }
    if (Math.random() > 0.6) {
      insertTx.run(`${year}-${mm}-${pad(rand(5,25)>>0)}`, 'expense', 'Shopping', 'Electronics', accountIds['TD Rewards CC'], rand(30, 300), 'Electronics');
    }
    // Savings transfer
    insertTx.run(`${year}-${mm}-${pad(daysInMonth)}`, 'expense', 'Savings', 'TFSA Contribution', accountIds['TFSA'], rand(400, 600), 'Monthly TFSA top-up');
  }
}

seedYear(2025);
seedYear(2026);

const count = db.prepare('SELECT COUNT(*) as c FROM transactions').get();
console.log(`✅ Database seeded successfully!`);
console.log(`   Accounts: ${accounts.length}`);
console.log(`   Budget items: ${budgets.length}`);
console.log(`   Transactions: ${count.c}`);
