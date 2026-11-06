const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('top-up success spotlights the wallet without changing page layout', () => {
  const wallet = source('dist/js/pages/guthaben.js');
  assert.match(wallet, /className = "topup-shade"/);
  assert.match(wallet, /wallet-spotlight/);
  assert.match(wallet, /jederzeit in der App bereit/);
  assert.doesNotMatch(wallet, /scrollIntoView/);
});

test('festival scheduling uses custom rounded date and time pickers', () => {
  const operator = source('dist/js/pages/betreiber.js');
  const styles = source('dist/css/seiten.css');
  assert.match(operator, /class="date-calendar"[^>]+role="dialog"/);
  assert.match(operator, /class="calendar-days"[^>]+role="grid"/);
  assert.match(operator, /class="time-options"[^>]+role="listbox"/);
  assert.doesNotMatch(operator, /type="date"/);
  assert.doesNotMatch(operator, /type="time"/);
  assert.match(styles, /\.date-calendar[^\n]+border-radius:16px/);
  assert.match(styles, /\.time-options[^\n]+border-radius:16px/);
});

test('helper confirmation shows the projected balance', () => {
  const helper = source('dist/js/pages/helfer.js');
  assert.match(helper, /Guthaben danach/);
  assert.match(helper, /balanceAfter/);
});
