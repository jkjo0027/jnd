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

/** 지역명으로 호환성이나 부품 수급을 추정하지 않는다. */
const PARTS_NOTES: Record<ServiceId,string> = {
  repair: '문이 움직이지 않는다고 곧바로 모터를 교체하지는 않습니다. 한쪽 스위치만 반응하지 않는지, 모든 출입 방법에서 같은 증상인지 구분해 주세요. 부품을 교체하기 전에는 확인한 고장 범위와 기존 장치에 맞는 모델을 견적에 명시해 달라고 요청하세요.',
  install: '설치 견적은 문이 이동할 공간과 실제 통행 폭을 구분해 실측합니다. 기존 문 철거, 프레임 제작, 바닥 복구, 센서·카드리더기 연결 중 어디까지 포함되는지 도면이나 현장 사진에 표시해 확인하세요.',
  sensor: '상부 감지센서와 통로의 안전센서는 역할이 다릅니다. 열리지 않는 증상과 닫히다 되열리는 증상을 구분해 알려 주세요. 기존 센서의 위치와 외부에서 읽을 수 있는 모델 표시로 교체 후보를 확인하며 호환 여부는 기사가 점검합니다.',
  motor: '구동부 전체를 교체하는 견적과 컨트롤러 또는 모터만 교체하는 견적의 범위를 비교하세요. 정지·감속 위치, 출입통제와 비상 연동의 복원 및 작업 후 시험이 포함됐는지도 확인합니다.',
  'glass-door': '강화유리문이 바닥에 닿거나 기울어 보이면 억지로 움직이지 마세요. 힌지·피벗과 프레임 상태를 기사가 확인한 뒤 기존 유리를 유지할 수 있는지와 교체할 부품의 범위를 설명합니다.',
};
const TITLE_FRAMES = [
  '{short} {label} | {zone1}·{zone2} 출장 | 제이앤디시스템',
  '{short} {label} | {dong1}·{dong2} 등 전 지역 | 제이앤디시스템',
  '{name} {label} | 증상별 점검·비용 안내 | 제이앤디시스템',
  '{short} {label} 출장 | {zone1} 현장 점검 | 제이앤디시스템',
  '{short} {label} | 출장 점검과 견적 | 제이앤디시스템',
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
    { id: 's-scope', n: '01', h2: `${region.name} 출장 범위와 지역 특성`, paras: [region.profile] },
    { id: 's-service', n: '02', h2: `${region.short} ${B.label} 안내`, paras: [PARTS_NOTES[service]] },
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
    h1: `${region.short} ${B.label}`, title: service === 'install' ? `${region.name} 자동문 설치 | 출입구 실측·설치 범위 | 제이앤디시스템` : fill(pick(TITLE_FRAMES, 19), m), description: service === 'install' ? `${region.name} ${B.label}. ${locations} 등 출장 범위와 출입구 실측, 기존 문 철거 범위, 설치 견적 준비를 확인하세요.` : `${region.name} ${B.label}. ${locations} 등 출장 범위와 현장 점검, 부품 교체 판단 및 상담 준비물을 확인하세요.`,
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
