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
    const isLiability = ['credit', 'loan', 'loc'].includes(acc.type);
    let currentBalance;

    if (isLiability) {
      currentBalance = acc.starting_balance
        - acc.total_inflows
        + acc.total_outflows
        - acc.total_transfers_in
        + acc.total_transfers_out;
    } else {
      currentBalance = acc.starting_balance
        + acc.total_inflows
        - acc.total_outflows
        + acc.total_transfers_in
        - acc.total_transfers_out;
    }

    // ── Only revolving credit gets utilization ──────────────
    const isRevolving = ['credit', 'loc'].includes(acc.type);
    const utilization = isRevolving && acc.credit_limit > 0
      ? +((Math.abs(currentBalance) / acc.credit_limit) * 100).toFixed(1)
      : null;

    return {
      ...acc,
      current_balance: +currentBalance.toFixed(2),
      utilization,
    };
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

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalCreditLimit = 0;
  let totalDebt = 0;

  for (const acc of accounts) {
    const isLiability = ['credit', 'loan', 'loc'].includes(acc.type);
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

    if (isLiability) {
      totalLiabilities += Math.abs(current);
      if (Math.abs(current) > 0) totalDebt += Math.abs(current);
      // ── Only revolving credit counts toward utilization ───
      if (['credit', 'loc'].includes(acc.type) && acc.credit_limit > 0) {
        totalCreditLimit += acc.credit_limit;
      }
    } else {
      totalAssets += current;
    }
  }

  // ── Overall utilization — revolving only ──────────────────
  // Use exact same logic as debt-tracker endpoint
  let totalRevolvingBalance = 0;
  for (const acc of accounts) {
    if (!['credit', 'loc'].includes(acc.type)) continue;

    const current = acc.starting_balance
      - acc.total_inflows
      + acc.total_outflows
      - acc.total_transfers_in
      + acc.total_transfers_out;

    // Only count balances > 0 (actual debt)
    const balance = Math.abs(current);
    if (balance > 0) totalRevolvingBalance += balance;
  }

  const overallUtilization = totalCreditLimit > 0
    ? +((totalRevolvingBalance / totalCreditLimit) * 100).toFixed(1)
    : 0;

  res.json({
    totalAssets: +totalAssets.toFixed(2),
    totalLiabilities: +totalLiabilities.toFixed(2),
    netWorth: +(totalAssets - totalLiabilities).toFixed(2),
    totalAccounts: accounts.length,
    totalCreditLimit: +totalCreditLimit.toFixed(2),
    totalDebt: +totalDebt.toFixed(2),
    overallUtilization,
  });
});

// ── GET /api/accounts/debt-tracker ───────────────────────────
router.get('/debt-tracker', (req, res) => {
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
    WHERE a.type IN ('credit', 'loan', 'loc')
    GROUP BY a.id
  `).all();

  const debts = accounts.map(acc => {
    const current = acc.starting_balance
      - acc.total_inflows
      + acc.total_outflows
      - acc.total_transfers_in
      + acc.total_transfers_out;

    const balance = Math.abs(current);

    // ── Only revolving credit gets utilization ──────────────
    const isRevolving = ['credit', 'loc'].includes(acc.type);
    const utilization = isRevolving && acc.credit_limit > 0
      ? +((balance / acc.credit_limit) * 100).toFixed(1)
      : null;

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: +balance.toFixed(2),
      credit_limit: acc.credit_limit,
      utilization,
    };
  })
  // Only show debts with balance > 0
  .filter(d => d.balance > 0)
  // Sort by balance descending
  .sort((a, b) => b.balance - a.balance);

  // ── Overall stats ─────────────────────────────────────────
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);

  // For utilization — fetch ALL revolving accounts (including zero balance)
  // so credit limits are always included in denominator
  const allRevolvingAccounts = db.prepare(`
    SELECT * FROM accounts WHERE type IN ('credit', 'loc')
  `).all();

  const totalLimit = allRevolvingAccounts.reduce((s, a) => s + (a.credit_limit || 0), 0);
  const totalRevolvingBalance = debts
    .filter(d => ['credit', 'loc'].includes(d.type))
    .reduce((s, d) => s + d.balance, 0);

  const overallUtilization = totalLimit > 0
    ? +((totalRevolvingBalance / totalLimit) * 100).toFixed(1)
    : 0;
    
  res.json({
    debts,
    totalDebt: +totalDebt.toFixed(2),
    totalLimit: +totalLimit.toFixed(2),
    overallUtilization,
  });
});

// ── GET /api/accounts/portfolio-growth ───────────────────────
router.get('/portfolio-growth', (req, res) => {
  const db = getDb();
  const { year = new Date().getFullYear() } = req.query;

  // Savings and investment accounts only
  const accounts = db.prepare(`
    SELECT * FROM accounts
    WHERE type IN ('savings', 'investment')
  `).all();

  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const trend = [];

  for (const mm of months) {
    const endDate = `${year}-${mm}-31`;

    // Check if this month has any transactions
    const hasTx = db.prepare(`
      SELECT COUNT(*) as c FROM transactions
      WHERE strftime('%Y-%m', date) = ?
    `).get(`${year}-${mm}`).c;

    if (hasTx === 0) continue;

    // Get all transactions up to end of this month
    const txRows = db.prepare(`
      SELECT
        account_id,
        to_account_id,
        type,
        SUM(amount) as total
      FROM transactions
      WHERE date <= ? AND strftime('%Y', date) <= ?
      GROUP BY account_id, to_account_id, type
    `).all(endDate, String(year));

    // Build balance map per account
    const balMap = {};
    for (const acc of accounts) {
      balMap[acc.id] = {
        income: 0, expense: 0,
        transfers_in: 0, transfers_out: 0,
      };
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

    // Calculate total portfolio value
    let portfolioValue = 0;
    let totalContributed = 0;

    for (const acc of accounts) {
      const t = balMap[acc.id] || {
        income: 0, expense: 0,
        transfers_in: 0, transfers_out: 0,
      };
      const current = acc.starting_balance
        + t.income
        - t.expense
        + t.transfers_in
        - t.transfers_out;

      portfolioValue += current;
      totalContributed += acc.starting_balance + t.transfers_in;
    }

    trend.push({
      month: mm,
      portfolioValue: +portfolioValue.toFixed(2),
      totalContributed: +totalContributed.toFixed(2),
      growth: +(portfolioValue - totalContributed).toFixed(2),
    });
  }

  // Current totals from latest month
  const current = trend[trend.length - 1] || {
    portfolioValue: 0,
    totalContributed: 0,
    growth: 0,
  };

  res.json({
    trend,
    totalValue: current.portfolioValue,
    totalContributed: current.totalContributed,
    totalGrowth: current.growth,
    growthPercent: current.totalContributed > 0
      ? +((current.growth / current.totalContributed) * 100).toFixed(1)
      : 0,
  });
});

// ── POST /api/accounts ────────────────────────────────────────
router.post('/', (req, res) => {
  const db = getDb();
  const { name, type, starting_balance = 0, credit_limit = 0 } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const result = db.prepare(`
    INSERT INTO accounts (name, type, starting_balance, credit_limit)
    VALUES (?, ?, ?, ?)
  `).run(name, type, starting_balance, credit_limit);
  res.status(201).json(
    db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid)
  );
});

// ── PUT /api/accounts/:id ─────────────────────────────────────
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, type, starting_balance, credit_limit = 0 } = req.body;
  db.prepare(`
    UPDATE accounts
    SET name=?, type=?, starting_balance=?, credit_limit=?
    WHERE id=?
  `).run(name, type, starting_balance, credit_limit, req.params.id);
  res.json(db.prepare('SELECT * FROM accounts WHERE id=?').get(req.params.id));
});

// ── DELETE /api/accounts/:id ──────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;