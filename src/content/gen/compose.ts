import { SEOUL } from './regions-seoul';
import { GYEONGGI } from './regions-gyeonggi';
import { REPAIR } from './blocks-repair';
import { INSTALL } from './blocks-install';
import { SENSOR } from './blocks-sensor';
import { MOTOR } from './blocks-motor';
import { GLASS } from './blocks-glass';
import { TAG_PARAS, SAFETY, PREP, LEAD_FRAMES, COVERAGE_FRAMES, CLOSINGS, VISIT_FLOW } from './blocks-common';
import type { ServiceBlocks } from './blocks-types';
import type { RegionFact, Tag } from './types';
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

/** 서비스 × 권역 문장 — 페이지마다 다른 권역 이름이 들어가 고유 문장이 된다 */
const ZONE_NOTES: Record<ServiceId, string[]> = {
  repair: ['{zone} 쪽 현장은 출입이 잦은 만큼 센서·스위치 신호 불량과 롤러 마모가 먼저 나타나요. 증상이 시작된 시점을 알려 주시면 원인을 빨리 좁혀요.', '{zone}처럼 사람이 몰리는 곳의 자동문은 고장이 바로 불편으로 이어져요. 임시 통행 조치를 먼저 하고 부품을 교체하는 순서로 대응해요.', '{zone} 일대의 자동문은 설치 연수와 제조사가 제각각이라 모델명을 확인한 뒤 호환 부품을 챙겨 방문해요.', '{zone} 현장은 관리실·시설팀과 작업 시간을 조율하면 한 번 방문으로 끝나는 경우가 많아요.'],
  install: ['{zone} 쪽 신규 매장·사무실은 인테리어 공정에 맞춰 실측·발주 시점을 잡으면 설치가 매끄러워요.', '{zone} 일대는 출입구 폭과 벽 여유가 다양해 편개·양개 중 현장에 맞는 방식을 실측 때 제안해요.', '{zone}의 기존 건물은 여닫이 유리문·강화도어를 자동문으로 바꾸는 교체 공사가 많아 철거·마감까지 한 번에 진행해요.', '{zone} 현장은 프레임 색상과 유리 사양을 주변 매장·간판과 맞추는 상담이 함께 들어와요.'],
  sensor: ['{zone} 쪽은 간판 조명·유리 반사가 많아 감지센서 각도와 감도를 현장 조건에 맞추는 작업이 중요해요.', '{zone} 일대의 양개형 자동문은 안전센서가 양쪽에 있어 좌우를 따로 계측해 불량 쪽만 교체해요.', '{zone} 현장은 출입이 잦아 렌즈 오염이 빨라요. 청소·조정으로 끝나는 경우와 교체가 필요한 경우를 계측으로 나눠요.', '{zone}처럼 사람이 몰리는 곳은 안전센서 감지 범위를 대기 공간과 분리해 불필요한 재열림을 줄여요.'],
  motor: ['{zone} 쪽 자동문은 하루 개폐 횟수가 많아 모터 출력 저하와 컨트롤러 노후가 함께 오는 경우가 있어요. 두 가지 견적을 비교해 드려요.', '{zone} 일대의 노후 건물은 단종 컨트롤러가 남아 있어 호환 부품 수급을 먼저 확인하고 방문해요.', '{zone} 현장에서 쾅 닫힘·저절로 열림이 보이면 사용을 줄이고 빠른 점검 일정을 잡아요.', '{zone}의 대형 양개형 자동문은 모터 출력(W)과 문 무게를 맞춰 교체해야 반복 고장이 없어요.'],
  'glass-door': ['{zone} 쪽 상가의 강화도어는 출입이 잦아 플로어힌지 마모가 빨라요. 힌지 규격을 확인해 교체해요.', '{zone} 일대의 무거운 강화도어는 어르신·손님 불편이 커 편개형 자동문 교체 상담이 함께 들어와요.', '{zone} 현장은 문 처짐·바닥 끌림이 보이면 유리 파손 전에 힌지를 점검하는 게 좋아요.', '{zone}의 강화도어 잠금 불량은 대부분 처짐에서 오므로 수평 조정과 잠금 장치를 함께 봐요.'],
};
/** 서비스별 부품·제조사 안내 — {r} 지역 */
const PARTS_NOTES: Record<ServiceId, string[]> = {
  repair: ['{r} 현장에서 쓰는 교체 부품은 자체 브랜드 스피드자동문(SD-2000 컨트롤러·모터·스위치, 안전센서 TC-R, 상부센서 TC-500)과 현대·태성·우성·태양·H&T코리아·미래·건일·토토·스위코·태광 등 국내 제조사 호환품이에요. 기계함 스티커의 제조사·모델명을 알려 주시면 맞는 부품을 챙겨요.', '교체 부품은 기존 문과 호환되는 제품으로 골라요. {r}에서 많이 보이는 국내 제조사(현대·태성·우성·태양 등) 자동문은 센서·스위치·컨트롤러 호환품을 준비하고, 자체 브랜드 스피드자동문은 전 부품을 바로 수급해요.', '{r} 수리에 들어가는 부품은 작업 전에 어떤 제품인지 설명드려요. 스피드자동문 SD 시리즈 스위치(유·무선 16종), TC 계열 센서, 글로넥스 카드리더기·데드볼트 등 취급 품목과 국내 제조사 호환품을 함께 다뤄요.', '부품 수급이 안 되는 단종 모델은 {r} 현장에서 오퍼레이터 교체 견적을 함께 안내해요. 그 외에는 센서·스위치·컨트롤러·모터·롤러 등 부품 단위로 호환품을 교체해요.', '{r} 출장 때는 사진으로 확인한 제조사·모델에 맞춰 센서·스위치·컨트롤러·롤러 등 후보 부품을 미리 챙겨 한 번에 처리하도록 준비해요. 스피드자동문 자체 부품과 국내 제조사 호환품 모두 가능해요.'],
  install: ['{r} 설치에는 자체 브랜드 스피드자동문 SD-2000 오퍼레이터(편개형·양개형)를 기본으로 쓰고, 프레임은 스테인리스 헤어라인·블랙·알루미늄 중 현장에 맞춰요. 유리는 강화유리 12T(고정창 8T)를 기본으로 상담해요.', '설치 자재는 실측 치수로 제작해요. {r} 현장의 프레임 재질·색상, 유리 두께, 스위치(유선·무선·장애인용), 센서(상부·안전), 번호키·카드리더기까지 한 번에 정하면 발주가 빨라요.', '{r} 설치 상담 때 정하는 사양은 오퍼레이터(SD-2000 편개·양개), 프레임(스테인리스·알루미늄), 유리(12T·8T), 스위치·센서·출입통제 장치예요. 샘플을 보고 고르실 수 있어요.', '{r}의 기존 건물 교체 공사는 기존 프레임 재사용 가능 여부를 먼저 봐요. 재사용이 가능하면 오퍼레이터·도어만 교체해 비용을 줄이고, 아니면 프레임부터 새로 제작해요.', '설치 후 1년 무상 A/S 는 오퍼레이터·센서·스위치 등 설치 품목에 적용돼요. {r} 현장은 설치 기록을 남겨 두고 같은 담당 기사가 A/S 를 맡아요.'],
  sensor: ['{r} 센서 교체에는 안전센서 TC-R 세트, 상부센서 TC-500 등 취급 품목과 현대·태성·우성 등 국내 제조사 호환 센서를 써요. 제조사·모델명과 센서 위치 사진을 보내 주시면 맞는 센서를 챙겨요.', '센서는 제조사별 커넥터·전압이 달라 호환품을 정확히 골라야 해요. {r} 현장에서는 기존 센서 사양을 확인한 뒤 TC 계열 또는 제조사 호환 센서로 교체해요.', '{r} 현장에서 감지센서·안전센서를 교체할 때는 설치 각도와 감도까지 현장 조건(햇빛·조명·매트)에 맞춰 다시 잡아요. 부품만 바꾸고 설정을 안 맞추면 오동작이 남아요.', '비접촉이 필요한 {r} 병원·식품 매장에는 노터치 근접센서(PS-100 등)와 감지센서 방식을 제안해요. 기존 자동문과 연동 설치가 가능해요.', '{r} 센서 수리에 쓰는 부품은 작업 전에 보여 드려요. 렌즈만 교체 가능한 모델은 렌즈만, 아니면 센서 본체를 교체하고 설정값을 안내해요.'],
  motor: ['{r} 컨트롤러·모터 교체에는 자체 브랜드 스피드자동문 SD-2000 컨트롤러와 모터(90W)를 바로 쓸 수 있고, 국내 제조사 제품은 모델명으로 호환 부품을 확인해 방문해요.', '컨트롤러는 제조사별로 호환이 제한돼요. {r} 현장에서는 기계함 스티커의 모델명을 확인하고 호환 컨트롤러·모터를 준비하며, 없으면 오퍼레이터 교체 견적을 함께 드려요.', '{r} 현장에서 모터를 교체할 때는 문 무게·폭에 맞는 출력(W)을 골라요. 출력이 모자라면 느리고, 과하면 충격이 커져요. 교체 후 속도·감속·위치 설정을 다시 잡아요.', '컨트롤러 교체 후에는 비상배터리·소방 연동 설정이 유지되는지 확인해요. {r}의 사무실·공용현관처럼 출입통제와 연동된 문은 연동 시험까지 해요.', '{r} 노후 오퍼레이터는 모터·컨트롤러·벨트·롤러를 함께 교체하는 기계 교체와 부품 단품 교체 두 가지 견적을 비교해 드려요. 프레임·유리는 살려요.'],
  'glass-door': ['{r} 강화도어 수리에는 문 무게·폭에 맞는 규격의 플로어힌지와 상부 피벗·패치, 글로넥스 데드볼트 같은 잠금 장치를 써요. 힌지 부위 사진으로 규격을 미리 확인해요.', '플로어힌지는 규격이 맞아야 해요. {r} 현장에서는 문 치수·유리 두께로 무게를 가늠해 맞는 힌지를 고르고, 매립 케이스 상태를 함께 봐요.', '{r}의 강화도어를 자동문으로 바꾸는 공사는 스피드자동문 SD-2000 편개형 오퍼레이터와 스테인리스 프레임을 기본으로 해요. 기존 힌지 자리는 스테인리스 판으로 덮어 마감해요.', '강화도어 잠금 장치는 처짐을 먼저 잡은 뒤 교체해요. {r} 상가의 야간 잠금은 데드볼트·번호키 연동도 함께 검토해요.', '{r} 강화도어 수리 부품은 작업 전에 어떤 규격인지 설명드려요. 힌지·피벗·잠금 장치 모두 호환 규격으로 준비해요.'],
};
/** 계절·환경 포인트 — {r} */
const ENV_NOTES = [
  '{r}의 겨울철에는 결로와 낮은 기온으로 센서 오동작과 무선 스위치 배터리 저하가 늘고, 여름 장마철에는 빗물·습기로 렌즈 오염이 잦아요. 계절이 바뀌기 전 점검하면 성수기 고장을 줄여요.',
  '{r} 현장은 계절에 따라 고장 양상이 달라요. 봄·가을 황사·꽃가루는 센서 렌즈를, 여름 습기는 배선 접촉을, 겨울 결로는 감지 정확도를 떨어뜨려요. 증상이 특정 계절에 반복되면 환경 요인을 먼저 봐요.',
  '강풍이 잦은 날 문이 저절로 열리거나 닫히지 않으면 센서가 바람에 흔들리는 간판·현수막을 감지하는 경우가 있어요. {r}에서 특정 날씨에만 증상이 나면 사진과 함께 알려 주세요.',
  '{r}처럼 출입이 많은 현장은 여름 냉방·겨울 난방 손실을 줄이려고 대기시간을 짧게 잡는데, 너무 짧으면 사람이 지나는 중에 닫히려 해 안전센서가 자주 걸려요. 계절별로 대기시간을 조정해요.',
  '장마철 바닥 물기와 겨울 눈·얼음은 하부 레일에 이물질과 부식을 남겨요. {r} 현장에서는 레일 청소와 롤러 상태를 계절 전후로 점검하는 걸 권해요.',
];
/** 권역별 현장 메모 — {zone} 이름이 들어가 페이지마다 고유 문장이 된다 */
const ZONE_LINE: Record<ServiceId, string[]> = {
  repair: ['{zone}: 출입 빈도가 높은 문은 센서 렌즈와 롤러 상태를 먼저 봐요.', '{zone}: 노후 문이 많으면 컨트롤러·모터 호환 부품을 미리 확인해요.', '{zone}: 관리실·시설팀과 작업 시간을 조율하면 한 번에 끝나요.', '{zone}: 영업 중 고장은 임시 통행 확보 후 부품 교체 순서로 대응해요.'],
  install: ['{zone}: 신규 매장은 인테리어 공정에 맞춰 실측 시점을 잡아요.', '{zone}: 기존 문 교체는 철거·힌지 자리 마감까지 포함해 견적해요.', '{zone}: 출입구 폭과 벽 여유로 편개·양개를 제안해요.', '{zone}: 간판·조명 위치를 보고 센서 각도를 설계해요.'],
  sensor: ['{zone}: 간판·유리 반사가 있으면 감지센서 각도를 보수적으로 잡아요.', '{zone}: 양개형은 좌우 안전센서를 따로 계측해요.', '{zone}: 먼지가 많은 환경은 렌즈 점검 주기를 짧게 둬요.', '{zone}: 대기 공간과 감지 범위가 겹치지 않게 조정해요.'],
  motor: ['{zone}: 개폐 횟수가 많은 문은 모터 출력 저하를 먼저 계측해요.', '{zone}: 단종 모델이 있으면 호환 컨트롤러 수급을 미리 확인해요.', '{zone}: 쾅 닫힘·저절로 열림은 사용을 줄이고 빠른 일정을 잡아요.', '{zone}: 교체 후 속도·감속 설정을 통행 패턴에 맞춰요.'],
  'glass-door': ['{zone}: 출입이 많은 강화도어는 힌지 마모가 빨라 간격을 자주 봐요.', '{zone}: 무거운 문은 편개형 자동문 교체도 함께 비교해요.', '{zone}: 잠금 불량은 처짐을 먼저 잡은 뒤 조정해요.', '{zone}: 유리 모서리 손상이 보이면 사용을 멈추고 연락 주세요.'],
};
const TAG_WORD: Record<Tag, string> = { office: '오피스·업무시설', commercial: '상가·매장', apartment: '아파트 공용현관', villa: '빌라·다세대 현관', factory: '공장·제조시설', hospital: '병원·의원', school: '학원·교육시설', rural: '읍·면 관공서·카페', tourism: '관광지 음식점·숙박', newtown: '신도시 상가', logistics: '물류·유통 시설', hotel: '호텔·숙박', church: '교회·종교시설' };
/** 권역 × 건물 유형 조합 문단 — 지역마다 권역·유형이 달라 고유 문장이 된다 */
const COMBO_FRAMES = [
  '{r}에서 {svc} 문의가 들어오는 현장을 유형별로 보면 {zone1}의 {w1}, {zone2}의 {w2}, 그리고 {w3} 순이에요. 유형마다 문 방식과 고장 양상이 달라 방문 전 사진으로 어떤 현장인지 확인하면 준비가 빨라요.',
  '{zone1}에는 {w1}이 많고 {zone2}에는 {w2}이 주를 이뤄요. {r}의 {w3}까지 포함하면 자동문 종류가 편개·양개·출입통제 연동형으로 고루 섞여 있어, {svc}는 현장 유형에 맞춰 점검 순서를 달리해요.',
  '{r} {svc} 출장에서 자주 가는 곳은 {zone1}({w1})과 {zone2}({w2})예요. {w3}도 꾸준히 있어요. 같은 증상이라도 {w1}과 {w2}는 사용 패턴이 달라 원인이 다른 경우가 많아요.',
  '{zone1}·{zone2}를 중심으로 {w1}, {w2}, {w3}의 자동문을 다뤄요. {r}는 유형이 다양한 편이라 제조사·모델명과 함께 현장 유형을 알려 주시면 {svc} 준비가 정확해져요.',
];
const NEAR_FRAMES = [
  '{r}와 가까운 {n1}·{n2}도 같은 날 묶어 방문하는 경우가 많아 일정 조율이 수월해요.',
  '인접한 {n1}, {n2} 지역과 함께 출장 일정을 잡으면 더 빠른 날짜를 안내할 수 있어요.',
  '{n1}·{n2} 등 이웃 지역 현장과 동선을 묶어 {r} 방문 시간을 앞당기기도 해요.',
  '{r} 주변의 {n1}, {n2} 현장을 함께 도는 날에는 당일 방문이 가능한 경우가 있어요.',
];
/** 지역 수리 페이지 전용: 센서·모터·컨트롤러 절 — 통합 보류된 지역 센서/모터 페이지의 의도를 흡수 */
const PARTS_SECTION_INTRO = [
  '{r}에서 들어오는 수리 문의의 상당수는 센서·모터·컨트롤러 셋 중 하나로 좁혀져요. 부품마다 증상이 다르니 아래 기준으로 어느 쪽인지 먼저 가늠해 보세요. 정확한 판정은 현장 계측으로 해요.',
  '{r} 자동문 수리에서 센서, 모터, 컨트롤러는 따로 페이지를 두지 않고 여기서 함께 안내해요. 세 부품은 증상이 겹치는 경우가 많아 한 번 방문에서 같이 계측하는 편이 정확하고 비용도 덜 들어요.',
  '센서 수리, 모터 교체, 컨트롤러 교체는 {r} 현장에서 가장 자주 하는 부품 작업이에요. 증상으로 부품을 단정하기보다 신호·전압·동작 순서를 계측해 원인을 확정한 뒤 견적을 드려요.',
];
const PARTS_CARDS: { t: string; d: string[] }[] = [
  { t: '센서(감지·안전센서)', d: ['사람이 서 있어도 안 열리거나, 아무도 없는데 열렸다 닫혔다 하면 감지센서·안전센서를 먼저 봐요. 렌즈 오염·각도 틀어짐은 조정으로, 수광부 불량은 교체로 끝나요. 취급 품목은 안전센서 TC-R·상부센서 TC-500 과 국내 제조사 호환 센서예요.', '한쪽에서만 안 열리거나 밤에만 오동작하면 센서 쪽이에요. 조명·반사·매트 조건에 맞춰 감도와 각도를 다시 잡고, 계측값이 기준을 벗어나면 교체해요.'] },
  { t: '모터·구동부', d: ['문이 느리게 움직이거나 힘이 없고, 모터에서 윙 소리만 나면 모터 출력 저하 또는 벨트·롤러 마모예요. 문 무게·폭에 맞는 출력(W)으로 교체하고 속도·감속을 다시 설정해요. SD-2000 모터(90W)와 국내 제조사 호환 모터를 다뤄요.', '쾅 닫히거나 끝에서 튕기면 구동부 감속 설정·벨트 장력·모터 상태를 함께 봐요. 모터만 바꿔서 끝나는지, 오퍼레이터 교체가 나은지는 설치 연수와 부품 수급을 보고 두 견적을 비교해 드려요.'] },
  { t: '컨트롤러(제어기)', d: ['전원은 들어오는데 아무 반응이 없거나, 저절로 열리고 닫히는 동작이 불규칙하면 컨트롤러를 의심해요. 기계함 스티커의 모델명으로 호환 컨트롤러를 확인하고, 단종이면 오퍼레이터 교체 견적을 같이 안내해요.', '컨트롤러 교체 후에는 비상배터리·소방 연동·출입통제 연동이 그대로 유지되는지 시험해요. 설정값(대기시간·속도·개폐 폭)은 통행 패턴에 맞춰 다시 잡아요.'] },
];
/** 건물 관리자·시설팀이 신고 전에 확인하면 좋은 항목 — 지역 수리 페이지에만 */
const MANAGER_PRECHECK = [
  '관리사무소·시설팀에서 연락 주실 때는 ① 기계함 스티커의 제조사·모델명 ② 증상이 시작된 시점과 날씨·시간대 ③ 전원 차단기 위치 ④ 작업 가능한 시간대(입주민·영업 동선)를 알려 주시면 한 번 방문으로 끝나는 비율이 높아져요. 사진 두 장(문 전체·기계함 내부)이면 충분해요.',
  '건물 관리자라면 신고 전에 분전반 차단기, 센서 앞 장애물(화분·입간판·매트), 레일 이물질을 한 번만 확인해 주세요. 이 세 가지로 해결되는 경우가 있고, 아니라면 그 결과 자체가 원인 판정에 도움이 돼요. 방문 시간은 관리실 근무 시간과 맞춰 잡아요.',
  '{r}의 아파트·오피스 관리자분께는 자동문 고장 접수용 체크리스트를 권해요. 제조사·모델명, 설치 연도, 최근 수리 이력, 증상 발생 조건을 적어 두면 같은 문이 다시 고장 났을 때 판단이 빨라지고, 수리·교체 결정 근거로도 남아요.',
];
const DEFAULT_TAGS: Tag[] = ['commercial', 'apartment', 'office', 'villa', 'hospital'];
const DESC_FRAMES = [
  '{name} {label} 출장. {zone1}·{zone2} 등 {short} 전역 {noun}. 평택 본사 기사가 증상·사진 확인 후 부품을 챙겨 방문, 비용 먼저 안내. 평일 08:00–18:00.',
  '{short} 전 지역({dong1}·{dong2} 등) {label}. {zone1} 현장 특성에 맞춘 점검과 부품 교체, 설치 1년 무상 A/S. 전화 1661-3088.',
  '{zone1}·{zone2}를 포함한 {name} {label} 안내. 증상별 원인, 작업 절차, 수리·교체 판단 기준, 비용 조건과 {short} 출장 범위를 정리했습니다.',
  '{name}에서 {label}가 필요하면 사진 두 장으로 상담을 시작하세요. {dong1}·{dong2} 등 전역 출장, 원인 확인 후 비용 안내, 국내 제조사 자동문 모두 가능.',
  '{short} {label}: {zone1} 등 현장 유형별 점검 포인트, 자주 묻는 질문, 준비물까지. 평택 본사에서 {short} 당일 출장 상담.',
];
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
  const aliasNote = aliases.length ? pick([`${aliases.join('·')} 같은 생활권 표기도 모두 이 페이지에서 안내해요.`, `생활권 이름(${aliases.join(', ')})으로 찾으셔도 같은 지역이에요.`, `${aliases.slice(0, 3).join('·')}${aliases.length > 3 ? ' 등' : ''} 생활권은 따로 페이지를 두지 않고 여기서 함께 안내해요.`], 3) : '';
  const tagsAll: Tag[] = [...region.tags, ...DEFAULT_TAGS.filter((t) => !region.tags.includes(t))];
  const tags = rot(tagsAll, 4).slice(0, 5);
  const same = REGIONS.filter((x) => x.province === region.province && x.rid !== region.rid);
  const n1 = same[(ri + 1) % same.length], n2 = same[(ri + 5) % same.length];
  const combo = fill(pick(COMBO_FRAMES, 95), { ...m, w1: TAG_WORD[tagsAll[0]], w2: TAG_WORD[tagsAll[1] || tagsAll[0]], w3: TAG_WORD[tagsAll[2] || tagsAll[0]] });
  const nearP = fill(pick(NEAR_FRAMES, 96), { ...m, n1: n1.short, n2: n2.short });
  const zoneLines = region.zones.map((zn, i) => fill(ZONE_LINE[service][(mix(ri, si, 90 + i)) % ZONE_LINE[service].length], { zone: zn }));
  const pageId = `${rid.toUpperCase()}-${service}`;
  const path = `/areas/${region.province}/${rid}/${service}/`;
  const symptoms = rot(B.symptoms, 5).map((s, i) => ({ t: s.t, icon: s.icon, cause: pick(s.cause, 10 + i), action: pick(s.action, 20 + i) }));
  const faqs = rot(B.faq, 6).map((f, i) => ({ q: fill(pick(f.q, 30 + i), m), a: fill(pick(f.a, 40 + i), m) }));
  const sections: GenSection[] = [
    { id: 's-scope', n: '01', h2: `${region.name} 출장 범위와 지역 특성`, paras: [fill(pick(COVERAGE_FRAMES, 7), { ...m, alias: aliasNote }), region.profile, region.access, fill(pick(ZONE_NOTES[service], 8), m), fill(pick(ZONE_NOTES[service].filter((_, i) => i !== mix(ri, si, 8) % ZONE_NOTES[service].length), 23), { ...m, zone: m.zone2 }), fill(pick(ENV_NOTES, 24), m)] },
    { id: 's-service', n: '02', h2: `${region.short} ${B.label} 안내`, paras: [pick(B.intro, 9), fill(pick(PARTS_NOTES[service], 25), m), pick(B.scopeIntro, 11)], items: B.scopeItems },
    { id: 's-sym', n: '03', h2: '증상별 원인과 조치', paras: [pick(B.symptomsIntro, 12)], symptoms },
    { id: 's-site', n: '04', h2: `${region.short} 현장 유형별 포인트`, paras: [combo, ...tags.map((t: Tag, i) => fill(pick(TAG_PARAS[t], 50 + i), m))], items: zoneLines },
    ...(service === 'repair' ? [{ id: 's-parts', n: '04-1', h2: `${region.short} 자동문 센서·모터·컨트롤러 수리`, paras: [fill(pick(PARTS_SECTION_INTRO, 98), m), fill(pick(MANAGER_PRECHECK, 99), m)], cards: PARTS_CARDS.map((c, i) => ({ t: c.t, d: pick(c.d, 100 + i) })) }] : []),
    { id: 's-proc', n: '05', h2: '작업 절차', paras: [pick(B.procIntro, 13)], steps: B.proc.map((p, i) => ({ t: p.t, d: pick(p.d, 60 + i) })) },
    { id: 's-decide', n: '06', h2: '수리·교체 판단 기준', paras: [pick(B.decisionIntro, 14)], cards: B.decision.map((x, i) => ({ t: x.t, d: pick(x.d, 70 + i) })) },
    { id: 's-cost', n: '07', h2: '비용 조건과 준비물', paras: [pick(B.costIntro, 15)], items: B.costItems, steps: pick(PREP, 16).map((p, i) => ({ t: `${i + 1}`, d: p })) },
    { id: 's-safe', n: '08', h2: '안전하게 기다리는 법', paras: [pick(SAFETY, 17), fill(pick(VISIT_FLOW, 97), m)] },
    { id: 's-case', n: '09', h2: `${region.short} 시공사례` },
    { id: 's-faq', n: '10', h2: `${region.short} ${B.label} 자주 묻는 질문`, faq: faqs },
    { id: 's-near', n: '11', h2: '주변 지역·다른 서비스', paras: [nearP, fill(pick(CLOSINGS, 18), m)] },
  ];
  return {
    pageId, rid, province: region.province, service, path,
    h1: `${region.short} ${B.label}`, title: fill(pick(TITLE_FRAMES, 19), m), description: fill(pick(DESC_FRAMES, 21), m),
    lead: fill(pick(LEAD_FRAMES, 22), m), region, label: B.label, noun: B.noun, icon: B.icon, aliases, sections, related: B.related,
  };
}

export const allRegionPages = (): GeneratedPage[] => REGIONS.flatMap((r) => SERVICE_IDS.map((s) => composeRegionPage(r.rid, s)!));
export const regionPageByPath = (p: string) => { const m = p.match(/^\/areas\/(seoul|gyeonggi)\/(r\d\d)\/([a-z-]+)\/$/); return m && SERVICE_IDS.includes(m[3] as ServiceId) ? composeRegionPage(m[2], m[3] as ServiceId) : null; };
/** 생성 본문 글자 수(검수용) */
export const pageChars = (g: GeneratedPage) => [g.lead, ...g.sections.flatMap((s) => [...(s.paras || []), ...(s.items || []), ...(s.steps || []).map((x) => x.t + x.d), ...(s.cards || []).map((x) => x.t + x.d), ...(s.faq || []).map((x) => x.q + x.a), ...(s.symptoms || []).map((x) => x.t + x.cause + x.action)])].join('').length;
