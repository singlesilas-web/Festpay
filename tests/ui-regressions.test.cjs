const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('top-up success stays integrated in the wallet page', () => {
  const wallet = source('dist/js/pages/guthaben.js');
  assert.match(wallet, /class="topup-success"/);
  assert.match(wallet, /jederzeit wieder/);
  assert.doesNotMatch(wallet, /topup-shade|topup-spotlight|scrollIntoView/);
});

test('festival scheduling uses a calendar and a custom rounded time picker', () => {
  const operator = source('dist/js/pages/betreiber.js');
  const styles = source('dist/css/seiten.css');
  assert.match(operator, /class="input date-input"[^>]+type="date"/);
  assert.match(operator, /class="time-options"[^>]+role="listbox"/);
  assert.doesNotMatch(operator, /type="time"/);
  assert.match(styles, /\.time-options[^\n]+border-radius:16px/);
});

test('helper confirmation shows the projected balance', () => {
  const helper = source('dist/js/pages/helfer.js');
  assert.match(helper, /Guthaben danach/);
  assert.match(helper, /balanceAfter/);
});
