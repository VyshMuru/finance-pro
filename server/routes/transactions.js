const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ── helpers ──────────────────────────────────────────────────
function periodWhere(year, month) {
  if (month) {
    return {
      clause: `strftime('%Y', date) = ? AND strftime('%m', date) = ?`,
      params: [String(year), String(month).padStart(2, '0')],
    };
  }
  return {
    clause: `strftime('%Y', date) = ?`,
    params: [String(year)],
  };
}

// ── GET /api/transactions ─────────────────────────────────────
// Query: year, month (optional), type (income|expense|all)
router.get('/', (req, res) => {
  const db = getDb();
  const { year = new Date().getFullYear(), month, type } = req.query;
  const { clause, params } = periodWhere(year, month);

  let typeClause = '';
  if (type && type !== 'all') {
    typeClause = `AND type = ?`;
    params.push(type);
  }

  const rows = db.prepare(`
    SELECT t.*, a.name AS account_name
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE ${clause} ${typeClause}
    ORDER BY date DESC, t.id DESC
  `).all(...params);

  res.json(rows);
});

// ── GET /api/transactions/summary ────────────────────────────
router.get('/summary', (req, res) => {
  const db = getDb();
  const { year = new Date().getFullYear(), month, type } = req.query;
  const { clause, params } = periodWhere(year, month);

  const typeParam = type && type !== 'all' ? type : null;

  // Total & count
  const totalQ = typeParam
    ? db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM transactions WHERE ${clause} AND type = ?`).get(...params, typeParam)
    : db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM transactions WHERE ${clause}`).get(...params);

  // By category
  const catRows = typeParam
    ? db.prepare(`SELECT category, subcategory, SUM(amount) as total FROM transactions WHERE ${clause} AND type = ? GROUP BY category, subcategory ORDER BY total DESC`).all(...params, typeParam)
    : db.prepare(`SELECT type, category, subcategory, SUM(amount) as total FROM transactions WHERE ${clause} GROUP BY type, category, subcategory ORDER BY total DESC`).all(...params);

  // Monthly breakdown (for year view)
  const monthlyRows = typeParam
    ? db.prepare(`SELECT strftime('%m', date) as month, SUM(amount) as total FROM transactions WHERE ${clause} AND type = ? GROUP BY month ORDER BY month`).all(...params, typeParam)
    : db.prepare(`SELECT strftime('%m', date) as month, type, SUM(amount) as total FROM transactions WHERE ${clause} GROUP BY month, type ORDER BY month`).all(...params);

  // Largest single transaction
  const largest = typeParam
    ? db.prepare(`SELECT * FROM transactions WHERE ${clause} AND type = ? ORDER BY amount DESC LIMIT 1`).get(...params, typeParam)
    : db.prepare(`SELECT * FROM transactions WHERE ${clause} ORDER BY amount DESC LIMIT 1`).get(...params);

  res.json({ total: totalQ.total, count: totalQ.count, byCategory: catRows, monthly: monthlyRows, largest });
});

// ── POST /api/transactions ────────────────────────────────────
router.post('/', (req, res) => {
  const db = getDb();
  const { date, type, category, subcategory = '', account_id, amount, notes = '' } = req.body;
  if (!date || !type || !category || !amount) {
    return res.status(400).json({ error: 'Missing required fields: date, type, category, amount' });
  }
  const result = db.prepare(`
    INSERT INTO transactions (date, type, category, subcategory, account_id, amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(date, type, category, subcategory, account_id || null, amount, notes);

  const row = db.prepare('SELECT t.*, a.name AS account_name FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id WHERE t.id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// ── PUT /api/transactions/:id ─────────────────────────────────
router.put('/:id', (req, res) => {
  const db = getDb();
  const { date, type, category, subcategory, account_id, amount, notes } = req.body;
  db.prepare(`
    UPDATE transactions SET date=?, type=?, category=?, subcategory=?, account_id=?, amount=?, notes=?
    WHERE id=?
  `).run(date, type, category, subcategory, account_id || null, amount, notes, req.params.id);
  const row = db.prepare('SELECT t.*, a.name AS account_name FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id WHERE t.id = ?').get(req.params.id);
  res.json(row);
});

// ── DELETE /api/transactions/:id ──────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── GET /api/transactions/categories ─────────────────────────
router.get('/categories', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT type, category, subcategory FROM transactions ORDER BY type, category, subcategory').all();
  res.json(rows);
});

module.exports = router;
