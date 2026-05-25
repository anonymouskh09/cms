/**
 * Verify Phase 2 navigation menus
 * Run: node scripts/verify-navigation.cjs
 */
const fs = require('fs');
const path = require('path');

const menusPath = path.join(__dirname, '../src/utils/menus.js');
const appPath = path.join(__dirname, '../src/App.jsx');

const menusSrc = fs.readFileSync(menusPath, 'utf8');
const appSrc = fs.readFileSync(appPath, 'utf8');

const menuPaths = [...menusSrc.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
const routePaths = [...appSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

console.log('=== Navigation Verification ===\n');

let ok = 0;
let fail = 0;

for (const menuPath of menuPaths) {
  const hasRoute = routePaths.some((r) => r === menuPath || menuPath.startsWith(`${r}/`) || r.startsWith(menuPath));
  if (hasRoute) {
    console.log(`✓ Menu path has route: ${menuPath}`);
    ok++;
  } else {
    console.log(`✗ Missing route for menu: ${menuPath}`);
    fail++;
  }
}

const expectedCounts = {
  owner: 16,
  principal: 13,
  admin: 11,
  teacher: 9,
  student: 10,
  parent: 11,
  finance_manager: 7,
};

for (const [role, count] of Object.entries(expectedCounts)) {
  const re = new RegExp(`${role}:\\s*\\[([\\s\\S]*?)\\n  \\],`);
  const block = menusSrc.match(re)?.[1] || '';
  const items = (block.match(/label:/g) || []).length;
  const mark = items === count ? '✓' : '✗';
  console.log(`${mark} ${role}: ${items} menu items (expected ${count})`);
  if (items === count) ok++; else fail++;
}

console.log(`\n${fail === 0 ? 'All checks passed' : `${fail} issue(s) found`} (${ok} passed)`);
process.exit(fail > 0 ? 1 : 0);
