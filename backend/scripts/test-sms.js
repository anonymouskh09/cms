/**
 * SMS placeholder API smoke test
 * Run: node scripts/test-sms.js
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

async function post(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function put(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== SMS Placeholder API Test ===\n');
  const token = await tokenForEmail('finance@peers.local');
  const studentToken = await tokenForEmail('student@peers.local');

  const endpoints = [
    ['Dashboard', () => get('/sms/dashboard', token)],
    ['Templates', () => get('/sms/templates', token)],
    ['Templates (fee_reminder)', () => get('/sms/templates?type=fee_reminder', token)],
    ['Logs', () => get('/sms/logs', token)],
  ];

  for (const [name, fn] of endpoints) {
    const { status, data } = await fn();
    const ok = status === 200 && data.success === true;
    console.log(`${ok ? '✓' : '✗'} ${name}: HTTP ${status}`);
    if (!ok) console.log('  ', data.message || '');
  }

  const create = await post('/sms/templates', token, {
    template_name: 'Test Template',
    template_type: 'general',
    message_body: 'Hello {parent_name}',
    status: 'active',
  });
  console.log(`${create.status === 201 ? '✓' : '✗'} Create template: HTTP ${create.status}`);

  const update = await put('/sms/templates/1', token, { template_name: 'Updated Name' });
  console.log(`${update.status === 200 ? '✓' : '✗'} Update template: HTTP ${update.status}`);

  const placeholder = await post('/sms/test-placeholder', token, {});
  const phOk = placeholder.status === 200 && placeholder.data.success === false
    && placeholder.data.message.includes('Phase 2');
  console.log(`${phOk ? '✓' : '✗'} Test placeholder: HTTP ${placeholder.status}`);
  if (!phOk) console.log('  ', placeholder.data);

  const blocked = await get('/sms/dashboard', studentToken);
  console.log(`${blocked.status === 403 ? '✓' : '✗'} Student blocked: HTTP ${blocked.status}`);

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
