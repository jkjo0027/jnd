/**
 * 운영자 본문 형식(마크업 지식 불필요):
 *  - 빈 줄로 문단을 나눈다
 *  - "## " 로 시작하는 줄은 소제목
 *  - "- " 로 시작하는 연속된 줄은 목록
 * 공개 화면·미리보기·중복 검사가 같은 파서를 쓴다. HTML 은 받지 않는다(태그는 글자로 표시).
 */
export type Block = { t: 'h2'; text: string } | { t: 'p'; text: string } | { t: 'ul'; items: string[] };

export function parseBody(src: string): Block[] {
  const out: Block[] = [];
  const lines = (src || '').replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) { out.push({ t: 'p', text: para.join(' ').trim() }); para = []; }
    if (list.length) { out.push({ t: 'ul', items: list }); list = []; }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^##\s+/.test(line)) { flush(); out.push({ t: 'h2', text: line.replace(/^##\s+/, '').trim() }); continue; }
    if (/^[-•·]\s+/.test(line)) { if (para.length) { out.push({ t: 'p', text: para.join(' ').trim() }); para = []; } list.push(line.replace(/^[-•·]\s+/, '').trim()); continue; }
    if (list.length) { out.push({ t: 'ul', items: list }); list = []; }
    para.push(line);
  }
  flush();
  return out.filter((b) => (b.t === 'ul' ? b.items.length > 0 : b.text.length > 0));
}

/** 본문을 평문으로 (중복 검사·글자 수·검색 설명 초안용) */
export function bodyText(src: string): string {
  return parseBody(src).map((b) => (b.t === 'ul' ? b.items.join(' ') : b.text)).join(' ').replace(/\s+/g, ' ').trim();
}

/** 유형별 입력란 정의 — 편집 화면의 설명·예시와 발행 전 필수 검사가 같은 표를 쓴다 */
export type PageType = 'case' | 'guide' | 'service' | 'region';
export type FieldDef = { key: string; label: string; hint: string; example: string; required: boolean; multiline?: boolean };
export const TYPE_LABEL: Record<PageType, string> = { case: '시공사례', guide: '증상 가이드', service: '서비스', region: '지역 서비스' };
export const TYPE_HUB: Record<PageType, string> = { case: '/cases/', guide: '/guides/', service: '/services/', region: '/areas/' };
export const FIELDS: Record<PageType, FieldDef[]> = {
  case: [
    { key: 'place', label: '현장 유형', hint: '상가·병원·아파트 공용현관처럼 유형만 적어요. 상호·상세 주소는 쓰지 않아요.', example: '수원 영통 상가 1층 출입문', required: true },
    { key: 'sym', label: '증상', hint: '고객이 말한 증상 그대로. 언제부터, 어떤 조건에서 그런지.', example: '닫히다가 다시 열리기를 반복, 저녁 시간대에 심함', required: true },
    { key: 'check', label: '확인한 원인', hint: '현장에서 계측·확인한 사실만. 추정이면 "추정"이라고 써요.', example: '안전센서 수광부 렌즈 오염 + 간판 조명 반사로 재감지', required: true, multiline: true },
    { key: 'act', label: '실제 조치', hint: '교체·조정한 부품과 작업 내용.', example: '렌즈 청소 후에도 오동작 → 안전센서 1조 교체, 감도·각도 재설정', required: true, multiline: true },
    { key: 'res', label: '작동 확인 결과', hint: '작업 후 확인한 동작과 안내한 내용.', example: '20회 개폐 시험 정상, 야간 재방문 없이 전화 확인으로 마감', required: true, multiline: true },
  ],
  guide: [
    { key: 'answer', label: '바로 답하는 한 문단', hint: '질문에 대한 답을 먼저. 누구에게 해당하는지 포함.', example: '상가 자동문이 닫히다 다시 열리면 대부분 안전센서가 무언가를 감지한 거예요. 센서 앞 매트·입간판을 먼저 치워 보세요.', required: true, multiline: true },
    { key: 'safe', label: '안전하게 볼 수 있는 항목', hint: '전기·구동부를 열지 않고 눈으로 확인할 수 있는 것만. 한 줄에 하나(- 로 시작).', example: '- 센서 앞 장애물\n- 렌즈 오염\n- 바닥 레일 이물질', required: true, multiline: true },
    { key: 'stop', label: '여기서 멈추고 연락할 기준', hint: '사용을 멈춰야 하는 신호.', example: '문이 쾅 닫히거나 유리에 금이 보이면 사용을 멈추고 연락', required: true, multiline: true },
    { key: 'pro', label: '전문가가 하는 진단', hint: '기사가 계측·교체로 처리하는 부분.', example: '센서 신호 계측, 컨트롤러 설정값 확인, 필요 시 센서 교체', required: true, multiline: true },
  ],
  service: [
    { key: 'scope', label: '작업 범위', hint: '한 줄에 하나(- 로 시작).', example: '- 센서 계측·교체\n- 감도·각도 설정', required: true, multiline: true },
    { key: 'decision', label: '수리와 교체 판단', hint: '어떤 경우 조정으로 끝나고 어떤 경우 교체하는지.', example: '렌즈 청소·각도 조정으로 정상이면 조정, 계측값이 기준 밖이면 교체', required: true, multiline: true },
    { key: 'quote', label: '견적 변수', hint: '비용에 영향을 주는 조건. 금액은 적지 않아요.', example: '부품 종류, 제조사 호환 여부, 문 높이(고소 작업)', required: true, multiline: true },
    { key: 'prepare', label: '문의 준비물', hint: '고객이 알려주면 좋은 정보.', example: '기계함 스티커 사진, 증상 시작 시점', required: true, multiline: true },
  ],
  region: [
    { key: 'coverage', label: '실제 출장 범위', hint: '이 지역에서 실제로 출장하는 범위(읍·면·동).', example: '진위면·서탄면·송탄 전역, 고덕신도시', required: true },
    { key: 'evidence', label: '이 지역 작업 근거', hint: '이 지역에서 한 작업 기록·사진·사례(날짜·현장 유형). 없으면 발행하지 않아요.', example: '2026-10 고덕 상가 센서 교체 1건(사진 3장), 2026-09 송탄 공용현관 모터 교체', required: true, multiline: true },
  ],
};
/** 발행 전 체크리스트(15장 글쓰기 가이드 요약) — 편집 화면에 접어서 표시 */
export const WRITING_GUIDE: { h: string; items: string[] }[] = [
  { h: '제목과 첫 문단', items: ['한 글에서 한 질문에 답해요. 제목에는 실제 증상 또는 서비스와, 구분에 필요한 지역만 자연스럽게.', '좋은 예: "수원 상가 자동문이 닫히다 다시 열릴 때 확인할 점"', '나쁜 예: "수원자동문 수원자동문수리 자동문고장 최저가" (같은 말 반복)', '요약(첫 문단)에서 누구에게 해당하는지와 확인할 수 있는 답을 바로 알려줘요.'] },
  { h: '본문 구성', items: ['사례: 현장 유형·증상 → 확인한 원인 → 실제 조치 → 작동 확인 결과', '가이드: 상황 구분 → 안전하게 볼 수 있는 항목 → 전문가에게 알려줄 사항', '서비스: 작업 범위 → 수리·교체 판단 → 견적 변수 → 문의 준비물', '지역 서비스: 실제 출장 범위와 이 지역 작업 근거를 먼저'] },
  { h: '사진과 링크', items: ['사진마다 실제로 보이는 내용을 설명에 써요. 예: "상가 출입문 상단 안전센서 점검 모습"', '같은 키워드를 사진마다 반복하지 않아요. 핵심 작업 내용은 본문에도 적어요.', '관련 페이지는 목적지가 드러나게 골라요(예: 자동문 센서 점검 범위).'] },
  { h: '발행 전 확인', items: ['확인되지 않은 가격·보증·출동 시간은 쓰지 않아요.', '글자 수·사진 수·키워드 밀도는 순위 공식이 아니에요. 필요한 만큼만.', '비슷한 글이 이미 있으면 새 글 대신 기존 글을 보강하는 게 나을 수 있어요.'] },
];
