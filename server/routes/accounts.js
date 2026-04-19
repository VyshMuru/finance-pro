const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── GET /api/accounts ─────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb();
  const accounts = db.prepare(`
    SELECT
      a.*,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_inflows,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_outflows,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.account_id = a.id THEN t.amount ELSE 0 END), 0) AS total_transfers_out,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount ELSE 0 END), 0) AS total_transfers_in
    FROM accounts a
    LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id)
    GROUP BY a.id
    ORDER BY a.type, a.name
  `).all();

  const result = accounts.map(acc => {
    const isLiability = ['credit', 'loan'].includes(acc.type);
    let currentBalance;

    if (isLiability) {
      // Credit/loan: starts negative, payments reduce it
      currentBalance = acc.starting_balance
        - acc.total_inflows
        + acc.total_outflows
        - acc.total_transfers_in
        + acc.total_transfers_out;
    } else {
      // Asset: starts positive, income adds, expenses subtract
      currentBalance = acc.starting_balance
        + acc.total_inflows
        - acc.total_outflows
        + acc.total_transfers_in
        - acc.total_transfers_out;
    }

    return { ...acc, current_balance: +currentBalance.toFixed(2) };
  });

  res.json(result);
});

// ── GET /api/accounts/summary ─────────────────────────────────
router.get('/summary', (req, res) => {
  const db = getDb();
  const accounts = db.prepare(`
    SELECT
      a.*,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_inflows,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_outflows,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.account_id = a.id THEN t.amount ELSE 0 END), 0) AS total_transfers_out,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount ELSE 0 END), 0) AS total_transfers_in
    FROM accounts a
    LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id)
    GROUP BY a.id
  `).all();

  let totalAssets = 0, totalLiabilities = 0;

  for (const acc of accounts) {
    const isLiability = ['credit', 'loan'].includes(acc.type);
    let current;

    if (isLiability) {
      current = acc.starting_balance
        - acc.total_inflows
        + acc.total_outflows
        - acc.total_transfers_in
        + acc.total_transfers_out;
    } else {
      current = acc.starting_balance
        + acc.total_inflows
        - acc.total_outflows
        + acc.total_transfers_in
        - acc.total_transfers_out;
    }

    if (isLiability) totalLiabilities += Math.abs(current);
    else totalAssets += current;
  }

  res.json({
    totalAssets: +totalAssets.toFixed(2),
    totalLiabilities: +totalLiabilities.toFixed(2),
    netWorth: +(totalAssets - totalLiabilities).toFixed(2),
    totalAccounts: accounts.length,
  });
});

// ── POST /api/accounts ────────────────────────────────────────
router.post('/', (req, res) => {
  const db = getDb();
  const { name, type, starting_balance = 0 } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const result = db.prepare(
    'INSERT INTO accounts (name, type, starting_balance) VALUES (?, ?, ?)'
  ).run(name, type, starting_balance);
  res.status(201).json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid));
});

// ── PUT /api/accounts/:id ─────────────────────────────────────
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, type, starting_balance } = req.body;
  db.prepare(
    'UPDATE accounts SET name=?, type=?, starting_balance=? WHERE id=?'
  ).run(name, type, starting_balance, req.params.id);
  res.json(db.prepare('SELECT * FROM accounts WHERE id=?').get(req.params.id));
});

// ── DELETE /api/accounts/:id ──────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;