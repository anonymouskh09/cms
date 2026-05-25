/**
 * Phase 3 API smoke test
 * Run: node scripts/test-phase3.js
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const jwtConfig = require('../src/config/jwt');
const { ROLE_PERMISSIONS } = require('../src/middleware/authMiddleware');

const BASE = `http://localhost:${process.env.PORT || 5001}/api`;

async function tokenForEmail(email) {
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!users.length) throw new Error(`User not found: ${email}`);
  const user = users[0];
  return jwt.sign({
    user_id: user.id, name: user.name, email: user.email, role: user.role,
    institution_id: user.institution_id, permissions: ROLE_PERMISSIONS[user.role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== Phase 3 API Test ===\n');
  const owner = await tokenForEmail('owner@cms.local');
  const teacher = await tokenForEmail('teacher@peers.local');

  const tests = [
    ['AI Settings', '/ai/settings', owner],
    ['AI Questions', '/ai/questions', owner],
    ['Syllabus List', '/syllabus', owner],
    ['Academic Analytics', '/analytics/academic', owner],
    ['Weak Areas', '/analytics/weak-areas', owner],
    ['Teacher Performance', '/analytics/teachers', owner],
    ['System Health', '/system/health', owner],
    ['Backup Status', '/system/backup', owner],
    ['QR Attendance', '/integrations/qr-attendance', owner],
    ['Notifications', '/integrations/notifications', owner],
    ['Teacher AI Settings', '/ai/settings', teacher],
  ];

  let passed = 0;
  for (const [name, path, token] of tests) {
    const { status, data } = await get(path, token);
    const ok = status === 200 && data.success === true;
    console.log(`${ok ? '✓' : '✗'} ${name}: HTTP ${status}`);
    if (ok) passed += 1;
    else console.log('  ', data.message || JSON.stringify(data));
  }

  console.log(`\n${passed}/${tests.length} passed`);
  process.exit(passed === tests.length ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
