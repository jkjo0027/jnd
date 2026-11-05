# 검색엔진 등록·검증 런북 (search console runbook)

기준 2026-11-04. 콘솔 계정은 **운영자 명의**로 만들고 개발 권한을 초대받는다. 아래 메뉴 이름과 지원 범위는 실행 시 공식 문서에서 다시 확인한다. 권한을 받기 전까지 모든 항목은 **데이터 대기** 상태이며, 운영자가 그대로 따라 할 수 있도록 절차를 적는다.

공통 기록: `data/registry/search-evidence.json` (`rows`: 엔진, 속성, 배치 ID, 경로, 요청 종류, 제출시각, 확인시각, 상태, 공개 응답·canonical, 결과 근거, 오류 원인, 담당자, 재확인일 / `dashboard`: engine, evidence_scope, from, to, as_of, eligible, indexed_confirmed, indexed_unknown, exposed_confirmed, exposure_coverage, impressions, clicks, verdict, evidence_ref). CSV 내보내기 `npm run registry:export`.

## 0. 사전 조건 (배포 후 D+0~7)

- `https://jndsystem.kr/` 200, TLS, `robots.txt` 에 `Sitemap: https://jndsystem.kr/sitemap.xml`, `sitemap.xml` 200 (공개 대장 URL 100%, self-canonical, index 허용). `npm run seo:audit -- --base https://jndsystem.kr` 통과.
- 관리자·API·미리보기는 `X-Robots-Tag: noindex` 와 robots.txt Disallow (robots 차단은 noindex 대용이 아니므로 둘 다).
- 현재 공개 대상(E): **162 URL** (2026-11-05 품질 감사 후. 발행 대장 `contentStatus=PUBLISHED && indexEligibility=true`). 2026-11-04 전수 발행 331 → 감사로 강화도어 57+가이드 2 보류(D), 지역 센서·모터 110 통합(C, 308 → 지역 수리 페이지), 사례 5 검수 대기. 근거: `reports/seo-geo-audit-2026-11-05.md`.
- 보류 URL 의 응답 정책: C(통합) → `mergeTarget` 으로 308 영구 리디렉션(1홉, `next.config.ts` 가 대장에서 생성), D(미확인) → 404. 어느 쪽도 사이트맵에 넣지 않는다. 운영에 한 번도 배포된 적 없는 URL 이므로 410 이나 콘솔 삭제 요청은 필요 없다(배포 후 노출된 뒤 보류되는 URL 은 삭제 요청을 병행).

## 1. Google Search Console — https://search.google.com/search-console
1. 속성 추가 → **도메인** `jndsystem.kr` → 제공되는 DNS TXT 레코드를 운영자 DNS 에 추가 → 확인. 확인 후 "사용자 및 권한"에서 개발 계정을 **전체** 또는 **제한** 권한으로 추가.
2. **Sitemaps** 메뉴에 `https://jndsystem.kr/sitemap.xml` 제출 → 상태 "성공", 읽기·가져오기 오류 확인.
3. **페이지(색인 생성)** 리포트에서 사유별(크롤링됨-현재 색인 생성되지 않음, 발견됨-현재 색인 생성되지 않음, 중복, 리디렉션, noindex 등) 집계와 사이트맵 필터를 확인.
4. **URL 검사**: 대표 URL 마다 "Google 색인 생성" 의 저장된 색인 상태와 **Google 선택 canonical** 을 기록(`rows.state`, `canonicalSeen`). 라이브 테스트 결과는 별도 필드로 기록하고 색인 확인으로 집계하지 않는다. 재색인 요청은 중요 대표 URL 또는 수정 표본만.
5. **Indexing API** 는 구인/라이브 이벤트 페이지 대상이므로 일반 서비스·지역 페이지에 사용하지 않는다.
6. **검색 실적**: 검색 유형 **웹**, 측정기준 **페이지**로 추출(기간·속성·추출 시각 기록). Search Analytics API 사용 시 공식 쿼터·행 제한(요청당 최대 25,000행, 일별 쿼터)을 지키고 결과가 모든 URL 을 포함한다고 가정하지 않는다.
7. 참고: 스팸 정책(지역명만 바꾼 복제 페이지 = doorway) https://developers.google.com/search/docs/essentials/spam-policies , 사이트맵 https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap , URL 검사 https://support.google.com/webmasters/answer/9012289 , 실적 https://support.google.com/webmasters/answer/7576553 , Indexing API 범위 https://developers.google.com/search/apis/indexing-api/v3/quickstart , 사이트 이전 https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes

## 2. Naver 서치어드바이저 — https://searchadvisor.naver.com
1. 웹마스터 도구 → 사이트 등록 `https://jndsystem.kr` → 소유 확인: **HTML 태그**(메타 값을 `.env NAVER_SITE_VERIFICATION` 에 넣고 재배포, 초기 HTML `<head>` 에 출력됨) 또는 HTML 파일 업로드(`public/` 에 배치).
2. **요청 → 사이트맵 제출** `https://jndsystem.kr/sitemap.xml`. 실제 운영 피드(RSS)가 생기면 RSS 도 제출(현재 없음).
3. **검증 → URL 검사** 로 대표 URL 별 수집/색인/제외 와 대표 URL 문제를 확인. **사이트 진단**의 총량은 별도 표시(URL 별 증거 아님).
4. **요청 → 웹 페이지 수집** 은 우선 URL 만 제한적으로. 수집 성공(접수)과 실제 색인은 별개로 기록.
5. **리포트 → 콘텐츠 노출/클릭**: 웹 검색 영역 기준. 공식 범위가 클릭 기준 **상위 30 URL** 과 사이트 요약이며 업데이트 지연이 있으므로, 30일 확정 구간에 확인 가능한 URL 만 하한으로 기록하고 전체 URL 별 근거가 없으면 **"전체 검증 불가"** 로 표기(추정치를 확정 성과로 쓰지 않음). 여러 시점의 상위 목록은 동일 기간·URL 별 노출 증거가 있을 때만 중복 제거해 합산.
6. 참고: 소유 확인 https://searchadvisor.naver.com/guide/faq-start-register , 사이트맵 https://searchadvisor.naver.com/guide/request-feed , URL 검사 https://searchadvisor.naver.com/guide/url-inspection , 수집 요청 https://searchadvisor.naver.com/guide/request-crawl , 노출/클릭 https://searchadvisor.naver.com/guide/report-expose-ctr

## 3. Bing Webmaster Tools — https://www.bing.com/webmasters
1. 사이트 추가 `https://jndsystem.kr` → 제공되는 소유 확인(XML 파일 / 메타 태그 / DNS CNAME) 중 하나 완료. GSC 가져오기 옵션이 있으면 운영자 Google 계정으로.
2. **Sitemaps** 에 제출하고 처리 결과(발견 URL 수·오류) 확인.
3. **URL Inspection** 과 **Site Explorer** 로 수집·색인·오류 점검.
4. **Search Performance** 의 Web, **Pages** 데이터로 노출 집계(기간·추출 시각 기록).
5. **IndexNow** 를 쓸 경우: 키 파일 `https://jndsystem.kr/<key>.txt`(공개 호스트) 배포, `https://api.indexnow.org/indexnow` 로 **추가·변경·삭제 URL 만** 전송(최대 10,000 URL/요청). 재시도·중복 억제·실패 로그를 두고, 202 접수 응답을 색인 완료로 집계하지 않는다. 규격 https://www.indexnow.org/documentation
6. 참고: 가이드라인 https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a , URL 검사 https://www.bing.com/webmasters/help/URL-Inspection-55a30305 , 실적 https://www.bing.com/webmasters/help/search-performance-c680da36

## 4. 색인·실노출 집계 규칙 (요약)

- 단위 = 승인된 공개 대표 URL. **E** = 운영에서 200·색인 허용·self-canonical·본문/링크 품질 통과 집합. **I_engine** = E 중 엔진 공식 URL 검사 또는 공식 데이터로 색인 확인. **V_engine** = E 중 최근 확정 30일 자연 웹 검색에서 공식 URL 별 노출 1회 이상.
- 엔진마다 |I| ≥ 300, |V| ≥ 300 을 각각 보고. 교집합·합집합은 보조. 엔진 합산(예: Google 170 + Naver 90 + Bing 40)으로 달성 처리하지 않는다.
- site: 조회, GA4 방문, 순위, 크롤 로그, 제출 수는 URL 별 목표 증거와 구분. 증거 없는 URL = `unknown`, 공식 데이터로 확정되는 미색인 = `not_indexed`. 리포트 누락·표본·지연은 0 으로 치환하지 않는다.
- 원시 경로 → 승인 경로 조인 시 호스트·trailing slash·추적 파라미터를 정책대로 정규화하고, 비대표 URL 을 여러 대표 URL 에 임의 매핑하지 않는다. 속성·검색 유형·기간·추출 시각·집계 축을 저장하고 중복 보고서를 합산하지 않는다.
- 판정: 달성 확인 / 미달 확인 / 관측 범위 제한 / 데이터 대기. 분모·기간·조회 범위가 바뀌면 비교 표에 차이를 표시.

## 5. 일정과 개선 루프

| 시점 | 할 일 |
|---|---|
| D+0~7 | 응답·TLS·robots·사이트맵·소유 확인·폼 점검, 1차 배치 기준값(배포 ID, 발행일, URL 유형, 사전 지표 없음→"없음", 문의 테스트 결과) 기록 |
| D+14 / 30 / 60 / 90 / 월간 | 엔진별 색인·노출·클릭, 배치별 승인/발행/보류/통합·오류 비교. 공식 보고 지연 시 마지막 확정일 명시 |
| 발견·수집 전 | 내부 링크·사이트맵·robots·서버 로그 |
| 수집 후 미색인 | 본문 가치·중복(`npm run content:dupcheck`)·canonical·soft 404 |
| 색인 후 미노출 | 관측 기간·수요·검색 의도·경쟁·제목/본문 정합성 |
| 노출 후 낮은 CTR | 충분한 데이터에서 검색어별 제목·설명·관련성 |

수정 시 원인·조치·비교 기준·다음 관측일을 `search-evidence.json` 에 기록하고 의미 있는 변경만 다시 알린다(재색인 요청·IndexNow).

## 5-1. IndexNow (Bing·Naver 등 참여 엔진) — 통지이며 색인 보장이 아님

- 키: `INDEXNOW_KEY`(8~128자 영숫자) 를 운영 환경변수로만 둔다(저장소에 넣지 않음). 키 파일은 `https://jndsystem.kr/indexnow/<key>.txt` 로 서빙(`src/app/indexnow/[file]/route.ts`, `keyLocation` 으로 전달).
- 대상: 발행 URL 중 **본문 해시가 바뀐 것만**(추가·변경), 그리고 과거 제출된 URL 이 보류·리디렉션으로 바뀐 경우(삭제·이동 통지). `var/indexnow-state.json` 에 마지막 제출 해시를 남겨 같은 내용을 반복 제출하지 않는다.
- 실행: `npm run indexnow` (드라이런: 제출 목록만 출력) → 운영 반영·운영자 승인 후 `INDEXNOW_KEY=… node scripts/indexnow.mjs --submit`. 응답 코드·건수는 `var/indexnow-log.jsonl` 에 기록(200/202 수신 = 접수, 색인 아님).
- 금지: 변경 없는 URL 의 반복 제출, 보류(D)·통합(C) URL 의 신규 제출, Google Indexing API 를 일반 페이지에 사용.

## 5-2. 제출 체크리스트 (운영 배포 후, 운영자 승인 항목 표시)

| 순서 | 항목 | 명령·위치 | 승인 |
|---|---|---|---|
| 1 | 운영 URL 200·TLS·robots·sitemap 확인 | `npm run seo:audit -- --base https://jndsystem.kr` | — |
| 2 | Google Search Console 도메인 속성 소유 확인(DNS TXT) | 운영자 DNS | 운영자 |
| 3 | GSC 사이트맵 제출 | Sitemaps 메뉴 | 운영자 계정 |
| 4 | Naver 서치어드바이저 사이트 등록·HTML 태그 확인(`NAVER_SITE_VERIFICATION`) → 사이트맵 제출 | 서치어드바이저 | 운영자 계정 |
| 5 | Bing Webmaster Tools 사이트 추가(GSC 가져오기 가능) → 사이트맵 제출 | BWT | 운영자 계정 |
| 6 | IndexNow 키 발급·환경변수 설정·키 파일 200 확인 → 1차 전체 제출(`--all`) | `scripts/indexnow.mjs` | 운영자 |
| 7 | 대표 URL 20개 URL 검사(엔진별) → `search-evidence.json rows` 기록 | 콘솔 | — |
| 8 | D+14 대시보드 갱신 | `npm run search:dashboard` | — |

## 6. 2차 이후 발행 계획

- 나머지 후보 289 는 실제 출장권·증빙 기준으로 20~40개 단위 검토(품질·진단 결과에 따라 축소). 이전 배치의 기술 오류·중복·근거 부족이 해결되기 전에는 다음 묶음을 발행하지 않는다.
- 318 후보가 모두 발행돼 공개 URL 은 331 이다. 색인·노출이 확인되지 않는 유형은 D+30/60 데이터로 통합(hold/merged)을 검토하고, 부족분은 실제 사례(기존 갤러리 62건 중 증빙 확보분)·지원 서비스 후보로 보충한다.
- 비즈니스 프로필·네이버 플레이스(PPTX 06-9)는 상호·주소·전화를 사이트 NAP 와 동일하게 맞추는 체크리스트로 관리하며, 지도·플레이스 노출은 웹 문서 KPI 와 분리한다.
