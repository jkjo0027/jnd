import 'server-only';
import { readJSON, updateJSON, StorageConflict } from './persistence';
import crypto from 'node:crypto';
import { parseBody, bodyText, FIELDS, TYPE_HUB, type PageType } from '@/lib/content-body';
import { ledger, publicRecords, recordByPath, baseRegions, isPublic } from '@/lib/registry';
import { SERVICES } from '@/content/services';
import { ALL_GUIDES } from '@/content/guides';
import { CASES } from '@/content/site-data';
import factsJson from '../../../data/registry/fact-ledger.json';

/**
 * 운영자가 관리자에서 직접 만드는 페이지 저장소(런타임 콘텐츠 DB).
 * Netlify: 사이트 전용 Blobs의 content-v1.json. 글·공개본·이력을 조건부 원자적 쓰기로 저장한다.
 * 로컬 개발: var/cms. 비공개 편집본은 발행 전까지 공개본에 영향을 주지 않는다.
 */
export type Status = 'draft' | 'review' | 'publishing' | 'published' | 'error' | 'unpublished';
export type Photo = { id: string; name: string; alt: string; caption: string; w: number; h: number; sizes: number[]; cover?: boolean };
export type CheckItem = { k: string; ok: boolean; detail: string };
export type AuthoredPage = {
  id: string; type: PageType; path: string; title: string; summary: string; body: string; seoTitle: string; seoDesc: string;
  hub: string; related: string[]; keyword: { id: string; keyword: string; intent: string } | null;
  region: { province: 'seoul' | 'gyeonggi'; rid: string } | null; service: string | null; slug: string | null;
  fields: Record<string, string>; photos: Photo[]; showMeta: boolean;
  status: Status; version: number; createdBy: string; createdAt: string; updatedBy: string; updatedAt: string;
  publishedAt: string | null; reviewedBy: string | null; reviewedAt: string | null; lastPublishedVersion: number | null;
  check: { at: string; ok: boolean; items: CheckItem[] } | null;
  history: { version: number; at: string; by: string; action: string }[];
};
export const STATUS_LABEL: Record<Status, string> = { draft: '초안', review: '검수 요청', publishing: '발행 중', published: '공개 및 검색 발견 준비', error: '공개 오류', unpublished: '비공개' };
export const isLive = (p: AuthoredPage) => p.status === 'published' || p.status === 'error' || p.status === 'publishing';

const CONTENT_KEY = 'content-v1.json';
type ContentState = { pages: Record<string, AuthoredPage>; published: Record<string, AuthoredPage>; snapshots: Record<string, Record<string, AuthoredPage>> };
const emptyContent = (): ContentState => ({ pages: {}, published: {}, snapshots: {} });
const readContent = async () => (await readJSON(CONTENT_KEY, emptyContent)).data;
const changeContent = <R,>(change: (data: ContentState) => R) => updateJSON(CONTENT_KEY, emptyContent, change);
const facts = factsJson as { services: Record<string, { verified: boolean }> };
export const listPages = async (): Promise<AuthoredPage[]> => Object.values((await readContent()).pages).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const getPage = async (id: string): Promise<AuthoredPage | null> => (await readContent()).pages[id] || null;
export const livePages = async (): Promise<AuthoredPage[]> => Object.values((await readContent()).published);
export const liveByPath = async (p: string): Promise<AuthoredPage | null> => (await livePages()).find((x) => x.path === p) || null;
export const liveByType = async (t: PageType) => (await livePages()).filter((x) => x.type === t);

const rid8 = () => crypto.randomBytes(4).toString('hex');
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
export const PREFIX: Record<PageType, string> = { case: 'cs', guide: 'gd', service: 'sv', region: 'rg' };

/** 서비스 ID → 라벨 (지역·서비스 유형에서 선택) — 사실 대장에서 확인된 서비스만 */
export const verifiedServices = () => SERVICES.filter((s) => facts.services[s.id]?.verified).map((s) => ({ id: s.id, label: s.h1 }));
export const regionOptions = () => baseRegions.map((b) => ({ rid: b.regionId, province: b.province, label: `${b.province === 'seoul' ? '서울' : '경기'} ${b.name}` }));
export const hubOptions = () => [
  { path: '/cases/', label: '시공사례' }, { path: '/guides/', label: '증상 가이드' }, { path: '/services/', label: '서비스' }, { path: '/areas/seoul/', label: '서울 지역' }, { path: '/areas/gyeonggi/', label: '경기 지역' },
].filter((h) => isPublic(recordByPath(h.path)));
export const isPublicPath = async (p: string) => isPublic(recordByPath(p)) || !!(await liveByPath(p));
/** 연결 가능한 공개 페이지 검색 (관련 페이지 선택용) */
export async function searchPublicPaths(q: string, limit = 20): Promise<{ path: string; label: string }[]> {
  const qq = q.trim().toLowerCase();
  const reg = publicRecords().map((r) => ({ path: r.path, label: `${r.primaryIntent} (${r.path})` }));
  const live = (await livePages()).map((p) => ({ path: p.path, label: `${p.title} (${p.path})` }));
  return [...live, ...reg].filter((x) => !qq || x.label.toLowerCase().includes(qq) || x.path.includes(qq)).slice(0, limit);
}

/** 경로 결정: 유형별 안정 ID. 제목을 바꿔도 발행된 경로는 유지한다 */
export function pathFor(type: PageType, o: { id: string; slug?: string | null; region?: AuthoredPage['region']; service?: string | null }): string | null {
  if (type === 'case') return `/cases/${o.id}/`;
  if (type === 'guide') return `/guides/${o.id}/`;
  if (type === 'service') return o.slug && /^[a-z0-9][a-z0-9-]{2,39}$/.test(o.slug) ? `/services/${o.slug}/` : null;
  if (type === 'region') return o.region && o.service && /^r\d\d$/.test(o.region.rid) ? `/areas/${o.region.province}/${o.region.rid}/${o.service}/` : null;
  return null;
}
/** 경로가 이미 쓰이는지: 레지스트리 레코드(공개·통합 리디렉션·보류) 또는 다른 운영자 페이지 */
export async function pathConflict(p: string, selfId?: string): Promise<string | null> {
  const r = recordByPath(p);
  if (r) {
    if (isPublic(r)) return `이미 공개된 페이지예요(${r.pageId}). 새 글 대신 기존 글을 보강하는 쪽을 권해요.`;
    if (r.mergeTarget) return `이 주소는 ${r.mergeTarget} 로 통합(리디렉션)되어 있어요. 지역 근거를 운영자 확인 목록에 등록하면 개발에서 복원할 수 있어요.`;
    return `이 주소는 사실 확인 전 보류 상태(${r.pageId})예요. 운영자 확인 후에만 쓸 수 있어요.`;
  }
  const other = (await listPages()).find((x) => x.path === p && x.id !== selfId && x.status !== 'unpublished');
  if (other) return `같은 주소의 글이 있어요: ${other.title} (${other.status === 'draft' ? '초안' : other.status})`;
  return null;
}

export async function createPage(type: PageType, by: string, init: Partial<Pick<AuthoredPage, 'region' | 'service' | 'slug' | 'title'>> = {}): Promise<AuthoredPage> {
  const id = `${PREFIX[type]}-${today()}-${rid8()}`;
  const now = new Date().toISOString();
  const p: AuthoredPage = {
    id, type, path: pathFor(type, { id, slug: init.slug || null, region: init.region || null, service: init.service || null }) || '', title: init.title || '', summary: '', body: '', seoTitle: '', seoDesc: '',
    hub: TYPE_HUB[type] === '/areas/' ? (init.region ? `/areas/${init.region.province}/` : '/areas/gyeonggi/') : TYPE_HUB[type], related: [], keyword: null,
    region: init.region || null, service: init.service || null, slug: init.slug || null, fields: {}, photos: [], showMeta: true,
    status: 'draft', version: 1, createdBy: by, createdAt: now, updatedBy: by, updatedAt: now, publishedAt: null, reviewedBy: null, reviewedAt: null, lastPublishedVersion: null, check: null,
    history: [{ version: 1, at: now, by, action: 'create' }],
  };
  await changeContent((data) => { data.pages[id] = p; });
  return p;
}

const EDITABLE = ['title', 'summary', 'body', 'seoTitle', 'seoDesc', 'hub', 'related', 'keyword', 'region', 'service', 'slug', 'fields', 'photos', 'showMeta'] as const;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
/** 자동저장: 편집 가능한 필드만 받아 정제·저장. 버전 충돌(ifVersion) 시 거부 */
export async function savePage(id: string, by: string, patch: Record<string, unknown>, ifVersion?: number): Promise<{ page?: AuthoredPage; error?: string; status?: number }> {
  return changeContent((data) => {
  const all = data.pages; const p = all[id];
  if (!p) return { error: 'not found', status: 404 };
  if (ifVersion !== undefined && ifVersion !== p.version) return { error: `다른 곳에서 먼저 저장됐어요(버전 ${p.version}). 새로고침 후 다시 편집해 주세요.`, status: 409 };
  const next: AuthoredPage = { ...p };
  for (const k of EDITABLE) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (k === 'title') next.title = str(v, 120).trim();
    else if (k === 'summary') next.summary = str(v, 400).trim();
    else if (k === 'body') next.body = str(v, 40000);
    else if (k === 'seoTitle') next.seoTitle = str(v, 120).trim();
    else if (k === 'seoDesc') next.seoDesc = str(v, 300).trim();
    else if (k === 'hub') next.hub = /^\/[a-z0-9/-]*\/$/.test(String(v)) ? String(v) : next.hub;
    else if (k === 'related') next.related = Array.isArray(v) ? v.map(String).filter((x) => /^\/[a-z0-9/-]*\/$/.test(x)).slice(0, 12) : next.related;
    else if (k === 'keyword') next.keyword = v && typeof v === 'object' ? { id: str((v as Record<string, unknown>).id, 10), keyword: str((v as Record<string, unknown>).keyword, 80), intent: str((v as Record<string, unknown>).intent, 80) } : null;
    else if (k === 'showMeta') next.showMeta = !!v;
    else if (k === 'fields') { const f: Record<string, string> = {}; for (const d of FIELDS[p.type]) f[d.key] = str((v as Record<string, unknown>)?.[d.key], 4000); next.fields = f; }
    else if (k === 'photos') next.photos = Array.isArray(v) ? v.slice(0, 30).map((x) => { const o = x as Record<string, unknown>; return { id: str(o.id, 24), name: str(o.name, 255), alt: str(o.alt, 200).trim(), caption: str(o.caption, 300).trim(), w: Number(o.w) || 0, h: Number(o.h) || 0, sizes: Array.isArray(o.sizes) ? o.sizes.map(Number).filter(Boolean) : [], cover: !!o.cover }; }).filter((x) => /^[a-z0-9]{12}$/.test(x.id)) : next.photos;
    else if (k === 'slug' && p.type === 'service' && p.lastPublishedVersion === null) next.slug = str(v, 40).toLowerCase().trim() || null;
    else if (k === 'region' && p.type === 'region' && p.lastPublishedVersion === null) { const o = v as Record<string, unknown> | null; next.region = o && /^(seoul|gyeonggi)$/.test(String(o.province)) && /^r\d\d$/.test(String(o.rid)) ? { province: String(o.province) as 'seoul' | 'gyeonggi', rid: String(o.rid) } : null; }
    else if (k === 'service' && (p.type === 'region') && p.lastPublishedVersion === null) next.service = verifiedServices().some((s) => s.id === v) ? String(v) : null;
  }
  // 발행 전에는 경로를 유형·슬러그·지역에서 다시 계산, 발행 후에는 고정
  if (p.lastPublishedVersion === null) next.path = pathFor(p.type, next) || '';
  if (next.type === 'region' && next.region) next.hub = `/areas/${next.region.province}/`;
  next.updatedAt = new Date().toISOString(); next.updatedBy = by; next.version = p.version + 1;
  if (next.status === 'review') next.status = 'draft'; // 검수 요청 후 수정하면 다시 초안
  all[id] = next;
  return { page: next };
  });
}

/* ── 검증(발행 게이트) ── */
const CLAIM_RE = [/\d[\d,]*\s*(원|만원)/, /(\d+)\s*년\s*(무상|보증)/, /\d+\s*분\s*(내|이내|안)\s*(도착|방문|출동)/, /24시간|연중무휴|즉시 출동|최저가/];
export type Validation = { errors: { field: string; msg: string }[]; warnings: { field: string; msg: string }[]; similar: { path: string; title: string; score: number; why: string }[] };
const norm = (t: string) => t.normalize('NFC').replace(/[\s\p{P}\p{S}]+/gu, '');
const grams = (s: string, n = 5) => { const g = new Set<string>(); for (let i = 0; i + n <= s.length; i++) g.add(s.slice(i, i + n)); return g; };
const jac = (a: Set<string>, b: Set<string>) => { let x = 0; for (const g of a) if (b.has(g)) x++; return x / (a.size + b.size - x || 1); };
const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
/** 비교 말뭉치: 운영자 페이지 + 정적 사례·가이드·서비스 본문 */
async function corpus(selfId: string): Promise<{ path: string; title: string; text: string; intent: string }[]> {
  const out = (await listPages()).filter((p) => p.id !== selfId && p.status !== 'unpublished').map((p) => ({ path: p.path, title: p.title, text: [p.summary, bodyText(p.body), ...Object.values(p.fields)].join(' '), intent: p.keyword?.intent || p.title }));
  for (const c of CASES) out.push({ path: `/cases/${c.id}/`, title: `${c.place} ${c.title}`, text: [c.sym, c.check, c.act, c.res].join(' '), intent: c.title });
  for (const g of ALL_GUIDES) out.push({ path: g.path, title: g.h1, text: [g.question, g.answer, ...(g.detail?.paras || [])].join(' '), intent: g.h1 });
  for (const s of SERVICES) out.push({ path: s.path, title: s.h1, text: [s.lead, ...(s.extra || []), ...s.scope].join(' '), intent: s.h1 });
  return out;
}
export async function findSimilar(p: Pick<AuthoredPage, 'id' | 'title' | 'summary' | 'body' | 'fields' | 'keyword'>): Promise<Validation['similar']> {
  const mine = norm([p.summary, bodyText(p.body), ...Object.values(p.fields || {})].join(' '));
  const myG = grams(mine), myT = grams(norm(p.title), 3);
  const out: Validation['similar'] = [];
  for (const c of await corpus(p.id)) {
    const cn = norm(c.text);
    const body = mine.length > 40 && cn.length > 40 ? jac(myG, grams(cn)) : 0;
    const title = jac(myT, grams(norm(c.title), 3));
    const sameIntent = !!p.keyword && norm(c.intent) === norm(p.keyword.intent);
    if (mine.length > 40 && hash(mine) === hash(cn)) out.push({ path: c.path, title: c.title, score: 1, why: '본문이 동일해요' });
    else if (body >= 0.75) out.push({ path: c.path, title: c.title, score: +body.toFixed(2), why: '본문이 매우 비슷해요' });
    else if (title >= 0.6) out.push({ path: c.path, title: c.title, score: +title.toFixed(2), why: '제목이 비슷해요' });
    else if (sameIntent) out.push({ path: c.path, title: c.title, score: 0.5, why: '같은 대표 검색 의도예요' });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}
export async function validatePage(p: AuthoredPage): Promise<Validation> {
  const errors: Validation['errors'] = [], warnings: Validation['warnings'] = [];
  const text = bodyText(p.body);
  if (p.title.length < 8) errors.push({ field: 'title', msg: '제목을 8자 이상 적어 주세요.' });
  if (p.summary.length < 20) errors.push({ field: 'summary', msg: '요약을 20자 이상 적어 주세요(첫 문단에서 답을 바로).' });
  if (text.length < 300) errors.push({ field: 'body', msg: `본문이 ${text.length}자예요. 실질 본문이 300자 이상 필요해요.` });
  for (const d of FIELDS[p.type]) if (d.required && !(p.fields[d.key] || '').trim()) errors.push({ field: 'f-' + d.key, msg: `${d.label}을(를) 적어 주세요.` });
  if (!p.path) errors.push({ field: p.type === 'service' ? 'slug' : 'region', msg: p.type === 'service' ? '주소(영문 소문자·숫자·하이픈 3~40자)를 정해 주세요.' : '지역과 서비스를 골라 주세요.' });
  else { const c = await pathConflict(p.path, p.id); if (c) errors.push({ field: p.type === 'service' ? 'slug' : 'region', msg: c }); }
  if (!p.hub || !hubOptions().some((h) => h.path === p.hub)) errors.push({ field: 'hub', msg: '공개된 상위 허브를 골라 주세요.' });
  for (const r of p.related) if (!(await isPublicPath(r))) errors.push({ field: 'related', msg: `관련 페이지 ${r} 는 공개 상태가 아니에요.` });
  p.photos.forEach((ph, i) => { if (ph.alt.trim().length < 4) errors.push({ field: 'photo-' + i, msg: `${i + 1}번 사진(${ph.name})의 사진 설명을 적어 주세요.` }); });
  if (p.type === 'case' && !p.photos.length) warnings.push({ field: 'photos', msg: '시공사례는 현장 사진이 있어야 근거가 돼요. 사진 없이 발행하면 참고 사례로만 보여요.' });
  // 검색어 반복
  const words = p.title.split(/\s+/).filter((w) => w.length >= 2); const cnt: Record<string, number> = {}; for (const w of words) cnt[w] = (cnt[w] || 0) + 1;
  if (Object.values(cnt).some((n) => n >= 3)) warnings.push({ field: 'title', msg: '제목에 같은 말이 3번 이상 반복돼요. 자연스러운 문장으로 바꿔 주세요.' });
  const all = [p.title, p.summary, text, ...Object.values(p.fields)].join(' ');
  for (const re of CLAIM_RE) { const m = all.match(re); if (m) { warnings.push({ field: 'body', msg: `확인되지 않은 가격·보증·출동 시간 표현이 있어요: "${m[0]}". 운영자 확인 전에는 빼 주세요.` }); break; } }
  const similar = await findSimilar(p);
  for (const s of similar) if (s.score === 1) errors.push({ field: 'body', msg: `본문이 ${s.path} 와 동일해요.` });
  if ((p.seoTitle || p.title).length > 70) warnings.push({ field: 'seoTitle', msg: '검색 제목이 70자를 넘어 잘릴 수 있어요.' });
  if ((p.seoDesc || p.summary).length > 160) warnings.push({ field: 'seoDesc', msg: '검색 설명이 160자를 넘어 잘릴 수 있어요.' });
  return { errors, warnings, similar };
}

/* ── 상태 전환 ── */
export async function setStatus(id: string, by: string, status: Status, extra: Partial<AuthoredPage> = {}, action: string = status, ifVersion?: number): Promise<AuthoredPage | null> {
  return changeContent((data) => {
    const p = data.pages[id]; if (!p) return null;
    if (ifVersion !== undefined && p.version !== ifVersion) throw new StorageConflict('글이 변경됐어요. 새로고침 후 다시 시도해 주세요.');
    if (action === 'publish' && Object.values(data.published).some((x) => x.id !== id && x.path === p.path)) throw new StorageConflict('같은 주소의 공개 글이 있어요.');
    const now = new Date().toISOString();
    const next: AuthoredPage = { ...p, ...extra, status, version: p.version + 1, updatedAt: now, updatedBy: by, history: p.history.concat([{ version: p.version + 1, at: now, by, action }]) };
    data.pages[id] = next;
    (data.snapshots[id] ||= {})[String(next.version)] = structuredClone(next);
    // Autosaves never alter the last approved public version.
    if (action === 'publish') data.published[id] = structuredClone(next);
    if (status === 'unpublished') delete data.published[id];
    return next;
  });
}
export async function snapshot(p: AuthoredPage) {
  await changeContent((data) => { (data.snapshots[p.id] ||= {})[String(p.version)] = p; });
}
export async function listSnapshots(id: string): Promise<{ version: number; at: string; by: string; action: string; title: string }[]> {
  return Object.values((await readContent()).snapshots[id] || {}).map((s) => { const h = s.history[s.history.length - 1]; return { version: s.version, at: h?.at || s.updatedAt, by: h?.by || s.updatedBy, action: h?.action || '', title: s.title }; }).sort((a, b) => b.version - a.version);
}
export async function restoreSnapshot(id: string, version: number, by: string): Promise<AuthoredPage | null> {
  const s = (await readContent()).snapshots[id]?.[String(version)]; if (!s) return null;
  const patch: Record<string, unknown> = {}; for (const k of EDITABLE) patch[k] = s[k];
  const r = await savePage(id, by, patch);
  if (!r.page) return null;
  return setStatus(id, by, r.page.status, {}, `restore v${version}`, r.page.version);
}
export async function deleteDraft(id: string): Promise<{ ok: boolean; freedPhotos: string[] }> {
  return changeContent((data) => {
    const p = data.pages[id];
    if (!p || p.lastPublishedVersion !== null) return { ok: false, freedPhotos: [] };
    delete data.pages[id];
    const used = new Set([...Object.values(data.pages), ...Object.values(data.published)].flatMap((x) => x.photos.map((ph) => ph.id)));
    return { ok: true, freedPhotos: p.photos.map((ph) => ph.id).filter((x) => !used.has(x)) };
  });
}

/* ── 공개 후 자가 검사(5분 수용 기준의 자동 판정) ── */
export async function postPublishCheck(origin: string, p: AuthoredPage): Promise<{ ok: boolean; items: CheckItem[] }> {
  const items: CheckItem[] = [];
  const publicOrigin = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '');
  // 재검증 직후 첫 응답은 캐시의 이전 상태(stale)일 수 있어 조건을 만족할 때까지 짧게 재시도한다(최대 ~6초)
  const get1 = async (u: string) => { try { const r = await fetch(origin + u, { redirect: 'manual', cache: 'no-store', headers: { 'user-agent': 'jnd-publish-check/1' } }); return { status: r.status, body: r.status === 200 ? await r.text() : '' }; } catch (e) { return { status: 0, body: String(e) }; } };
  const get = async (u: string, want: (r: { status: number; body: string }) => boolean = (r) => r.status === 200) => { let r = await get1(u); for (let i = 0; i < 8 && !want(r); i++) { await new Promise((res) => setTimeout(res, 750)); r = await get1(u); } return r; };
  const page = await get(p.path, (r) => r.status === 200 && r.body.includes(p.title));
  items.push({ k: '새 주소 200 응답', ok: page.status === 200, detail: `HTTP ${page.status}` });
  const title = (page.body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  items.push({ k: '초기 HTML 제목', ok: !!title && title.includes((p.seoTitle || p.title).slice(0, 20)), detail: title.slice(0, 80) });
  items.push({ k: 'self-canonical', ok: page.body.includes(`rel="canonical" href="${publicOrigin}${p.path}"`), detail: p.path });
  const main = (page.body.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
  items.push({ k: '초기 HTML 본문', ok: main.includes(p.title) && main.replace(/<[^>]+>/g, '').length > 300, detail: `${main.replace(/<[^>]+>/g, '').length}자` });
  for (const ph of p.photos.slice(0, 5)) { const w = ph.sizes[ph.sizes.length - 1]; const r = await get(`/uploads/${ph.id}-${w}.webp`); items.push({ k: `사진 공개 응답 (${ph.name})`, ok: r.status === 200, detail: `HTTP ${r.status}` }); }
  const hub = await get(p.hub, (r) => r.status === 200 && r.body.includes(`href="${p.path}"`));
  items.push({ k: '상위 허브 HTML 링크', ok: hub.status === 200 && hub.body.includes(`href="${p.path}"`), detail: p.hub });
  const sm = await get('/sitemap.xml', (r) => r.status === 200 && r.body.includes(`<loc>${publicOrigin}${p.path}</loc>`));
  items.push({ k: '사이트맵 포함', ok: sm.status === 200 && sm.body.includes(`<loc>${publicOrigin}${p.path}</loc>`), detail: '/sitemap.xml' });
  return { ok: items.every((i) => i.ok), items };
}
export async function postUnpublishCheck(origin: string, p: AuthoredPage): Promise<{ ok: boolean; items: CheckItem[] }> {
  const items: CheckItem[] = [];
  const publicOrigin = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, '');
  const get1 = async (u: string) => { try { const r = await fetch(origin + u, { redirect: 'manual', cache: 'no-store' }); return { status: r.status, body: r.status === 200 ? await r.text() : '' }; } catch { return { status: 0, body: '' }; } };
  const get = async (u: string, want: (r: { status: number; body: string }) => boolean) => { let r = await get1(u); for (let i = 0; i < 8 && !want(r); i++) { await new Promise((res) => setTimeout(res, 750)); r = await get1(u); } return r; };
  const page = await get(p.path, (r) => r.status === 404); items.push({ k: '주소 404', ok: page.status === 404, detail: `HTTP ${page.status}` });
  const sm = await get('/sitemap.xml', (r) => r.status === 200 && !r.body.includes(`<loc>${publicOrigin}${p.path}</loc>`)); items.push({ k: '사이트맵 제외', ok: !sm.body.includes(`<loc>${publicOrigin}${p.path}</loc>`), detail: '/sitemap.xml' });
  const hub = await get(p.hub, (r) => r.status === 200 && !r.body.includes(`href="${p.path}"`)); items.push({ k: '허브 링크 제거', ok: !hub.body.includes(`href="${p.path}"`), detail: p.hub });
  return { ok: items.every((i) => i.ok), items };
}
/** 발행 대장과 같은 필드 체계로 내보내기(감사 도구·CSV 용) */
export function ledgerView(p: AuthoredPage) {
  return { pageId: p.id, type: p.type, path: p.path, primaryIntent: p.keyword?.intent || p.title, contentStatus: isLive(p) ? 'PUBLISHED' : p.status === 'review' ? 'REVIEW_REQUIRED' : 'DRAFT', indexEligibility: isLive(p), qualityClass: p.type === 'case' && p.photos.length ? 'A' : 'B', serviceVerified: true, contentOwner: p.createdBy, lastHumanReviewedAt: p.reviewedAt, publishedAt: p.publishedAt, updatedAt: p.updatedAt, source: 'admin' };
}
export const ledgerPathsAll = () => ledger.map((r) => r.path);
export { parseBody };
