import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-phones.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { HOME_PHONES, HOME_PHONE_KEY, validHomeOrder, shuffleHomePhones, sessionHomePhones } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
test('every shuffle keeps all three numbers once, including random extremes', () => {
  for (const random of [() => 0, () => 0.999999, Math.random]) for (let i = 0; i < 40; i++) assert.equal(validHomeOrder(shuffleHomePhones(random)), true);
  for (const bad of [null, [], ['1661-3088'], [...HOME_PHONES, '010-0000-0000'], ['1661-3088','1661-3088','1661-6878'], ['1661-3088','1661-5863','010-0000-0000']]) assert.equal(validHomeOrder(bad), false);
});
test('session survives reload, repairs bad storage, and has a complete storage-denied fallback', () => {
  let data = '{broken'; let writes = 0;
  const store = { getItem: key => { assert.equal(key, HOME_PHONE_KEY); return data; }, setItem: (key, value) => { assert.equal(key, HOME_PHONE_KEY); data = value; writes++; } };
  const first = sessionHomePhones(store);
  assert.equal(validHomeOrder(first), true);
  assert.deepEqual(sessionHomePhones(store), first);
  assert.equal(writes, 1);
  assert.deepEqual(sessionHomePhones({ getItem: () => { throw Error('denied'); }, setItem: () => {} }), [...HOME_PHONES]);
  assert.deepEqual(sessionHomePhones({ getItem: () => null, setItem: () => { throw Error('quota'); } }), [...HOME_PHONES]);
});
