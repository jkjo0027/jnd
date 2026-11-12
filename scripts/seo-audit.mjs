#!/usr/bin/env node
// 사이트맵 URL 100% 를 실제 GET 으로 점검: 200 · self-canonical · index 허용 · H1/본문 · 고유 title/description · 내부 링크 4xx/5xx · 고아 페이지 · 스테이징 주소 노출
// 사용: node scripts/seo-audit.mjs --base http://127.0.0.1:3000 [--out reports/seo-audit.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = (opt.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const CANON_HOST = 'https://jndsystem.kr';
const OUT = opt.out || 'reports/seo-audit.json';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/publication-ledger.json'), 'utf8')).records;
const E = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility && r.indexPolicy === 'index').map((r) => r.path);
const lastmod = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/content-lastmod.json'), 'utf8'));
const byPath = new Map(ledger.map((r) => [r.path, r]));
const get = async (u) => { const r = await fetch(u, { redirect: 'manual', headers: { 'user-agent': 'jnd-seo-audit/1' } }); return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text(), location: r.headers.get('location') }; };
const attr = (tag, a) => { const m = tag.match(new RegExp(`${a}=["']([^"']*)["']`, 'i')); return m ? m[1] : null; };
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const issues = [];
const pages = [];
const sm = await get(BASE + '/sitemap.xml');
if (sm.status !== 200) { console.error('sitemap.xml not 200:', sm.status); process.exit(1); }
const smUrls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const smPaths = smUrls.map((u) => new URL(u).pathname);
for (const u of smUrls) if (!u.startsWith(CANON_HOST + '/')) issues.push({ type: 'sitemap-host', url: u });
for (const p of E) if (!smPaths.includes(p)) issues.push({ type: 'sitemap-missing', path: p });
for (const p of smPaths) if (!E.includes(p)) issues.push({ type: 'sitemap-extra', path: p });
const titles = new Map(), descs = new Map(), inbound = new Map(smPaths.map((p) => [p, 0]));
const linkStatus = new Map();
for (const p of smPaths) {
  const r = await get(BASE + p);
  const h = r.body;
  const title = (h.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  const desc = attr((h.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [''])[0], 'content') || '';
  const canon = attr((h.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [''])[0], 'href') || '';
  const robotsMeta = attr((h.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [''])[0], 'content') || '';
  const h1s = [...h.matchAll(/<h1[\s\S]*?<\/h1>/gi)].map((m) => text(m[0]));
  const lang = attr((h.match(/<html[^>]*>/i) || [''])[0], 'lang');
  const main = (h.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
  const bodyLen = text(main).length;
  const links = [...h.matchAll(/<a[^>]+href=["']([^"'#?]+)[^"']*["']/gi)].map((m) => m[1]).filter((x) => x.startsWith('/') && !x.startsWith('//'));
  // 구조화 데이터: 파싱 가능·@type 존재·FAQPage 는 질문 1개 이상·LocalBusiness 는 홈에만
  const lds = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  const ldTypes = [];
  for (const s of lds) { try { const j = JSON.parse(s); for (const o of Array.isArray(j) ? j : [j]) { if (!o['@type']) issues.push({ type: 'jsonld-notype', path: p }); ldTypes.push(o['@type']); if (o['@type'] === 'FAQPage' && !(o.mainEntity || []).length) issues.push({ type: 'jsonld-faq-empty', path: p }); if (o['@type'] === 'BreadcrumbList' && !(o.itemListElement || []).length) issues.push({ type: 'jsonld-breadcrumb-empty', path: p }); } } catch { issues.push({ type: 'jsonld-parse', path: p }); } }
  if (!lds.length && p !== '/privacy/') issues.push({ type: 'jsonld-missing', path: p });
  if (p === '/' && (!ldTypes.includes('LocalBusiness') || !ldTypes.includes('WebSite'))) issues.push({ type: 'jsonld-home', path: p, ldTypes });
  if (p !== '/' && p !== '/about/' && ldTypes.includes('LocalBusiness')) issues.push({ type: 'jsonld-localbusiness-dup', path: p });
  // 이미지: main 안의 img 는 alt 와 width/height(또는 사이즈 지정 컨테이너)를 가진다
  const imgs = [...main.matchAll(/<img[^>]*>/gi)].map((x) => x[0]);
  const imgNoAlt = imgs.filter((t) => !/\salt="[^"]+"/i.test(t)).length, imgNoDims = imgs.filter((t) => !/\swidth="/i.test(t) || !/\sheight="/i.test(t)).length;
  if (imgNoAlt) issues.push({ type: 'img-no-alt', path: p, count: imgNoAlt });
  // 서울 페이지에 당일 출장 확약 금지 (fact-ledger claims.sameDaySeoul=false)
  const mainTxt = text(main);
  // 확약 문장만 검출(질문 '당일 수리가 가능한가요?' 는 제외, '경기도권은 당일…' 은 확인된 사실)
  const claimTxt = mainTxt.split(/(?<=[.?!])\s/).filter((s) => !/\?$/.test(s.trim())).join(' ').replace(/경기도권은 당일[^.]*\./g, '');
  if (p.startsWith('/areas/seoul/r') && /당일 (출장|방문|수리|교체)/.test(claimTxt)) issues.push({ type: 'seoul-sameday-claim', path: p });
  if (/24시간 (출동|대응|상담)|연중무휴|즉시 출동/.test(mainTxt)) issues.push({ type: 'unverified-claim', path: p });
  const row = { path: p, status: r.status, title, desc, canon, robotsMeta, xRobots: r.headers['x-robots-tag'] || '', h1: h1s, lang, bodyLen, links: [...new Set(links)].length, ldTypes, imgs: imgs.length, imgNoDims, lastmod: lastmod[byPath.get(p)?.pageId] || null };
  pages.push(row);
  if (r.status !== 200) issues.push({ type: 'status', path: p, status: r.status });
  if (canon !== CANON_HOST + p) issues.push({ type: 'canonical', path: p, canon });
  if (/noindex/i.test(robotsMeta) || /noindex/i.test(row.xRobots)) issues.push({ type: 'noindex', path: p });
  if (h1s.length !== 1) issues.push({ type: 'h1', path: p, count: h1s.length });
  if (!title) issues.push({ type: 'title-missing', path: p });
  if (!desc) issues.push({ type: 'desc-missing', path: p });
  if (lang !== 'ko') issues.push({ type: 'lang', path: p, lang });
  if (bodyLen < 300) issues.push({ type: 'thin-body', path: p, bodyLen });
  if (/localhost|127\.0\.0\.1|staging|vercel\.app/i.test(h.replace(/__next_f|_next\/static/g, ''))) issues.push({ type: 'staging-leak', path: p });
  if (titles.has(title)) issues.push({ type: 'dup-title', path: p, other: titles.get(title) }); else titles.set(title, p);
  if (descs.has(desc)) issues.push({ type: 'dup-desc', path: p, other: descs.get(desc) }); else descs.set(desc, p);
  for (const l of new Set(links)) {
    const lp = l.endsWith('/') || /\.[a-z0-9]+$/i.test(l) ? l : l + '/';
    if (inbound.has(lp)) inbound.set(lp, inbound.get(lp) + 1);
    if (!linkStatus.has(lp)) {
      const lr = await get(BASE + lp);
      let final = lr.status, chain = 0, loc = lr.location, cur = lp;
      while ((final === 301 || final === 302 || final === 307 || final === 308) && loc && chain < 5) { chain++; cur = loc.startsWith('http') ? new URL(loc).pathname : loc; const nr = await get(BASE + cur); final = nr.status; loc = nr.location; }
      linkStatus.set(lp, { status: lr.status, final, chain, to: cur });
    }
    const ls = linkStatus.get(lp);
    if (ls.final >= 400) issues.push({ type: 'broken-link', path: p, href: lp, status: ls.final });
    if (ls.chain > 1) issues.push({ type: 'redirect-chain', path: p, href: lp, chain: ls.chain });
    else if (ls.chain === 1 && !lp.startsWith('/admin')) issues.push({ type: 'redirect', path: p, href: lp, to: ls.to });
  }
}
for (const [p, n] of inbound) if (n === 0 && p !== '/') issues.push({ type: 'orphan', path: p });
// 보류 정책: C(통합) → mergeTarget 으로 영구 리디렉션(1홉), D(미확인) → 404. 사이트맵 lastmod 는 content-lastmod 와 일치
const held = ledger.filter((r) => r.contentStatus !== 'PUBLISHED');
for (const r of held) {
  const res = await get(BASE + r.path);
  if (r.qualityClass === 'C' && r.mergeTarget) { const loc = res.location ? (res.location.startsWith('http') ? new URL(res.location).pathname : res.location) : null; if (![301, 308].includes(res.status) || loc !== r.mergeTarget) issues.push({ type: 'merge-redirect', path: r.path, status: res.status, loc, expect: r.mergeTarget }); }
  else if (res.status !== 404) issues.push({ type: 'held-not-404', path: r.path, status: res.status });
}
const smLast = new Map([...sm.body.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [new URL(m[1]).pathname, m[2].slice(0, 10)]));
for (const p of smPaths) { const rec = byPath.get(p); const exp = rec && lastmod[rec.pageId]; if (exp && smLast.get(p) !== exp) issues.push({ type: 'sitemap-lastmod', path: p, got: smLast.get(p), expect: exp }); }
// 404 동작: 미지 경로
for (const p of ['/areas/gyeonggi/r99/repair/', '/guides/g99/', '/cases/c99/', '/regions/', '/nope/']) { const r = await get(BASE + p); if (r.status !== 404) issues.push({ type: 'expect-404', path: p, status: r.status }); }
const robots = await get(BASE + '/robots.txt');
if (robots.status !== 200 || !robots.body.includes('Sitemap: ' + CANON_HOST + '/sitemap.xml')) issues.push({ type: 'robots', status: robots.status });
const report = { base: BASE, at: new_Date(), eligible: E.length, sitemap: smPaths.length, crawled: pages.length, held: held.length, issues, pages };
function new_Date() { return new Date().toISOString(); }
// CSV 내보내기 (SEO 감사 결과)
fs.mkdirSync(path.join(ROOT, 'data/export'), { recursive: true });
const esc = (v) => { const s = Array.isArray(v) ? v.join('|') : String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const cols = ['path', 'status', 'title', 'desc', 'canon', 'h1', 'bodyLen', 'links', 'ldTypes', 'imgs', 'imgNoDims', 'lastmod'];
fs.writeFileSync(path.join(ROOT, 'data/export/seo-audit.csv'), '\ufeff' + [cols.join(','), ...pages.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify(report, null, 1));
const byType = {}; for (const i of issues) byType[i.type] = (byType[i.type] || 0) + 1;
console.log(`[seo-audit] eligible ${E.length} sitemap ${smPaths.length} crawled ${pages.length} issues ${issues.length}`, byType);
if (issues.length) { for (const i of issues.slice(0, 40)) console.log('  -', JSON.stringify(i)); process.exit(1); }
