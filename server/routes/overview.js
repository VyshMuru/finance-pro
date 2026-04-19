const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/overview ─────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const { year = new Date().getFullYear(), month } = req.query;

  let dateClause, params;
  if (month) {
    dateClause = `strftime('%Y', date) = ? AND strftime('%m', date) = ?`;
    params = [String(year), String(month).padStart(2, '0')];
  } else {
    dateClause = `strftime('%Y', date) = ?`;
    params = [String(year)];
  }

  // ── Exclude transfers from income/expense totals ───────────
  const income = db.prepare(`
    SELECT COALESCE(SUM(amount),0) as total 
    FROM transactions 
    WHERE ${dateClause} 
    AND type = 'income'
  `).get(...params).total;

  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount),0) as total 
    FROM transactions 
    WHERE ${dateClause} 
    AND type = 'expense'
  `).get(...params).total;

  // ── Monthly breakdown (exclude transfers) ─────────────────
  const monthly = db.prepare(`
    SELECT strftime('%m', date) as month, type, SUM(amount) as total
    FROM transactions
    WHERE ${dateClause}
    AND type IN ('income', 'expense')
    GROUP BY month, type
    ORDER BY month
  `).all(...params);

  // ── Account balances for net worth ────────────────────────
  const accounts = db.prepare(`
    SELECT a.*,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS inflows,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS outflows,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.account_id = a.id THEN t.amount ELSE 0 END), 0) AS transfers_out,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount ELSE 0 END), 0) AS transfers_in
    FROM accounts a 
    LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id)
    GROUP BY a.id
  `).all();

  let assets = 0, liabilities = 0;
  for (const a of accounts) {
    const isLia = ['credit', 'loan'].includes(a.type);
    let bal;
    if (isLia) {
      bal = a.starting_balance - a.inflows + a.outflows - a.transfers_in + a.transfers_out;
    } else {
      bal = a.starting_balance + a.inflows - a.outflows + a.transfers_in - a.transfers_out;
    }
    if (isLia) liabilities += Math.abs(bal);
    else assets += bal;
  }

  const numMonths = month ? 1 : ([...new Set(monthly.map(m => m.month))].length || 1);

  res.json({
    totalIncome: +income.toFixed(2),
    totalExpenses: +expenses.toFixed(2),
    netSurplus: +(income - expenses).toFixed(2),
    savingsRate: income > 0 ? +((income - expenses) / income * 100).toFixed(1) : 0,
    avgMonthlyIncome: +(income / numMonths).toFixed(2),
    avgMonthlyExpenses: +(expenses / numMonths).toFixed(2),
    netWorth: +(assets - liabilities).toFixed(2),
    totalAssets: +assets.toFixed(2),
    totalLiabilities: +liabilities.toFixed(2),
    monthly,
  });
});

// ── GET /api/overview/networth-trend ─────────────────────────
router.get('/networth-trend', (req, res) => {
  const db = getDb();
  const { year = new Date().getFullYear() } = req.query;

  const accounts = db.prepare('SELECT * FROM accounts').all();
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const trend = [];

  for (const mm of months) {
    const endDate = `${year}-${mm}-31`;

    // ── Get all transactions up to end of this month ─────────
    const txRows = db.prepare(`
      SELECT 
        account_id, 
        to_account_id,
        type, 
        SUM(amount) as total
      FROM transactions
      WHERE date <= ? AND strftime('%Y', date) = ?
      GROUP BY account_id, to_account_id, type
    `).all(endDate, String(year));

    // ── Build balance map per account ─────────────────────────
    const balMap = {};
    for (const acc of accounts) {
      balMap[acc.id] = { income: 0, expense: 0, transfers_in: 0, transfers_out: 0 };
    }

    for (const tx of txRows) {
      if (tx.type === 'income' && balMap[tx.account_id]) {
        balMap[tx.account_id].income += tx.total;
      }
      if (tx.type === 'expense' && balMap[tx.account_id]) {
        balMap[tx.account_id].expense += tx.total;
      }
      if (tx.type === 'transfer') {
        if (balMap[tx.account_id]) balMap[tx.account_id].transfers_out += tx.total;
        if (balMap[tx.to_account_id]) balMap[tx.to_account_id].transfers_in += tx.total;
      }
    }

    let assets = 0, liabilities = 0;
    for (const acc of accounts) {
      const t = balMap[acc.id] || { income: 0, expense: 0, transfers_in: 0, transfers_out: 0 };
      const isLia = ['credit', 'loan'].includes(acc.type);
      let bal;
      if (isLia) {
        bal = acc.starting_balance - t.income + t.expense - t.transfers_in + t.transfers_out;
      } else {
        bal = acc.starting_balance + t.income - t.expense + t.transfers_in - t.transfers_out;
      }
      if (isLia) liabilities += Math.abs(bal);
      else assets += bal;
    }

    // Only include months that have transactions
    const hasTx = db.prepare(`
      SELECT COUNT(*) as c FROM transactions 
      WHERE strftime('%Y-%m', date) = ?
    `).get(`${year}-${mm}`).c;

    if (hasTx > 0) {
      trend.push({
        month: mm,
        assets: +assets.toFixed(2),
        liabilities: +liabilities.toFixed(2),
        netWorth: +(assets - liabilities).toFixed(2),
      });
    }
  }

  res.json(trend);
});

module.exports = router;