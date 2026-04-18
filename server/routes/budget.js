const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/budget ───────────────────────────────────────────
// Returns budget items with actual spending for the given period
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

  const budgets = db.prepare('SELECT * FROM budget_items ORDER BY type, category').all();

  const actuals = db.prepare(`
    SELECT category, type, SUM(amount) as spent
    FROM transactions
    WHERE ${dateClause}
    GROUP BY category, type
  `).all(...params);

  const actualMap = {};
  for (const a of actuals) {
    actualMap[`${a.type}:${a.category}`] = a.spent;
  }

  const monthMultiplier = month ? 1 : 12;

  const result = budgets.map(b => {
    const budgetAmount = b.monthly_amount * monthMultiplier;
    const spent = actualMap[`${b.type}:${b.category}`] || 0;
    return {
      ...b,
      budget_amount: +budgetAmount.toFixed(2),
      spent: +spent.toFixed(2),
      remaining: +(budgetAmount - spent).toFixed(2),
      percentage: budgetAmount > 0 ? +((spent / budgetAmount) * 100).toFixed(1) : 0,
    };
  });

  res.json(result);
});

// ── GET /api/budget/summary ───────────────────────────────────
router.get('/summary', (req, res) => {
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

  const monthMultiplier = month ? 1 : 12;

  const budgets = db.prepare('SELECT * FROM budget_items').all();
  const totalMonthly = budgets.filter(b => b.type === 'expense').reduce((s, b) => s + b.monthly_amount, 0);
  const totalYearly = totalMonthly * 12;
  const totalBudget = totalMonthly * monthMultiplier;

  const spentRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE ${dateClause} AND type = 'expense'
  `).get(...params);

  const spent = spentRow.total;
  const remaining = totalBudget - spent;

  res.json({
    totalMonthly: +totalMonthly.toFixed(2),
    totalYearly: +totalYearly.toFixed(2),
    totalBudget: +totalBudget.toFixed(2),
    spent: +spent.toFixed(2),
    remaining: +remaining.toFixed(2),
    adherence: totalBudget > 0 ? +((spent / totalBudget) * 100).toFixed(1) : 0,
  });
});

// ── POST /api/budget ──────────────────────────────────────────
router.post('/', (req, res) => {
  const db = getDb();
  const { category, type, monthly_amount } = req.body;
  if (!category || !type || monthly_amount == null) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO budget_items (category, type, monthly_amount) VALUES (?, ?, ?)').run(category, type, monthly_amount);
  res.status(201).json(db.prepare('SELECT * FROM budget_items WHERE id=?').get(result.lastInsertRowid));
});

// ── PUT /api/budget/:id ───────────────────────────────────────
router.put('/:id', (req, res) => {
  const db = getDb();
  const { category, type, monthly_amount } = req.body;
  db.prepare('UPDATE budget_items SET category=?, type=?, monthly_amount=? WHERE id=?').run(category, type, monthly_amount, req.params.id);
  res.json(db.prepare('SELECT * FROM budget_items WHERE id=?').get(req.params.id));
});

// ── DELETE /api/budget/:id ────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM budget_items WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
