/**
 * Phase 3 AI settings API smoke test
 * Run: node scripts/test-phase3-ai.js
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

async function req(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('=== Phase 3 AI Settings Test ===\n');
  const owner = await tokenForEmail('owner@cms.local');
  const principal = await tokenForEmail('principal@peers.local');

  const get = await req('GET', '/ai/settings?institution_id=1', owner);
  console.log(`${get.status === 200 ? '✓' : '✗'} GET settings: HTTP ${get.status}`);
  const settingsId = get.data?.data?.settings?.id;
  if (settingsId) console.log(`  settings id: ${settingsId}, provider: ${get.data.data.settings.provider}`);

  const put = await req('PUT', `/ai/settings/${settingsId}`, owner, {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    max_tokens: 1500,
    temperature: 0.5,
    is_enabled: false,
    institution_id: 1,
  });
  console.log(`${put.status === 200 ? '✓' : '✗'} PUT settings/:id: HTTP ${put.status}`);

  const test = await req('POST', '/ai/test-connection', owner, { provider: 'openrouter', institution_id: 1 });
  console.log(`${test.status === 200 ? '✓' : '✗'} POST test-connection: HTTP ${test.status} — ${test.data.message}`);

  const logs = await req('GET', '/ai/logs?institution_id=1', owner);
  console.log(`${logs.status === 200 ? '✓' : '✗'} GET logs: HTTP ${logs.status} (${logs.data.data?.length || 0} rows)`);

  const teacher = await tokenForEmail('teacher@peers.local');
  const teacherPut = await req('PUT', `/ai/settings/${settingsId}`, teacher, { is_enabled: true });
  console.log(`${teacherPut.status === 403 ? '✓' : '✗'} Teacher blocked from PUT: HTTP ${teacherPut.status}`);

  const principalGet = await req('GET', '/ai/settings', principal);
  console.log(`${principalGet.status === 200 ? '✓' : '✗'} Principal GET settings: HTTP ${principalGet.status}`);

  const hasKeyInResponse = JSON.stringify(get.data).includes('sk-');
  console.log(`${!hasKeyInResponse ? '✓' : '✗'} No API key leaked in response`);

  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
