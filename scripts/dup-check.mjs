#!/usr/bin/env node
// 본문 근접 중복 검사: main 본문(공통 헤더·푸터·CTA 제외) → 공백·문장부호·지역명 치환 정규화 → 동일 해시=실패, 한글 5-gram Jaccard ≥ 0.75 경고(짧은 본문은 문장 일치율)
// 사용: node scripts/dup-check.mjs --base http://127.0.0.1:3000 [--paths /a/,/b/] [--threshold 0.75]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = (opt.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const TH = Number(opt.threshold || 0.75);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/area-aliases.json'), 'utf8'));
const regionWords = [...new Set(aliases.aliases.map((a) => a.alias).concat(aliases.baseRegions.map((b) => b.name)).concat(['서울특별시', '경기도', '평택시', '수원시', '화성시', '용인시']))].sort((a, b) => b.length - a.length);
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/publication-ledger.json'), 'utf8')).records;
const paths = opt.paths ? opt.paths.split(',') : ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility).map((r) => r.path);
const strip = (html) => {
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
  return main.replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<div class="cta-box"[\s\S]*?<\/div>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
};
const norm = (t) => { let s = t.normalize('NFC'); for (const w of regionWords) s = s.split(w).join('지역'); return s.replace(/[\s\p{P}\p{S}]+/gu, ''); };
const grams = (s, n = 5) => { const g = new Set(); for (let i = 0; i + n <= s.length; i++) g.add(s.slice(i, i + n)); return g; };
const jac = (a, b) => { let x = 0; for (const g of a) if (b.has(g)) x++; return x / (a.size + b.size - x || 1); };
const sents = (t) => new Set(t.normalize('NFC').split(/[.!?。\n]/).map((x) => x.trim()).filter((x) => x.length > 8));
const docs = [];
for (const p of paths) {
  const url = p.startsWith('/') ? BASE + (ledger.find((r) => r.path === p && !(r.contentStatus === 'PUBLISHED' && r.indexEligibility)) ? '/admin/preview' + p : p) : p;
  const r = await fetch(url, { headers: { cookie: opt.cookie || '' }, redirect: 'manual' });
  if (r.status !== 200) { console.log('skip', p, r.status); continue; }
  const raw = strip(await r.text());
  const n = norm(raw);
  docs.push({ path: p, raw, n, hash: crypto.createHash('sha256').update(n).digest('hex').slice(0, 16), g: grams(n), s: sents(raw.replace(/\s+/g, ' ')) });
}
const out = { at: new Date().toISOString(), threshold: TH, pairs: [], identical: [], top: [] };
const all = [];
for (let i = 0; i < docs.length; i++) for (let j = i + 1; j < docs.length; j++) {
  const a = docs[i], b = docs[j];
  if (a.hash === b.hash) { out.identical.push([a.path, b.path]); continue; }
  const short = Math.min(a.n.length, b.n.length) < 600;
  let score, how;
  if (short) { let m = 0; for (const s of a.s) if (b.s.has(s)) m++; score = m / Math.max(1, Math.min(a.s.size, b.s.size)); how = 'sentence-match'; }
  else { score = jac(a.g, b.g); how = '5gram-jaccard'; }
  all.push({ a: a.path, b: b.path, score: +score.toFixed(3), how });
  if (score >= TH) out.pairs.push({ a: a.path, b: b.path, score: +score.toFixed(3), how });
}
all.sort((x, y) => y.score - x.score); out.top = all.slice(0, 10);
out.stats = { pairs: all.length, max: all[0]?.score ?? 0, mean: +(all.reduce((s, x) => s + x.score, 0) / Math.max(1, all.length)).toFixed(3) };
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/dup-check.json'), JSON.stringify({ ...out, docs: docs.map((d) => ({ path: d.path, chars: d.n.length, hash: d.hash })) }, null, 1));
console.log(`[dup-check] docs ${docs.length} identical ${out.identical.length} near-dup(≥${TH}) ${out.pairs.length} · 최대 ${out.stats.max} 평균 ${out.stats.mean} (${out.stats.pairs} 쌍)`);
for (const t of out.top.slice(0, 5)) console.log('  top', t.a, t.b, t.score, t.how);
for (const p of out.pairs) console.log('  warn', p.a, p.b, p.score, p.how);
for (const p of out.identical) console.log('  FAIL identical', p[0], p[1]);
if (out.identical.length) process.exit(1);
