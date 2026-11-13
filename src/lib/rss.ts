import { handbookArticles, handbookCategory, handbookEditorial, handbookPath } from '@/content/handbook';
import { parseBody, FIELDS } from '@/lib/content-body';
import { contentLastmod } from '@/lib/lastmod';
import { publicRecords, recordByPath } from '@/lib/registry';
import { BRAND, MAIN_PHONE, SITE_URL, abs } from '@/lib/site';
import type { AuthoredPage } from '@/lib/server/content';

type FeedItem = { path: string; title: string; html: string; published: string; updated: string };
export const RSS_PATH = '/rss.xml';
const xml = (value: string) => value.toWellFormed().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!);
const cdata = (value: string) => `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
const p = (text: string) => `<p>${xml(text)}</p>`;
const heading = (text: string) => `<h2>${xml(text)}</h2>`;
const list = (items: string[], ordered = false) => { const tag = ordered ? 'ol' : 'ul'; return `<${tag}>${items.map(x => `<li>${xml(x)}</li>`).join('')}</${tag}>`; };
const date = (value: string) => { const d = new Date(value); if (!Number.isFinite(d.getTime())) throw new Error('Invalid RSS content date'); return d; };

/** Use the same reviewed article data as the public pages, including the complete editorial body. */
export function handbookFeedItems(): FeedItem[] {
  return handbookArticles.map(a => {
    const category = handbookCategory(a.category), detail = handbookEditorial(a.slug);
    const path = handbookPath(a.slug), record = recordByPath(path)!;
    const html = `<article><h1>${xml(a.title)}</h1>${p(a.answer)}`
      + heading('이 상황을 구분하는 방법') + p(detail.explanation)
      + heading('안전한 범위에서 확인할 항목') + list(a.checks, true)
      + p('확인한 사실과 추측을 나누어 적어 주세요. 자료를 안전하게 확인할 수 없거나 내용이 불분명하면, 직접 장치를 열어 찾는 대신 ‘현장 확인 필요’로 표시해도 됩니다.')
      + heading('관찰 결과에 따른 다음 단계')
      + `<table><caption>${xml(a.title)} — 상황별 확인과 전달</caption><thead><tr><th>관찰한 상황</th><th>다음 행동</th></tr></thead><tbody>${detail.comparisons.map(r => `<tr><th>${xml(r.situation)}</th><td>${xml(r.nextStep)}</td></tr>`).join('')}</tbody></table>`
      + heading('판단과 다음 단계') + p(a.decision) + `<aside><h3>${xml(category.title)} 안내의 적용 범위</h3>${p(category.introduction)}</aside>`
      + heading('담당자에게 전달할 자료') + list(a.handoff)
      + p('출입구 위치와 현재 운영 상태를 함께 알려 주세요. 장비가 여러 대면 위치 번호를 붙여 자료가 섞이지 않도록 합니다. 비밀번호·카드 정보·고객 얼굴 등 상담에 필요하지 않은 정보는 제외해 주세요.')
      + '<h3>메모 작성 예시</h3>' + p(a.example)
      + p('위 문장은 기록 방법을 보여주는 예시입니다. 실제 현장에서 확인한 내용에 맞춰 바꾸고, 작업 범위와 일정은 상담 후 확인해 주세요.')
      + '<h3>상담할 때 확인할 질문</h3>' + p(detail.question)
      + `<p><a href="tel:${MAIN_PHONE.replaceAll('-', '')}">전화 상담 ${MAIN_PHONE}</a> · <a href="${abs('/contact/#inquiry')}">상담 방법 보기</a></p></article>`;
    return { path, title: a.title, html, published: a.publishedAt, updated: contentLastmod(record).toISOString() };
  });
}

/** Input is the approved public snapshot, never the editable drafts collection. */
export function authoredFeedItems(pages: AuthoredPage[]): FeedItem[] {
  const existing = new Set(publicRecords().map(r => r.path));
  return pages.filter(page => ['published', 'publishing', 'error'].includes(page.status)
    && /^\/(?:cases|guides|services|areas)\/[a-z0-9/-]+\/$/.test(page.path) && !existing.has(page.path)).map(page => {
    const fields = FIELDS[page.type].filter(f => page.fields[f.key]);
    const blocks = parseBody(page.body).map(b => b.t === 'h2' ? heading(b.text) : b.t === 'ul' ? list(b.items) : p(b.text)).join('');
    const photos = page.photos.map(photo => {
      const width = Math.max(...photo.sizes);
      if (!/^[a-z0-9]{12}$/.test(photo.id) || !Number.isFinite(width) || width <= 0) return '';
      return `<figure><img src="${abs(`/uploads/${photo.id}-${width}.webp`)}" alt="${xml(photo.alt)}"/>${photo.caption ? `<figcaption>${xml(photo.caption)}</figcaption>` : ''}</figure>`;
    }).join('');
    return { path: page.path, title: page.title, published: page.publishedAt || page.createdAt, updated: page.updatedAt,
      html: `<article><h1>${xml(page.title)}</h1>${p(page.summary)}${fields.map(f => heading(f.label) + p(page.fields[f.key])).join('')}${blocks}${photos}</article>` };
  });
}

export function renderRss(pages: AuthoredPage[] = []): string {
  const items = [...handbookFeedItems(), ...authoredFeedItems(pages)].sort((a, b) => date(b.updated).getTime() - date(a.updated).getTime() || a.path.localeCompare(b.path));
  const selected: string[] = [], seen = new Set<string>();
  let bytes = 0;
  for (const item of items) {
    if (seen.has(item.path)) continue;
    const url = xml(abs(item.path));
    const entry = `<item><title>${xml(item.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${date(item.published).toUTCString()}</pubDate><atom:updated>${date(item.updated).toISOString()}</atom:updated><description>${cdata(item.html)}</description><content:encoded>${cdata(item.html)}</content:encoded></item>`;
    const size = Buffer.byteLength(entry, 'utf8');
    // Keep complete bodies and stay comfortably below Naver's 10 MB submission limit.
    if (selected.length >= 200 || bytes + size > 9_000_000) break;
    seen.add(item.path); bytes += size; selected.push(entry);
  }
  const updated = items[0] ? date(items[0].updated).toUTCString() : undefined;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${BRAND} 설치·관리 안내</title><link>${SITE_URL}/</link><description>자동문 설치·점검·수리와 출입구 관리에 관한 검수된 안내 및 공개 글의 본문 전체</description><language>ko-KR</language><atom:link href="${abs(RSS_PATH)}" rel="self" type="application/rss+xml"/>${updated ? `<lastBuildDate>${updated}</lastBuildDate>` : ''}${selected.join('\n')}</channel></rss>\n`;
}
