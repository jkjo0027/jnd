# 원본 자료 감사 (source audit)

작성일 2026-11-04 · 저장소 `samduck150906-lgtm/jnd`

## 1. 확정 사항

| 항목 | 값 | 근거 |
|---|---|---|
| 운영 호스트 | `https://jndsystem.kr/` (apex, HTTPS, 소문자 경로, trailing slash) | 요구사항 명세 01 · 엑셀 실행요약 "적용 대상" |
| 제외 도메인 | `*.co.kr` 후보(j&dsystem.co.kr, jndsystem.co.kr) — 등록·DNS·리디렉션·인증·제출 대상 제외 | 회신 PPTX 06-1 의 후보는 참고로만 보존 |
| 디자인 기준 | `reference/jnd_handoff/site/JND-A v4.dc.html` (A안 v4, 흰 헤더부터), 팔레트 "지정 1 · 옐로우 + 블랙" | README.md, PPTX 08 "A안에 실측~A/S 6단계 조합" |
| 데이터 입력 | `jnd-data.js` (문구·구조), `jnd-core.js` (상태·동작 참조) | README.md |
| 참조 전용(공개 번들 제외) | `support.js`, `doc-page.js`, `*.dc.html`, `animations-v3.jsx` 런타임, PDF·PPTX, 사업자등록증 이미지, `름랩토스페이먼츠/` | 요구사항 명세 01·02·04 |

## 2. 입력 파일

| 파일 | 위치 | SHA-256 | 크기 |
|---|---|---|---|
| `jndsystem-kr-seo-keyword-plan.xlsx` (수정본, 도메인 반영) | `inputs/` | `6d4c8543b9870ef64d33fd835fbd50f75a1e03f5b0e7c42332b2fb5d59136daf` | 153,568 B |
| `세 가지 자동문 수리 디자인안.zip` | `inputs/` (git 제외, 25 MB) | `108adfaa6180bba3e399291131c84fc7afb3c7f4c7b25db3bc56c25042192090` | 25,798,785 B |
| `제이앤디시스템 홈페이지 최종 시안.html` (번들 래퍼, 11 MB) | 업로드만 — 저장소 미포함 | `15fb40c87f60b39237f9ef9ba544c889e245190ed1ed609e5178c98629fbea6d` | 11,102,221 B |

ZIP 검사: 286 엔트리, 절대경로·상위경로(`..`)·심볼릭 링크 0건. `세 가지 자동문 수리 디자인안 최종/jnd_handoff/` 를 `reference/jnd_handoff/` 로 복사(PDF 3종, PPTX 2종, pasted 사업자등록증 PNG, 토스 섹션 폴더는 git 제외). ZIP 루트의 중복본(`uploads/`, `logos/`, `screenshots/`, 이전 시안 HTML)은 해시 동일 복제본이라 보존하지 않음. 요청사항 PNG 의 해시 접미 복제본(`요청사항N-xxxxxxxx.png`)과 두 회신 PPTX(`reply.pptx` = `제이앤디회신필요내용.pptx`, SHA-256 `fe4d1835…`)는 한 건으로 다룸.

## 3. 저장소 상태

- 시작 시 빈 저장소(커밋 0, 원격 `origin` = GitHub). 기존 라우트·환경변수·배포 대상 없음 → 요구사항 명세 08 기본 아키텍처 적용.
- 스택(공식 npm dist-tag 확인, 2026-11-04): Next.js **16.4.5** (latest, Node ≥ 20.9), React **19.3.1**, TypeScript **5.9.3**, Node 22.23.4. Next 16 에서 `middleware` 는 `proxy` 로 개명됨(내장 문서 `proxy.md`) → `src/proxy.ts`.
- 폰트·아이콘 고정 자산: `pretendard@1.3.9` (OFL-1.1), `lucide-static@0.460.0` (ISC) — npm 패키지로 고정, 빌드 시 자체 호스팅.
- 실행: `npm run build` (prebuild 에서 레지스트리 검증) → `npm start`. 테스트 `npm test`, SEO 감사 `npm run seo:audit`, 중복 검사 `npm run content:dupcheck`, 디자인 비교 `npm run parity:shots && npm run parity:diff`.

## 4. 엑셀 감사 결과 (기준값)

| 시트 | 확인 |
|---|---|
| 실행요약 | 기준일 2026-11-03, 데이터랩 2025-11~2026-10, 조합 2,476, 기본 지역 56, 생활권 63, 후보 318(핵심 8 + 지역 280 + 정보 30), 수원점 천안 주소 표기·약속 문구(24시간·최저가·공식대리점) 확인 필요 항목 포함 |
| 페이지설계318 | 4행 헤더 13열 일치. 5~322행 318개 고유 ID·경로(중복 0, 호스트 오류 0, trailing slash 100%). 유형: 핵심 8 / 지역서비스 280 / 증상·부품·정보 30. 제작순서: 1차 29(8+15+6) / 2차 289(265+24). 허브 참조: `/` 8, `/areas/seoul/` 125, `/areas/gyeonggi/` 155, `/services/repair/` 30 — 모두 존재 |
| 키워드조합 | 4행 헤더 9열 일치. 5~2480행 2,476개, 318 경로 전부에 조인(누락 0). 근거유형: 생활권 확장 1,260 / 설계 확장 1,158 / 광역 확장 58. 월검색량 2,476 전부 "미확인". K1290·K1295(화성 동탄 수리/비용) → `/areas/gyeonggi/r56/repair/` 확인 |
| 데이터랩분석 | 비교군 2 × 5검색어 × 12개월 = 120 표시값. 서비스 평균: 수리 75.83 / 설치 50.33 / 고장 9.58 / 강화도어수리 5.42 / 교체 0.33. 지역 평균: 수원 37.67 / 평택 14.83 / 화성 11.08, 최근 3개월 수원 32.00 / 화성 14.67 / 평택 11.67 — 일치. 절대 비교·건수 환산·0=수요 부재·지역 필터 해석 금지 메모 그대로 보존(`data/registry/datalab.json`) |
| 지역목록 | 서울 25 + 경기 31 = 56 기본(5개 서비스 후보) + 생활권 63(대표 시·구로 통합) = 119행. R01~R56 이 지역목록 순서(서울 25 → 경기 31)와 1:1 일치함을 가져오기 스크립트가 검증(수원 R38, 평택 R53, 화성 R56, 금천구 R08, 용산구 R21) |

가져오기: `python3 -I scripts/import-xlsx.py --write` → `data/registry/{candidate-pages,keyword-map,area-aliases,datalab}.json` (원본 해시·시트명·행 번호·원문 보존, NFC·공백 정리 키는 `*Key` 별도 필드). 변경판은 같은 명령이 추가/삭제/변경 ID 를 출력하고 `--write` 없이는 반영하지 않는다. 빌드 전 `scripts/validate-registry.mjs` 가 중복 ID·경로·호스트·조인·허브·대장 상태를 검사해 실패 시 빌드를 중단한다.

## 5. URL·키워드 조인 결과

- 핵심 8: `/`, `/services/{repair,install,sensor,motor,glass-door}/`, `/areas/{seoul,gyeonggi}/` → 7개 승인(구현 완료), **`/services/glass-door/` 보류**(강화도어 수리 취급 범위 미확인, 엑셀 운영 메모 "실제 취급·시공 역량 확인").
- 시안 부품 카드 8개 ↔ 키워드 서비스: 센서→`/services/sensor/`, 컨트롤러·모터→`/services/motor/`, 설치·교체→`/services/install/`(기계 설치·교체는 앵커 `#machine` 로 통합), 스위치·번호키는 고유 의도·사례(c1, c4)가 있어 부품 상세 `/services/switch/`, `/services/keypad/` 추가, 비상배터리·장애인 스위치는 근거 없음 → `/services/#battery`, `/services/#accessible` 앵커(별도 URL 없음). 시안 `/regions` 계열은 발행하지 않고 `/areas/` 한 벌만 사용.
- 1차 지역 15: R38·R53·R56 × 5 중 repair/install 6건 초안 작성(evidence_ready), sensor/motor/glass-door 9건은 고유 자료 없음 → 같은 지역 repair 로 통합 보류(hold, mergeTarget). 용인·오산은 PPTX 우선 지역이지만 다음 묶음.
- G01~G06 초안 작성(review, 기술 검수 대기). G04 는 진단 의도, 센서 서비스는 수리 의도로 분리 유지. G07~G30 후보(candidate).
- 생활권 별칭 179건(`area-aliases.json`): 동탄→r56, 분당→r37, 영통→r38 등. 경기/경기도, 서울/서울특별시 광역 표기는 허브로 매핑.
- 사례 8건 → 지역 ID 부여(c1 용인 r48, c2 금천 r08, c3 용산 r21, c4·c8 화성 r56, c5 성남 r37, c6 안양 r42, c7 경기광주 r30). 기존 사이트 갤러리 62건 중 8-1/8-2/8-3 이 c2/c1/c3 본문과 일치 → 승인 근거. 나머지 59건은 제목만 다른 사진 게시물(본문 없음) → 통합 검토 대상이며 미사용.

## 6. 공개를 막는 운영 확인 항목 (요약 — 상세는 `docs/owner-approvals.md`)

1. 보조 상담번호 1661-5863 · 1661-6878 수신 테스트, 사진 견적 문자 010-8804-1555 수신 테스트 (확인 전 공개 빌드는 대표번호 1661-3088 만 노출)
2. 후기 5건 게시 동의·작성자·날짜·사진 (확인 전 공개 빌드에서 후기 섹션 보류)
3. 시공사례 c4~c8 사진 권리·시공일·고객사명 노출 동의
4. 대표 NAP: 팩스 `031-375-0118` vs PPTX `031-375-01188`, 이메일 `post8642@naver.com`(표기) vs `post86400@gmail.com`(문의 수신), 대리점 25 vs 27, 수원점 천안 주소 표기, 개인정보 보유기간·시행일
5. 강화도어 수리 취급 범위, 출장권역 최종 확정(인천·충청 포함 여부), 견적 기준
6. 도메인 소유·DNS·호스팅·검색 콘솔 권한, 관리자 계정(운영자 명의)

## 7. 원본 재현(기준 화면) 방법

`cd reference/jnd_handoff/site && python3 -m http.server 8080 --bind 127.0.0.1` → `http://127.0.0.1:8080/JND-A%20v4.dc.html`. `support.js` 가 unpkg 에서 React 18.3.1·Babel standalone 을 불러오므로 네트워크가 필요하다. 검토용 상단 바의 `select[aria-label="화면 이동"]` 으로 공개·관리자 화면을 전환하며, 비교 캡처 시 이 바는 `display:none` 처리하고 헤더 `top` 을 0 으로 맞춘다(`scripts/parity-shots.mjs`).
