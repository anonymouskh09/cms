/**
 * Finance API integration test
 * Run: node scripts/test-finance-api.js
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
    user_id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    institution_id: user.institution_id,
    permissions: ROLE_PERMISSIONS[user.role] || [],
  }, jwtConfig.secret, { expiresIn: '1h' });
}

async function req(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email) {
  return tokenForEmail(email);
}

async function main() {
  console.log('=== Finance API Test ===\n');

  const financeToken = await login('finance@peers.local');
  const studentToken = await login('student@peers.local');
  const parentToken = await login('parent@peers.local');

  const month = new Date().toISOString().slice(0, 7);

  const bulk = await req('POST', '/finance/challans/bulk-generate', financeToken, { month_year: month });
  console.log('Bulk generate:', bulk.status, bulk.data.message || bulk.data.success);

  const logs = await req('GET', '/finance/challans/generation-logs', financeToken);
  console.log('Generation logs:', logs.status, `count=${logs.data.data?.length ?? 0}`);

  const challans = await req('GET', `/finance/challans?month_year=${month}`, financeToken);
  console.log('List challans:', challans.status, `count=${challans.data.data?.length ?? 0}`);

  const ch = challans.data.data?.find((c) => c.status !== 'cancelled' && c.status !== 'paid');
  if (ch) {
    const pay = await req('POST', '/payments', financeToken, { challan_id: ch.id, payment_method: 'cash' });
    console.log('Record payment:', pay.status, pay.data.message);

    const regenCh = challans.data.data?.find((c) => c.status === 'pending' || c.status === 'overdue');
    if (regenCh) {
      const regen = await req('POST', `/finance/challans/${regenCh.id}/regenerate`, financeToken);
      console.log('Regenerate:', regen.status, regen.data.message);

      if (regen.data.data?.id) {
        const cancel = await req('POST', `/finance/challans/${regen.data.data.id}/cancel`, financeToken, { reason: 'Test cancellation' });
        console.log('Cancel:', cancel.status, cancel.data.message);
      }
    }
  } else {
    console.log('No pending challan for regenerate/cancel test');
  }

  const collection = await req('GET', `/finance/reports/collection?month_year=${month}`, financeToken);
  console.log('Collection report:', collection.status, collection.data.success);

  const defaulters = await req('GET', '/finance/reports/defaulters', financeToken);
  console.log('Defaulters report:', defaulters.status, `count=${defaulters.data.data?.length ?? 0}`);

  const students = await req('GET', '/students?limit=1', financeToken);
  const sid = students.data?.data?.[0]?.id;
  if (sid) {
    const hist = await req('GET', `/payments/student/${sid}`, financeToken);
    console.log('Student payment history (finance):', hist.status, hist.data.success);

    const parentPay = await req('GET', `/payments/student/${sid}`, parentToken);
    console.log('Parent child payments:', parentPay.status, parentPay.data.success);
  }

  const studentPay = await req('GET', '/payments/student/me', studentToken);
  console.log('Student payment history (self):', studentPay.status, studentPay.data.success);

  await pool.end();
  console.log('\n=== Finance API test complete ===');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
