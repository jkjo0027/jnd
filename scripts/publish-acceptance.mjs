#!/usr/bin/env node
// 운영 수용 테스트(17장): 비개발 운영자 계정으로 한글·영문 파일명 사진을 넣어 사례 글을 작성·승인·공개하고,
// 별도 배포·콘솔 작업 없이 5분 안에 새 URL 200 · 초기 HTML 본문/title/self-canonical · 공개 이미지 200 · 허브 HTML 링크 · 사이트맵 포함을 확인한다.
// 이어서 수정(URL 유지)·비공개(404·사이트맵 제외·초안 비노출)·재발행·권한 거부·잘못된 파일 거부를 검증한다.
// 사용: ADMIN_ID=owner ADMIN_PW=... EDITOR_ID=staff EDITOR_PW=... node scripts/publish-acceptance.mjs --base http://127.0.0.1:3000
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = (opt.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(import.meta.url.replace('file://', '')), '..');
const ADMIN = { id: process.env.ADMIN_ID || 'owner', pw: process.env.ADMIN_PW || 'test-pass-1234' };
const EDITOR = { id: process.env.EDITOR_ID || 'staff', pw: process.env.EDITOR_PW || 'test-pass-1234' };
const results = []; const t0 = Date.now();
const rec = (k, ok, detail = '') => { results.push({ k, ok, detail, at: +((Date.now() - t0) / 1000).toFixed(1) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${k} ${detail}`); };

async function login(u) {
  const fd = new URLSearchParams({ id: u.id, pw: u.pw, next: '/admin/' });
  const r = await fetch(BASE + '/api/admin/login/', { method: 'POST', body: fd, redirect: 'manual' });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie.startsWith('jnd_admin=')) throw new Error(`login failed for ${u.id}: ${r.status}`);
  return cookie;
}
const api = (cookie) => async (p, init = {}) => {
  const r = await fetch(BASE + p, { ...init, headers: { cookie, ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(init.headers || {}) }, redirect: 'manual' });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
};
/** 응답 이후 실행되는 검사 결과를 기다린다(최대 60초) */
const waitCheck = async (A, id, prevAt) => { for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 1000)); const g = await A(`/api/admin/content/${id}/`); if (g.j?.page && g.j.page.status !== 'publishing' && g.j.page.check && g.j.page.check.at !== prevAt) return g.j.page; } return null; };
const pub = async (p) => { const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'user-agent': 'jnd-acceptance/1' } }); return { status: r.status, body: r.status === 200 ? await r.text() : '', loc: r.headers.get('location') }; };
async function makeImages() {
  const dir = path.join(ROOT, 'var', 'acceptance-tmp'); fs.mkdirSync(dir, { recursive: true });
  const mk = async (name, fmt, w, h, bg) => { const f = path.join(dir, name); let s = sharp({ create: { width: w, height: h, channels: 3, background: bg } }); s = fmt === 'jpg' ? s.jpeg({ quality: 85 }) : fmt === 'png' ? s.png() : s.webp(); await s.toFile(f); return f; };
  return {
    ko: await mk('수원 현장 (전).jpg', 'jpg', 1400, 1050, '#f0c020'),
    en: await mk('Door Repair 01.PNG', 'png', 1024, 768, '#303030'),
    mix: await mk('동탄-Sensor #2.webp', 'webp', 800, 1066, '#2060c0'),
    small: await mk('작은사진.jpg', 'jpg', 300, 200, '#808080'),
    fake: (() => { const f = path.join(dir, '가짜.jpg'); fs.writeFileSync(f, 'this is not an image'); return f; })(),
    heic: (() => { const f = path.join(dir, 'IMG_0001.HEIC'); fs.writeFileSync(f, Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(64)])); return f; })(),
  };
}
async function upload(cookie, file, nameOverride) {
  const fd = new FormData(); const name = nameOverride || path.basename(file);
  fd.append('file', new Blob([fs.readFileSync(file)]), name);
  const r = await fetch(BASE + '/api/admin/uploads/', { method: 'POST', body: fd, headers: { cookie } });
  const j = await r.json(); return { status: r.status, res: j.results?.[0], j };
}

const imgs = await makeImages();
const adminCookie = await login(ADMIN); const A = api(adminCookie);
const editorCookie = await login(EDITOR); const E = api(editorCookie);
rec('운영자(admin)·작성자(editor) 로그인', true);

// 1. 작성자가 초안 생성·입력
const c = await E('/api/admin/content/', { method: 'POST', body: JSON.stringify({ type: 'case', title: '영통 상가 출입문이 닫히다 다시 열릴 때 안전센서 교체' }) });
rec('초안 생성', c.status === 200 && !!c.j?.page?.id, c.j?.page?.path);
const id = c.j.page.id; const pagePath = c.j.page.path;
const up1 = await upload(editorCookie, imgs.ko), up2 = await upload(editorCookie, imgs.en), up3 = await upload(editorCookie, imgs.mix), up4 = await upload(editorCookie, imgs.small);
rec('한글 파일명 업로드 "수원 현장 (전).jpg"', up1.res?.ok === true && up1.res.upload.name === '수원 현장 (전).jpg', JSON.stringify(up1.res?.upload?.sizes));
rec('영문 대문자 확장자 "Door Repair 01.PNG"', up2.res?.ok === true, JSON.stringify(up2.res?.upload?.sizes));
rec('혼합·특수문자 "동탄-Sensor #2.webp"', up3.res?.ok === true, `${up3.res?.upload?.w}x${up3.res?.upload?.h}`);
rec('작은 사진(300px) 업스케일 없이 처리', up4.res?.ok === true && up4.res.upload.sizes.length === 1 && up4.res.upload.sizes[0] === 300, JSON.stringify(up4.res?.upload?.sizes));
const dup = await upload(editorCookie, imgs.ko);
rec('같은 파일명 재업로드 → 덮어쓰지 않고 새 ID', dup.res?.ok === true && dup.res.upload.id !== up1.res.upload.id, `${up1.res.upload.id} / ${dup.res?.upload?.id}`);
const nfd = await upload(editorCookie, imgs.ko, '수원 현장 (전).jpg'.normalize('NFD'));
rec('조합형(NFD) 파일명 → NFC 로 표시', nfd.res?.ok === true && nfd.res.upload.name === '수원 현장 (전).jpg'.normalize('NFC'));
const fake = await upload(editorCookie, imgs.fake); rec('확장자 위장 파일 거부', fake.res?.ok === false, fake.res?.error);
const heic = await upload(editorCookie, imgs.heic); rec('HEIC 안내 후 거부', heic.res?.ok === false && /HEIC/.test(heic.res?.error || ''), heic.res?.error);
const photos = [up1, up2, up3].map((u, i) => ({ ...u.res.upload, alt: ['상가 출입문 상단 안전센서 교체 전 모습', '교체한 안전센서 수광부', '센서 각도 재설정 후 감지 범위 확인'][i], caption: i === 0 ? '교체 전' : '', cover: i === 0 }));
const body = ['## 현장 상황', '영통 상가 1층 출입문(편개형)이 저녁 시간대에만 닫히다가 다시 열리기를 반복했어요. 낮에는 증상이 거의 없고 간판 조명이 켜진 뒤 심해졌어요.', '', '## 확인한 것', '- 센서 앞 입간판과 매트 위치', '- 안전센서 렌즈 오염', '- 간판 조명이 유리에 반사되는 각도', '', '렌즈를 닦은 뒤에도 재감지가 이어져 수광부 불량으로 판단했어요. 계측값이 기준을 벗어나 교체로 결정했어요.', '', '## 작업 후', '안전센서 1조를 교체하고 감도와 각도를 조명 조건에 맞춰 다시 잡았어요. 20회 개폐 시험에서 정상이었고, 야간에도 재방문 없이 전화로 확인을 마쳤어요.', '', '같은 증상이 있는 매장은 간판 조명을 켠 상태에서 센서 앞을 한 번 확인해 보세요. 조명 반사가 원인이면 센서 각도 조정만으로 끝나는 경우도 있어요.', '', `(수용 테스트 실행 ${new Date().toISOString().slice(0, 19)} — 이전 실행 글과 본문이 같지 않도록 넣는 문장)`].join('\n');
const patch = { summary: '저녁에만 닫히다 다시 열리는 상가 자동문은 간판 조명 반사로 안전센서가 재감지하는 경우가 많아요. 영통 상가에서 센서 교체와 각도 재설정으로 해결한 기록이에요.', body, fields: { place: '상가 1층 출입문(편개형)', sym: '닫히다가 다시 열리기 반복, 저녁 시간대에 심함', check: '안전센서 수광부 불량 + 간판 조명 반사 재감지(계측값 기준 밖)', act: '안전센서 1조 교체, 감도·각도 재설정', res: '20회 개폐 시험 정상, 야간 전화 확인으로 마감' }, hub: '/cases/', related: ['/services/sensor/', '/guides/g03/'], keyword: { id: 'K0003', keyword: '자동문 센서 수리', intent: '자동문 센서 수리' }, photos };
const s = await E(`/api/admin/content/${id}/`, { method: 'PUT', body: JSON.stringify({ patch, ifVersion: c.j.page.version }) });
rec('자동저장(PUT) + 검증 통과', s.status === 200 && s.j.validation.errors.length === 0, JSON.stringify(s.j.validation?.errors?.map((e) => e.msg)));
const stale = await E(`/api/admin/content/${id}/`, { method: 'PUT', body: JSON.stringify({ patch: { title: 'x' }, ifVersion: c.j.page.version }) });
rec('버전 충돌 저장 거부(409)', stale.status === 409);
const missing = await E('/api/admin/content/', { method: 'POST', body: JSON.stringify({ type: 'guide', title: '짧음' }) });
const mv = await E(`/api/admin/content/${missing.j.page.id}/`); rec('필수 누락 글은 발행 조건 실패 목록 제공', mv.j.validation.errors.length >= 4, `${mv.j.validation.errors.length}건`);
await E(`/api/admin/content/${missing.j.page.id}/`, { method: 'POST', body: JSON.stringify({ action: 'delete' }) });
// 2. 작성자는 공개 불가 → 검수 요청, 운영자가 승인·공개
const denied = await E(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'publish' }) });
rec('작성자(editor) 공개 시도 403', denied.status === 403, denied.j?.error);
const sub = await E(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'submit' }) });
rec('검수 요청 → 상태 review', sub.status === 200 && sub.j.page.status === 'review');
const anon = await pub(pagePath); rec('공개 전 주소는 404', anon.status === 404);
const tPub = Date.now();
const p1 = await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'publish' }) });
rec('운영자 승인·공개 요청 접수(발행 중)', p1.status === 200 && p1.j.pending === true && p1.j.page.status === 'publishing');
const p1d = await waitCheck(A, id, null);
rec('공개 후 자가 검사 통과(응답 이후 실행)', p1d?.status === 'published' && p1d.check?.ok === true, JSON.stringify(p1d?.check?.items?.filter((i) => !i.ok).map((i) => [i.k, i.detail])));
const dbl = await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'publish', ifVersion: 1 }) });
rec('오래된 버전으로 중복 발행 거부(409)', dbl.status === 409);
// 3. 독립 검증(5분 이내)
const live = await pub(pagePath);
const title = (live.body.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '';
rec('새 URL 200', live.status === 200);
rec('초기 HTML title', title.includes('영통 상가 출입문이 닫히다'), title);
rec('self-canonical', live.body.includes(`rel="canonical" href="https://jndsystem.kr${pagePath}"`));
const main = (live.body.match(/<main[\s\S]*?<\/main>/) || [''])[0].replace(/<script[\s\S]*?<\/script>/g, '');
rec('초기 HTML 본문(JS 없이) + 소제목·목록', main.includes('안전센서 1조를 교체') && main.includes('<h2>확인한 것</h2>') && main.includes('<li>센서 앞 입간판과 매트 위치</li>'));
rec('사진 alt·width/height·srcset', /alt="상가 출입문 상단 안전센서 교체 전 모습"/.test(main) && /srcset="[^"]*480w/i.test(main) && /width="\d+" height="\d+"/.test(main), (main.match(/<img[^>]*>/) || [''])[0].slice(0, 160));
for (const ph of photos) { const r = await pub(`/uploads/${ph.id}-${ph.sizes[ph.sizes.length - 1]}.webp`); rec(`공개 이미지 200 (${ph.name})`, r.status === 200); }
const orig = await pub(`/uploads/${photos[0].id}.jpg`); rec('원본 파일은 공개 경로로 안 나감', orig.status === 404);
const hub = await pub('/cases/'); rec('허브 HTML 링크', hub.body.includes(`href="${pagePath}"`));
const sm = await pub('/sitemap.xml'); rec('사이트맵 포함', sm.body.includes(`<loc>https://jndsystem.kr${pagePath}</loc>`));
rec('공개까지 5분 이내', Date.now() - tPub < 5 * 60 * 1000, `${((Date.now() - tPub) / 1000).toFixed(1)}s`);
rec('관리자·미리보기 경로는 공개 링크·XML 에 없음', !sm.body.includes('/admin/') && !main.includes('/admin/preview'));
// 4. 수정: 제목 변경 → URL 유지
const g1 = await A(`/api/admin/content/${id}/`);
const e1 = await A(`/api/admin/content/${id}/`, { method: 'PUT', body: JSON.stringify({ patch: { title: '영통 상가 자동문이 저녁에만 닫히다 다시 열릴 때 — 안전센서 교체 기록' }, ifVersion: g1.j.page.version }) });
rec('제목 수정 후 URL 유지', e1.status === 200 && e1.j.page.path === pagePath);
await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'publish' }) });
const p2d = await waitCheck(A, id, p1d?.check?.at);
const live2 = await pub(pagePath); rec('재발행 후 새 제목 반영', p2d?.check?.ok === true && live2.body.includes('저녁에만 닫히다 다시 열릴 때'));
const snaps = await A(`/api/admin/content/${id}/`); rec('이력 버전 2개 이상', (snaps.j.snapshots || []).length >= 2, `${snaps.j.snapshots?.length}`);
const rs = snaps.j.snapshots?.length ? await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'restore', version: snaps.j.snapshots[snaps.j.snapshots.length - 1].version }) }) : { status: 0, j: {} };
rec('이력 복원', rs.status === 200 && rs.j.page.title.includes('영통 상가 출입문이 닫히다'), rs.j.page?.title);
// 5. 비공개
const unReq = await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'unpublish' }) });
const un = { j: { check: (await waitCheck(A, id, unReq.j?.page?.check?.at || null))?.check } };
const gone = await pub(pagePath); const sm2 = await pub('/sitemap.xml'); const hub2 = await pub('/cases/');
rec('비공개 → 404', gone.status === 404);
rec('비공개 → 사이트맵 제외', !sm2.body.includes(`<loc>https://jndsystem.kr${pagePath}</loc>`));
rec('비공개 → 허브 링크 제거', !hub2.body.includes(`href="${pagePath}"`));
rec('비공개 확인 항목 전부 통과', un.j.check?.ok === true);
const prevAnon = await fetch(BASE + `/admin/preview/content/${id}/`, { redirect: 'manual' }); rec('인증 없는 미리보기 접근 → 로그인으로', prevAnon.status === 307 || prevAnon.status === 302 || prevAnon.status === 303);
const apiAnon = await fetch(BASE + `/api/admin/content/${id}/`, { redirect: 'manual' }); rec('인증 없는 API 호출 401', apiAnon.status === 401);
// 6. 재발행
const p3r = await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'publish' }) });
const p3 = { j: { check: (await waitCheck(A, id, p3r.j?.page?.check?.at || null))?.check } };
const live3 = await pub(pagePath); rec('재발행 → 200·검사 통과', p3.j.check?.ok === true && live3.status === 200);
const viewer = await A('/api/admin/content/'); rec('목록 API 에 상태 표시', viewer.j.pages.some((x) => x.id === id && x.status === 'published'));
// 정리: 테스트 글 비공개(저장소에는 남음 — 운영자 확인용)
const fin = await A(`/api/admin/content/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'unpublish' }) }); await waitCheck(A, id, fin.j?.page?.check?.at || null);
fs.rmSync(path.join(ROOT, 'var', 'acceptance-tmp'), { recursive: true, force: true });
const fails = results.filter((r) => !r.ok);
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/publish-acceptance.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, pageId: id, path: pagePath, pass: results.length - fails.length, fail: fails.length, results }, null, 1));
console.log(`\n[publish-acceptance] ${results.length - fails.length}/${results.length} pass, ${fails.length} fail, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (fails.length) process.exit(1);
