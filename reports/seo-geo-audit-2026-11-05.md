# J&D SYSTEM SEO/GEO 고도화 — SEO/GEO 고도화 결과 보고 (2026-11-05)

기준 저장소 `samduck150906-lgtm/jnd`, 운영 호스트는 요구사항 명세에서 확정한 **https://jndsystem.kr/** 를 유지했다(2차 요구사항의 `jndsystem.co.kr` 표기는 기존 결정과 상충 — 운영자 확인 항목). 모든 수치는 이 저장소의 스크립트가 2026-11-05 로컬 운영 빌드(`next build` → `next start`)를 크롤해 만든 결과이며, 검색엔진 색인·노출 수치는 **콘솔 권한이 없어 측정하지 않았다**(추정치 없음).

## 1. 결과 요약

| 항목 | 기존 (884b6d4) | 변경 후 | 검증 상태 |
|---|---|---|---|
| 공개(색인 적합) URL | 331 (엑셀 후보 318 전수 발행) | **162** (A 48 · B 114) | `validate-registry` OK, 사이트맵 162 = 공개 162, 크롤 162/162 이슈 0 |
| 지역 페이지 | 280 발행(5 서비스 × 56) | 수리 56 + 설치 56 + 근거 있는 센서 1(금천)·모터 1(용산) = **114 발행** / 센서·모터 110 → 지역 수리 페이지로 308 통합(C) / 강화도어 56 → 404 보류(D) | 보류 URL 응답 정책 전수 확인(`merge-redirect` 0, `held-not-404` 0) |
| 강화도어 (미확인 서비스) | 57 발행 | 핵심 1 + 지역 56 + 가이드 2(G29·G30) = **60 보류(D)**, 발행 차단 규칙(fact-ledger) | 빌드 전 검증이 D 발행·미확인 서비스 발행을 거부 |
| 가이드 | 30 발행 | 28 발행(B) + 2 보류 | 평균 본문 4,742자, 고유 문장 비율 0.344 |
| 시공사례 | 3 공개 / 5 보류 | 동일(5 는 사진·고객사명 동의 대기 → REVIEW_REQUIRED) | — |
| 발행 대장 스키마 | status 8단계 | + `qualityClass`, `contentStatus`, `indexEligibility`, `serviceVerified`, `serviceAreaVerified`, `evidenceRefs`, `technicalReviewed`, `lastHumanReviewedAt`, `contentOwner`, `finalPath`, `mergeTarget`, `reviewNotes{why,metrics}` | `tests/registry.test.mjs` 10/10, 공개 게이트 `isPublic` 이 새 필드만 본다 |
| 사실 대장 | 없음 | `data/registry/fact-ledger.json` (서비스 7 · 출장권 · 주장 6 · 지역 근거 24 · 사업자등록증) | 등급 규칙의 유일한 입력 |
| 근거 없는 주장 | 지역 사실 문장에 "대리점이 있어/상담이 많아/수요가 꾸준" 등 | 제거. 서울 페이지 당일 출장 확약 제거(`seoulSafe`) | `seo-audit` `seoul-sameday-claim` 0, `unverified-claim` 0, `content-audit` 확약 검출 0 |
| 키워드 2,476개 | URL 단순 매핑 | 13 클러스터 + 구·시 단위 지역 축, 대표 URL(finalPath) 재배정 354개, 강화도어 124개 보류 | 카니벌라이제이션 0 (`reports/intent-audit.md`) |
| 내부 링크 | 서비스·가이드 → 전 지역 56개 나열 | 우선 지역(평택·수원·화성·용인)+근거 지역+광역 허브 | 고아 0, 4xx/5xx 0, 리디렉션 체인 0 |
| 구조화 데이터 | LocalBusiness(팩스·이메일 포함), Service, FAQPage, Breadcrumb | LocalBusiness 는 확인된 값만(팩스·이메일 제외, taxID 추가) + WebSite 추가 | 162 페이지 JSON-LD 파싱·@type·FAQ 비어있음 검사 0 이슈 |
| 사이트맵 lastmod | 소스 해시(지역 페이지는 생성기 변경을 못 봄) | 렌더링 본문 해시 기준, 보류 URL 제외 | `sitemap-lastmod` 불일치 0 |
| IndexNow | 없음 | 키 파일 라우트 + 변경분만 제출하는 스크립트(드라이런 기본, 로그·상태 파일) | 키 미발급 → 제출 0건(실행하지 않음) |
| 이미지 | alt 만 | `width/height` 속성 추가(CLS 보조) | 크롤 검사 `img-no-alt` 0 |
| 모바일 | 수동 확인 | 32 페이지 × 390/320px 자동 점검 | 가로 넘침·작은 글자 0 |
| 성능(lab) | 미측정 | 홈 LCP 268ms(390) / 336ms(1366), CLS 0~0.009, TTFB ≤13ms, 전송 0.9~2.3MB | **실험실 값**(로컬, 스로틀 없음). field(CrUX·콘솔) 아님 |
| 자동 검증 | 10 항목 | `npm run qa` 15 항목(레지스트리·타입·린트·테스트·SEO 크롤·중복·콘텐츠 품질·모바일 + 보류 정책·JSON-LD·lastmod·확약 문구) | 전부 통과(린트 경고 3, 오류 0) |
| 사업자 표시 | 대표 "공동대표", 업태·종목 없음 | 등록증 대조: 공동사업자, 업태·종목·과세 구분 추가 | 푸터 렌더링 확인(스크린샷), 이미지는 미저장 |

## 2. 300개 목표에 대한 판단

- "URL 300개 이상이 Google·Naver·Bing 에서 각각 90% 이상 실노출"은 **현재 근거로는 달성 불가**하다. 색인 적합 URL 이 162개이므로 90% 를 전부 채워도 146개가 상한이다.
- 331개를 그대로 두면 숫자는 맞지만, 57개는 **운영자가 취급을 확인하지 않은 서비스**이고 110개는 **지역 고유 내용이 지역 수리 페이지와 사실상 같은** 페이지였다. 요구사항 원칙(품질 우선, 지역명만 바꾼 URL 로 숫자 채우기 금지)에 따라 보류·통합했다.
- 다시 늘릴 수 있는 경로: 강화도어 취급 확인(+60), 시공사례 동의(+5), 지역별 실적 자료 확보 후 지역 센서·모터 페이지 선별 복원(근거 있는 지역만). 현재 운영자 확인 항목은 `docs/owner-approvals.md` #29~#34.

## 3. 콘텐츠 품질 감사 (P0)

측정: `npm run content:audit` — 공개 162 URL 의 렌더링 본문을 문장 단위로 비교(지역명 정규화).

| 그룹 | 평균 본문 | 고유 문장 비율 | 공통 문구 비율(10개 이상 페이지 공유) |
|---|---:|---:|---:|
| 지역 페이지 114 | 5,296자 | 0.107 | 0.790 |
| 가이드 28 | 4,742자 | 0.344 | 0.429 |
| 전체 162 | 4,857자 | 0.218 | 0.657 (3개 이상 공유 기준 0.741) |

솔직한 평가: 5-gram 유사도(쌍 최대 0.486, 평균 0.119, 근접 중복 0)는 낮지만, **지역 페이지는 문장의 약 79% 가 다른 지역 10곳 이상에도 나오는 변형 풀 문장**이다. 지역 고유 부분(동·권역·접근 동선·건물 유형·근거·주변 지역)은 실제 사실이지만 분량이 작다. 이는 변형 조합 생성 방식의 구조적 한계이며, 지역명만 바꾼 복제는 아니더라도 Google 의 doorway 판단 위험이 남는다. 그래서:

- 지역 페이지는 근거가 있는 28개만 A, 나머지 86개는 B("보강 후 발행 적합")로 두고 **보강 전까지 기술 검수 미완(`technicalReviewed=false`)** 상태를 대장에 남겼다. 보강 재료(출장 기록·현장 사진·지역 작업 메모)는 운영자만 줄 수 있다(#30).
- 통합 플레이북(`docs/release-and-rollback.md` 3-2): D+60 에 GSC 미색인이 지역 B 의 절반을 넘으면 광역 허브로 통합(C)한다. 판단 지표와 명령을 미리 적어 두었다.
- 샘플 수동 검토(12 URL): 홈·`/services/repair/`·`/services/install/`·`/guides/g01/`·`/guides/g17/`·`/areas/gyeonggi/r53/repair/`·`/areas/gyeonggi/r56/install/`·`/areas/seoul/r08/sensor/`·`/areas/seoul/r21/motor/`·`/areas/seoul/r01/install/`·`/areas/gyeonggi/r32/repair/`·`/areas/seoul/`. 결과: 사실 오류·가격·도착 시간 확약 없음. r32(군포) 수리처럼 근거 없는 B 페이지는 지역 사실 3문단 + 공통 블록 구성으로 "읽을 가치는 있으나 다른 지역과 구조가 같다"는 인상이 분명했다(고유 비율 0.064, 사이트 최저). 핵심 서비스 `repair` 와 부품 `switch` 는 공통 블록 의존으로 유사도 0.481 — 부품 특화 문단은 있으나 추가 분리가 바람직하다(차기).

## 4. 강화도어 영향 보고 (P0)

- 보류 URL 60개: `/services/glass-door/`, `/areas/{seoul|gyeonggi}/rNN/glass-door/` 56개, `/guides/g29/`, `/guides/g30/`. 키워드 124개(5.0%)가 대표 URL 없이 대기.
- 원인: 기존 사이트 배너의 "강화도어" 언급 외에 수리(힌지 교체·처짐 조정·잠금) 취급 근거가 없음. 사례 c8 은 강화도어 → 자동문 교체(설치)라 설치 페이지 근거로만 사용.
- 사용자 영향: 운영 배포 전이므로 외부 영향 없음. 내부 링크·사이트맵·구조화 데이터에서 제외됐고 `/services/` 카드의 강화도어 항목은 상세 링크 없이 소개만 남는다(기존 게이트 동작).
- 복원 조건: 운영자가 취급 범위를 확인 → `fact-ledger.json services.glass-door.verified=true` → `npm run ledger:upgrade` → 빌드. 확인 전 "강화도어 수리 가능" 류 확약은 어디에도 없다.

## 5. 기술 SEO 점검 결과 (운영 빌드 로컬 크롤, 162 URL)

| 검사 | 결과 |
|---|---|
| 200·self-canonical·index·lang=ko·H1 1개·title/description 고유 | 162/162 통과 |
| 내부 링크 4xx/5xx·리디렉션 체인·고아 | 0 / 0 / 0 |
| JSON-LD 파싱·@type·FAQ 질문 수·LocalBusiness 위치(홈·소개만) | 0 이슈 |
| 사이트맵 호스트·누락·초과·lastmod 일치 | 0 이슈 |
| 보류 정책(C → 308 1홉, D → 404), 미지 경로 404, robots Sitemap | 0 이슈 |
| 스테이징 주소 노출·noindex 오적용 | 0 |
| 근접 중복(5-gram Jaccard ≥ 0.75) | 0 (13,041 쌍) |
| 모바일 390/320 가로 넘침·12px 미만 글자·viewport | 0 (32 페이지 × 2) |

성능(lab, `reports/perf-lab.json`): LCP 48~336ms, CLS 0~0.009, 요청 45~58. 개선 여지: 페이지당 전송 0.9~2.3MB 의 대부분이 Pretendard 폰트(가변 전체) — 서브셋 또는 한글 범위 분할 로딩이 다음 단계(디자인 유지). 실제 사용자 지표는 배포 후 콘솔 Core Web Vitals 로 확인한다.

## 6. 측정 설계와 일정

대시보드 `reports/measurement-dashboard.md`(`npm run search:dashboard`): 엔진별 발행 / 색인 적합 / 색인 확인 / 미색인 확인 / 실노출 확인 / 노출·클릭 / 판정. 현재 전 엔진 "데이터 대기"(콘솔 권한 없음). Naver 는 URL 별 실노출이 상위 30 URL 로 제한되어 그 밖은 "측정 불가"로 표기한다.

| 시점 | 할 일 | 산출 |
|---|---|---|
| D+0 | 배포, `seo:audit --base https://jndsystem.kr`, 콘솔 3종 소유 확인·사이트맵 제출(운영자 계정), IndexNow 키 설정 후 1차 전체 제출 | `search-evidence.json` 기준값, 제출 로그 |
| D+14 | 엔진별 URL 검사 20개 샘플 + 페이지 색인 리포트, 발견/수집 여부 | 대시보드 1차, 미수집 URL 의 내부 링크·사이트맵 점검 |
| D+30 | 색인 확인 수, 미색인 사유별 집계, 검색 실적(웹·페이지) 추출 | 사유별 조치 목록, B 지역 페이지 보강 1차(운영자 자료 반영분) |
| D+60 | 지역 B 페이지 색인률 판정 → 50% 미만이면 통합 플레이북 실행 | 통합/유지 결정 기록, 리디렉션 통지 |
| D+90 | 노출·클릭 기준 제목/설명 조정, 2차 발행 후보(강화도어 확인 시) 심사 | 분기 보고 |

## 7. 산출물

- 감사 CSV: `data/export/seo-audit.csv`(162 URL 기술 항목), `data/export/content-quality.csv`(품질 지표·근거·판정), `data/export/intent-audit.csv`(키워드 2,476 클러스터·대표 URL), `data/export/publication-ledger.csv`(등급·상태 포함).
- 대장·근거: `data/registry/publication-ledger.json`, `fact-ledger.json`, `content-quality.json`, `intent-clusters.json`, `content-lastmod.json`.
- 리포트: `reports/content-quality.md`, `reports/intent-audit.md`, `reports/measurement-dashboard.md`, `reports/seo-audit.json`, `reports/dup-check.json`, `reports/mobile-check.json`, `reports/perf-lab.json`, 본 문서.
- 문서: `docs/search-console-runbook.md`(IndexNow·제출 체크리스트), `docs/release-and-rollback.md`(새 게이트·통합 플레이북), `docs/content-generation.md` §6, `docs/owner-approvals.md`(#1 갱신, #29~#34), `README.md`.

## 8. 운영자 확인 필요 목록

1. 운영 호스트 `jndsystem.kr` vs 2차 요구사항의 `jndsystem.co.kr` — 기존 결정(`.kr`) 유지 중.
2. 강화도어 수리 취급 범위(#29) — 확인 시 60 URL 복원 가능.
3. 지역별 출장 실적 자료(#30) — 지역 B 86 페이지 보강·A 승격 재료.
4. 서울 당일 출장 가능 여부(#31).
5. IndexNow 키 발급·환경변수(#32). 제출은 운영 반영 후 승인 시에만.
6. 팩스·이메일 표기 확정(#33).
7. 지역 센서·모터 110 URL 통합 승인(#34).
8. 검색 콘솔 3종 운영자 계정 생성·개발 권한 초대(#25), 도메인·DNS·호스팅(#24).

## 9. 하지 않은 것 (명시)

- 검색엔진 제출·색인 요청·IndexNow 전송: 하지 않았다(권한·키 없음, 운영 미배포).
- Lighthouse·CrUX: 실행하지 않았다. 위 성능 수치는 Playwright 실험실 측정이다.
- 외부 링크·리뷰·가격·도착 시간·대리점 목록: 근거가 없어 만들지 않았다.
- 디자인 변경: 없음(푸터 사업자 정보 2줄 추가, 지역 수리 페이지 04-1 절 추가만).

## 10. 추가 범위(14~17장) — 운영자 직접 발행

| 항목 | 결과 | 검증 |
|---|---|---|
| 새 페이지 작성(유형 선택 → 입력 → 미리보기·검수 → 발행·관리) | `/admin/new/`, `/admin/content/`, 편집기(자동저장·사진·연결·검색 표시 예시·체크리스트·이력), 휴대폰 지원 | 390px 편집기 가로 넘침 0, 스크린샷 |
| 글쓰기 가이드(15장) | 입력란 설명·유형별 예시·접이식 가이드·발행 전 자동 판정(막음/경고) | `validatePage` 규칙, 수용 테스트 "필수 누락 7건" |
| 한글·영문 사진 파일명(16장) | UTF-8 원래 이름 표시, 고유 ID 저장, 매직 바이트 판정, HEIC 안내 거부, EXIF 회전·메타 제거, 480/960/1600 WebP, `/uploads/` 공개 200, 원본 비공개 | 수용 테스트 9항목 |
| 발행 시 검색 발견 자동화(17장) | 발행 → 재검증(주소·허브·사이트맵) → 응답 후 자가 검사 → 상태(초안/검수 요청/발행 중/공개 및 검색 발견 준비/공개 오류/비공개) | 수용 테스트 44/44, 공개까지 수 초(기준 5분) |
| 문의 내역 화면 | 운영자 결정으로 제거(알림 채널 전달 + 파일 백업) | 관리자 메뉴·API 삭제, 빌드·린트 통과 |
