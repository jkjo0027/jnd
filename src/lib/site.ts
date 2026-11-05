// 운영 호스트·대표 NAP 는 이 파일 한 곳에서만 관리한다.
export const SITE_URL = 'https://jndsystem.kr';
export const SITE_HOST = 'jndsystem.kr';
export const BRAND = '제이앤디시스템';
export const BRAND_EN = 'J&D SYSTEM';
export const SUB_BRAND = '스피드자동문';

/** 법인 대표번호 — 구조화 데이터·푸터·초기 HTML 의 기본 번호. 변경 시 docs/owner-approvals.md 근거 갱신 */
export const MAIN_PHONE = '1661-3088';
/** 상담 순환 후보 (운영자 회신 PPTX 04 추가사항). 수신 테스트 확인 전에는 ops.phonesVerified=false → 대표번호만 노출 */
export const CONSULT_PHONES = ['1661-3088', '1661-5863', '1661-6878'] as const;
/** 사진 견적 문자 수신 휴대폰 (기존 사이트·시안). 업무용 알림 번호(010-6227-8644)와 분리한다 */
export const SMS_PHONE = '010-8804-1555';

/** 사업자등록증(평택세무서 2021-03-10 발급, 운영자 제공 2026-11-05)과 대조한 값. 등록증 이미지는 저장소·공개 번들에 넣지 않는다 */
export const INFO = {
  ceo: '김동훈 · 김준오 (공동사업자)',
  open: '2018. 01. 16',
  type: '제조·도소매·서비스 (자동문 설치, 기계·장비 수리)',
  bizType: '제조업 · 도매 및 소매업 · 서비스업',
  bizItems: '그 외 기타 전기장비 제조업 · 전자상거래업 · 기타 일반 기계 및 장비 수리업 · 자동문설치',
  bizKind: '일반과세자',
  biz: '619-64-00198',
  addr: '경기도 평택시 진위면 진위2산단로 140, 4층 421호 (더퍼스트타워 평택)',
  addrShort: '경기 평택',
  hours: '평일 08:00–18:00 (주말·공휴일 휴무)',
  privacyOfficer: '김동훈 · 김준오 (공동사업자)',
  agencies: '27',
  fee: '사진 확인 후 안내',
  email: 'post8642@naver.com',
  fax: '031-375-0118',
  since: '2018',
  mall: 'jndmall.co.kr',
} as const;

export const ROTATE_SEC = 2.5;
export const DOOR_INTRO_MS = 700;
export const LOOP_TOTAL = 18.5;
export const STILL_FRAME = 17.2;

export const abs = (path: string) => (path.startsWith('/') ? SITE_URL + path : path);
