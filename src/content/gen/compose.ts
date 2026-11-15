import { SEOUL } from './regions-seoul';
import { GYEONGGI } from './regions-gyeonggi';
import { visitNotes } from './visit-notes';
import { REPAIR } from './blocks-repair';
import { INSTALL } from './blocks-install';
import { SENSOR } from './blocks-sensor';
import { MOTOR } from './blocks-motor';
import { GLASS } from './blocks-glass';
import { SAFETY } from './blocks-common';
import type { ServiceBlocks } from './blocks-types';
import type { RegionFact } from './types';
import { aliasesOf } from '@/lib/registry';

export const REGIONS: RegionFact[] = [...SEOUL, ...GYEONGGI];
export const SERVICE_BLOCKS: Record<string, ServiceBlocks> = { repair: REPAIR, install: INSTALL, sensor: SENSOR, motor: MOTOR, 'glass-door': GLASS };
export const SERVICE_IDS = ['repair', 'install', 'sensor', 'motor', 'glass-door'] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

/* ── 결정적 변형 선택: 지역·서비스·섹션별로 섞어 같은 서비스의 다른 지역과 문단이 겹칠 확률을 낮춘다 ── */
const mix = (a: number, b: number, c: number) => {
  let h = 2166136261 ^ (a * 16777619);
  h = Math.imul(h ^ (b + 0x9e3779b9), 16777619);
  h = Math.imul(h ^ (c + 0x85ebca6b), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
};
const fill = (s: string, m: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => m[k] ?? '');
/** 서울 페이지에는 당일 출장 확약을 쓰지 않는다(운영자 회신은 경기도권 당일만 확인 — fact-ledger claims.sameDaySeoul=false) */
const SEOUL_SAFE: [RegExp, string][] = [[/당일 출장·부품 교체/g, '출장 점검·부품 교체'], [/ 당일 출장 상담/g, ' 출장 상담'], [/당일 방문이 가능한 \{svc\}/g, '직접 방문하는 {svc}'], [/당일 방문이 가능한 경우가 있어요/g, '방문 일정을 앞당길 수 있는 경우가 있어요'], [/당일 방문이 수월해요/g, '방문이 수월해요'], [/당일 출장/g, '출장']];
const seoulSafe = (province: string, s: string) => (province === 'seoul' ? SEOUL_SAFE.reduce((x, [re, to]) => x.replace(re, to), s) : s);

/** 서비스별 부품·제조사 안내 — {r} 지역 */
const PARTS_NOTES: Record<ServiceId, string[]> = {
  repair: ['{r} 현장에서 쓰는 교체 부품은 자체 브랜드 스피드자동문(SD-2000 컨트롤러·모터·스위치, 안전센서 TC-R, 상부센서 TC-500)과 현대·태성·우성·태양·H&T코리아·미래·건일·토토·스위코·태광 등 국내 제조사 호환품이에요. 기계함 스티커의 제조사·모델명을 알려 주시면 맞는 부품을 챙겨요.', '교체 부품은 기존 문과 호환되는 제품으로 골라요. {r}에서 많이 보이는 국내 제조사(현대·태성·우성·태양 등) 자동문은 센서·스위치·컨트롤러 호환품을 준비하고, 자체 브랜드 스피드자동문도 모델별 재고와 부품 수급 일정을 확인해요.', '{r} 수리에 들어가는 부품은 작업 전에 어떤 제품인지 설명드려요. 스피드자동문 SD 시리즈 스위치(유·무선 16종), TC 계열 센서, 글로넥스 카드리더기·데드볼트 등 취급 품목과 국내 제조사 호환품을 함께 다뤄요.', '부품 수급이 안 되는 단종 모델은 {r} 현장에서 오퍼레이터 교체 견적을 함께 안내해요. 그 외에는 센서·스위치·컨트롤러·모터·롤러 등 부품 단위로 호환품을 교체해요.', '{r} 출장 때는 사진으로 확인한 제조사·모델에 맞춰 센서·스위치·컨트롤러·롤러 등 후보 부품을 미리 챙겨 한 번에 처리하도록 준비해요. 스피드자동문 자체 부품과 국내 제조사 호환품 모두 가능해요.'],
  install: ['{r} 설치에는 자체 브랜드 스피드자동문 SD-2000 오퍼레이터(편개형·양개형)를 기본으로 쓰고, 프레임은 스테인리스 헤어라인·블랙·알루미늄 중 현장에 맞춰요. 유리는 강화유리 12T(고정창 8T)를 기본으로 상담해요.', '설치 자재는 실측 치수로 제작해요. {r} 현장의 프레임 재질·색상, 유리 두께, 스위치(유선·무선·장애인용), 센서(상부·안전), 번호키·카드리더기까지 한 번에 정하면 발주가 빨라요.', '{r} 설치 상담 때 정하는 사양은 오퍼레이터(SD-2000 편개·양개), 프레임(스테인리스·알루미늄), 유리(12T·8T), 스위치·센서·출입통제 장치예요. 샘플을 보고 고르실 수 있어요.', '{r}의 기존 건물 교체 공사는 기존 프레임 재사용 가능 여부를 먼저 봐요. 재사용이 가능하면 오퍼레이터·도어만 교체해 비용을 줄이고, 아니면 프레임부터 새로 제작해요.', '설치 후 1년 무상 A/S 는 오퍼레이터·센서·스위치 등 설치 품목에 적용돼요. {r} 현장은 설치 기록을 남겨 두고 같은 담당 기사가 A/S 를 맡아요.'],
  sensor: ['{r} 센서 교체에는 안전센서 TC-R 세트, 상부센서 TC-500 등 취급 품목과 현대·태성·우성 등 국내 제조사 호환 센서를 써요. 제조사·모델명과 센서 위치 사진을 보내 주시면 맞는 센서를 챙겨요.', '센서는 제조사별 커넥터·전압이 달라 호환품을 정확히 골라야 해요. {r} 현장에서는 기존 센서 사양을 확인한 뒤 TC 계열 또는 제조사 호환 센서로 교체해요.', '{r} 현장에서 감지센서·안전센서를 교체할 때는 설치 각도와 감도까지 현장 조건(햇빛·조명·매트)에 맞춰 다시 잡아요. 부품만 바꾸고 설정을 안 맞추면 오동작이 남아요.', '비접촉이 필요한 {r} 병원·식품 매장에는 노터치 근접센서(PS-100 등)와 감지센서 방식을 제안해요. 기존 자동문과 연동 설치가 가능해요.', '{r} 센서 수리에 쓰는 부품은 작업 전에 보여 드려요. 렌즈만 교체 가능한 모델은 렌즈만, 아니면 센서 본체를 교체하고 설정값을 안내해요.'],
  motor: ['{r} 컨트롤러·모터 교체에는 자체 브랜드 스피드자동문 SD-2000 컨트롤러와 모터(90W)를 바로 쓸 수 있고, 국내 제조사 제품은 모델명으로 호환 부품을 확인해 방문해요.', '컨트롤러는 제조사별로 호환이 제한돼요. {r} 현장에서는 기계함 스티커의 모델명을 확인하고 호환 컨트롤러·모터를 준비하며, 없으면 오퍼레이터 교체 견적을 함께 드려요.', '{r} 현장에서 모터를 교체할 때는 문 무게·폭에 맞는 출력(W)을 골라요. 출력이 모자라면 느리고, 과하면 충격이 커져요. 교체 후 속도·감속·위치 설정을 다시 잡아요.', '컨트롤러 교체 후에는 비상배터리·소방 연동 설정이 유지되는지 확인해요. {r}의 사무실·공용현관처럼 출입통제와 연동된 문은 연동 시험까지 해요.', '{r} 노후 오퍼레이터는 모터·컨트롤러·벨트·롤러를 함께 교체하는 기계 교체와 부품 단품 교체 두 가지 견적을 비교해 드려요. 프레임·유리는 살려요.'],
  'glass-door': ['{r} 강화도어 수리에는 문 무게·폭에 맞는 규격의 플로어힌지와 상부 피벗·패치, 글로넥스 데드볼트 같은 잠금 장치를 써요. 힌지 부위 사진으로 규격을 미리 확인해요.', '플로어힌지는 규격이 맞아야 해요. {r} 현장에서는 문 치수·유리 두께로 무게를 가늠해 맞는 힌지를 고르고, 매립 케이스 상태를 함께 봐요.', '{r}의 강화도어를 자동문으로 바꾸는 공사는 스피드자동문 SD-2000 편개형 오퍼레이터와 스테인리스 프레임을 기본으로 해요. 기존 힌지 자리는 스테인리스 판으로 덮어 마감해요.', '강화도어 잠금 장치는 처짐을 먼저 잡은 뒤 교체해요. {r} 상가의 야간 잠금은 데드볼트·번호키 연동도 함께 검토해요.', '{r} 강화도어 수리 부품은 작업 전에 어떤 규격인지 설명드려요. 힌지·피벗·잠금 장치 모두 호환 규격으로 준비해요.'],
};
const TITLE_FRAMES = [
  '{short} {label} | {zone1}·{zone2} 출장 | 제이앤디시스템',
  '{short} {label} | {dong1}·{dong2} 등 전 지역 | 제이앤디시스템',
  '{name} {label} | 증상별 점검·비용 안내 | 제이앤디시스템',
  '{short} {label} 출장 | {zone1} 현장 점검 | 제이앤디시스템',
  '{short} {label} | 당일 출장·부품 교체 | 제이앤디시스템',
];

export type GenSection = { id: string; n: string; h2: string; paras?: string[]; items?: string[]; steps?: { t: string; d: string }[]; cards?: { t: string; d: string }[]; faq?: { q: string; a: string }[]; symptoms?: { t: string; icon: string; cause: string; action: string }[] };
export type GeneratedPage = {
  pageId: string; rid: string; province: 'seoul' | 'gyeonggi'; service: ServiceId; path: string;
  h1: string; title: string; description: string; lead: string; region: RegionFact; label: string; noun: string; icon: string;
  aliases: string[]; sections: GenSection[]; related: string[];
};

export function composeRegionPage(rid: string, service: ServiceId): GeneratedPage | null {
  const region = REGIONS.find((r) => r.rid === rid);
  const B = SERVICE_BLOCKS[service];
  if (!region || !B) return null;
  const ri = REGIONS.indexOf(region), si = SERVICE_IDS.indexOf(service);
  const pick0 = <T,>(arr: T[], salt: number): T => arr[mix(ri, si, salt) % arr.length];
  const pick = <T,>(arr: T[], salt: number): T => { const v = pick0(arr, salt); return (typeof v === 'string' ? seoulSafe(region.province, v) : v) as T; };
  const rot = <T,>(arr: T[], salt: number): T[] => { const k = mix(ri, si, salt) % arr.length; return arr.slice(k).concat(arr.slice(0, k)); };
  const z = rot(region.zones, 1);
  const d = rot(region.dongs, 2);
  const m = { r: region.short, name: region.name, short: region.short, svc: B.label, label: B.label, noun: B.noun, zone: z[0], zone1: z[0], zone2: z[1] || z[0], dong1: d[0], dong2: d[1] || d[0], dongs: region.dongs.slice(0, 6).join('·') };
  const aliases = aliasesOf(rid).filter((a) => a.kind === 'living-area').map((a) => a.alias);
  const locations = region.dongs.slice(0, 3).join('·');
  const note = visitNotes[rid];
  const specialtyLead = service === 'sensor'
    ? `${region.name}의 감지센서와 안전센서는 역할이 달라요. 사람이 다가가도 열리지 않는지, 닫히던 문이 다시 열리는지 알려 주세요. 센서의 위치와 증상이 생기는 구간을 함께 확인합니다.`
    : service === 'motor'
      ? `${region.name}에서 자동문이 충격음을 내거나 저절로 움직이면 통행을 멈추고 시설 담당자에게 알려 주세요. 정지 위치와 소리가 나는 구간을 바탕으로 모터와 컨트롤러의 점검 범위를 나눕니다.`
      : undefined;
  const lead = specialtyLead ?? note?.[service === 'install' ? 'install' : 'repair'] ?? region.access;
  const pageId = `${rid.toUpperCase()}-${service}`;
  const path = `/areas/${region.province}/${rid}/${service}/`;
  const sections: GenSection[] = [
    { id: 's-scope', n: '01', h2: `${region.name} 출장 범위와 지역 특성`, paras: [region.profile, region.access] },
    { id: 's-service', n: '02', h2: `${region.short} ${B.label} 안내`, paras: [fill(pick(PARTS_NOTES[service], 25), m)] },
    { id: 's-sym', n: '03', h2: service === 'install' ? '설치 전 확인할 안내' : '수리 접수에 필요한 안내' },
    { id: 's-site', n: '04', h2: `${region.name} 주요 생활권`, items: region.zones },
    ...(service === 'repair' ? [{ id: 's-parts', n: '04-1', h2: `${region.short} 자동문 센서·모터·컨트롤러 수리` }] : []),
    { id: 's-cost', n: '07', h2: '비용 조건과 준비물', paras: [service === 'install'
      ? '확정 견적은 출입구를 실측한 뒤 안내합니다. 기존 문 철거와 바닥 복구가 필요한지도 함께 확인하세요.'
      : '증상과 모델을 확인한 뒤 필요한 점검과 교체 부품을 안내합니다. 비용은 작업 전에 확인할 수 있어요.'] },
    ...(service === 'install' ? [] : [{ id: 's-safe', n: '08', h2: '방문 전 안전 확인', paras: [pick(SAFETY, 17)] }]),
    { id: 's-case', n: '09', h2: `${region.short} 시공사례` },
    { id: 's-faq', n: '10', h2: `${region.short} ${B.label} 자주 묻는 질문` },
    { id: 's-near', n: '11', h2: '같은 시·도 출장 지역과 서비스' },
  ];
  return {
    pageId, rid, province: region.province, service, path,
    h1: `${region.short} ${B.label}`, title: fill(pick(TITLE_FRAMES, 19), m), description: service === 'install' ? `${region.name} ${B.label}. ${locations} 등 출장 범위와 출입구 실측, 기존 문 철거 범위, 설치 견적 준비를 확인하세요.` : `${region.name} ${B.label}. ${locations} 등 출장 범위와 현장 점검, 부품 교체 판단 및 상담 준비물을 확인하세요.`,
    lead, region, label: B.label, noun: B.noun, icon: B.icon, aliases, sections, related: B.related,
  };
}

export const allRegionPages = (): GeneratedPage[] => REGIONS.flatMap((r) => SERVICE_IDS.map((s) => composeRegionPage(r.rid, s)!));
export function regionPageByPath(path: string) {
  const match = /^\/areas\/(seoul|gyeonggi)\/(r\d\d)\/([a-z-]+)\/$/.exec(path);
  if (!match || !SERVICE_IDS.includes(match[3] as ServiceId)) return null;
  const page = composeRegionPage(match[2], match[3] as ServiceId);
  return page?.path === path ? page : null;
}
/** 생성 본문 글자 수(검수용) */
export const pageChars = (g: GeneratedPage) => [g.lead, ...g.sections.flatMap((s) => [...(s.paras || []), ...(s.items || []), ...(s.steps || []).map((x) => x.t + x.d), ...(s.cards || []).map((x) => x.t + x.d), ...(s.faq || []).map((x) => x.q + x.a), ...(s.symptoms || []).map((x) => x.t + x.cause + x.action)])].join('').length;
