export type SymptomBlock = { t: string; cause: string[]; action: string[]; icon: string };
export type FaqTpl = { q: string[]; a: string[] };
export type ServiceBlocks = {
  id: string; label: string; noun: string; icon: string;
  /** 서비스 소개 (변형) */
  intro: string[];
  /** 작업 범위 소개 문단(변형) + 항목 */
  scopeIntro: string[]; scopeItems: string[];
  symptomsIntro: string[]; symptoms: SymptomBlock[];
  procIntro: string[]; proc: { t: string; d: string[] }[];
  decisionIntro: string[]; decision: { t: string; d: string[] }[];
  costIntro: string[]; costItems: string[];
  faq: FaqTpl[];
  /** 관련 핵심 서비스 경로 */
  related: string[];
};
