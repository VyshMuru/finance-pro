const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/accounts',     require('./routes/accounts'));
app.use('/api/budget',       require('./routes/budget'));
app.use('/api/overview',     require('./routes/overview'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Finance Pro API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
