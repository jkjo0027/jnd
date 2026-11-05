import ledgerJson from '../../data/registry/publication-ledger.json';
import aliasesJson from '../../data/registry/area-aliases.json';
import candJson from '../../data/registry/candidate-pages.json';
import opsJson from '../../data/ops/config.json';

export type LedgerStatus = 'candidate' | 'evidence_ready' | 'review' | 'approved' | 'published' | 'hold' | 'merged' | 'retired';
/** 품질 감사 상태 체계. PUBLISHED + indexEligibility 만 공개 빌드·사이트맵에 포함 */
export type ContentStatus = 'DRAFT' | 'REVIEW_REQUIRED' | 'VERIFIED' | 'PUBLISHED' | 'HOLD';
export type QualityClass = 'A' | 'B' | 'C' | 'D';
export type LedgerRecord = {
  pageId: string; type: string; sourceRows: string[]; primaryIntent: string; aliases: string[]; path: string; parent: string | null;
  relatedIds: string[]; coverageEvidence: string; evidenceIds: string[]; status: LedgerStatus; reviewer: string | null; reviewedAt: string | null;
  publishedAt: string | null; updatedAt: string; indexPolicy: 'index' | 'noindex'; mergeTarget: string | null; notes?: string;
  qualityClass?: QualityClass; contentStatus?: ContentStatus; indexEligibility?: boolean; serviceVerified?: boolean; serviceAreaVerified?: boolean;
  evidenceRefs?: string[]; technicalReviewed?: boolean; lastHumanReviewedAt?: string | null; contentOwner?: string; finalPath?: string;
  reviewNotes?: { audit?: string; why?: string; manual?: { cls?: QualityClass; status?: ContentStatus; note: string } };
};
export type Candidate = (typeof candJson)['pages'][number];
export type BaseRegion = { regionId: string; province: 'seoul' | 'gyeonggi'; name: string; label: string; sheetRow: number };
export type Alias = { alias: string; aliasKey: string; label: string; regionId: string | null; province: string; kind: string; parent?: string };

export const ops = opsJson;
export const ledger = ledgerJson.records as LedgerRecord[];
export const candidates = candJson.pages as Candidate[];
export const baseRegions = aliasesJson.baseRegions as BaseRegion[];
export const aliases = aliasesJson.aliases as Alias[];

/** CONTENT_GATE: strict(운영 기본) | preview(디자인 대조·내부 QA 전용) */
export const GATE: 'strict' | 'preview' = process.env.CONTENT_GATE === 'preview' ? 'preview' : 'strict';
export const isPreview = GATE === 'preview';

const byPath = new Map(ledger.map((r) => [r.path, r]));
const byId = new Map(ledger.map((r) => [r.pageId, r]));
export const recordByPath = (p: string) => byPath.get(p);
export const recordById = (id: string) => byId.get(id);

/** 공개 빌드 포함 여부: contentStatus=PUBLISHED 이고 indexEligibility=true (품질 감사 이후 기준). 구 status 필드는 참고용 */
export const isPublic = (r?: LedgerRecord | null) => !!r && r.contentStatus === 'PUBLISHED' && r.indexEligibility === true;
/** 보호된 미리보기에서 열람 가능한 초안·보류 페이지 */
export const isDraft = (r?: LedgerRecord | null) => !!r && !isPublic(r) && (r.contentStatus === 'DRAFT' || r.contentStatus === 'REVIEW_REQUIRED' || r.contentStatus === 'VERIFIED' || r.contentStatus === 'HOLD');
/** 통합(C) 페이지의 대표 URL — 보류 페이지에서 301 대상으로 사용 */
export const mergeTargetOf = (p: string) => { const r = byPath.get(p); return r && !isPublic(r) && r.mergeTarget ? r.mergeTarget : null; };
export const publicRecords = () => ledger.filter((r) => isPublic(r) && r.indexPolicy === 'index');
export const publicPaths = () => publicRecords().map((r) => r.path);
export const isPublicPath = (p: string) => isPublic(byPath.get(p));

export const regionById = (rid: string) => baseRegions.find((b) => b.regionId === rid);
export const regionsOf = (province: 'seoul' | 'gyeonggi') => baseRegions.filter((b) => b.province === province);
export const aliasesOf = (rid: string) => aliases.filter((a) => a.regionId === rid);
export const candidateByPath = (p: string) => candidates.find((c) => c.candidatePath === p);

/** 지역 상세 상담번호 고정 배정: 시작 7, h = h*31 + charCode (uint32), 번호 수로 나머지 */
export const pinIndex = (key: string, n: number) => {
  let h = 7;
  for (const ch of Array.from(key)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return h % n;
};
