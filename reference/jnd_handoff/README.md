# 제이앤디시스템 자동문 수리 홈페이지 — 개발 인수인계 패키지

## 개요
제이앤디시스템(자동문 설치·수리, 대표번호 1661-3088) 공식 홈페이지 최종 디자인(옐로우 + 블랙)과 자동문 모션 영상, 고객 자료를 모두 담은 패키지입니다.
목표: **이 디자인을 실제 운영 사이트로 100% 동일하게 구현**하는 것.

## 폴더 구성
```
jnd_handoff/
├─ README.md                 ← 이 문서 (디자인 명세)
├─ site/                     ← 최종 디자인 원본 (기준 화면, 그대로 실행 가능)
│  ├─ JND-A v4.dc.html       ← 사이트 전체 (홈 + 하위 페이지 + 관리자 화면)
│  ├─ JND-A v4 최종 시안 (PDF용).dc.html ← 인쇄/PDF용 래퍼
│  ├─ jnd-data.js            ← 모든 콘텐츠 데이터 (문구·전화·서비스·사례·지역·FAQ)
│  ├─ jnd-core.js            ← 화면 이동·필터·폼·관리자 로직
│  ├─ jnd-video.jsx / animations-v3.jsx ← 홈에 들어가는 자동문 모션 영상 (JNDDoorLoop)
│  ├─ support.js / doc-page.js ← 디자인 파일 실행용 런타임 (운영 코드엔 불필요)
│  ├─ logos/                 ← 실적 고객사 13개 + 취급 브랜드 3개 로고
│  └─ assets/photos/         ← 현장·제품 사진 19장 (원본 고해상도) + manifest.json
├─ video/                    ← 자동문 모션 영상 (18.5초 자동문만 / 27.5초 풀버전)
└─ materials/uploads/        ← 고객이 보낸 원본 자료 전체 (요청사항, 로고 원본, PDF, PPTX 등)
```

## 기준 화면 여는 법 (반드시 로컬 서버로)
디자인 파일은 JS 모듈을 불러오므로 더블클릭이 아니라 서버로 열어야 합니다.
```
cd jnd_handoff/site
python3 -m http.server 8080
# → http://localhost:8080/JND-A%20v4.dc.html
```
영상: `cd jnd_handoff/video && python3 -m http.server 8081` → `JND 자동문 모션 영상 - 자동문만.dc.html`
(MP4가 필요하면 영상 파일을 열고 내보내기 하거나, Playwright로 1920×1080 녹화)

## 디자인 파일에 대하여
`site/*.dc.html`은 **HTML로 만든 하이파이 디자인 기준본**입니다. 모든 스타일이 요소마다 인라인으로 적혀 있고, `{{ 값 }}` 자리는 `renderVals()`(파일 하단 `class Component`)와 `jnd-core.js`의 `build()`가 채웁니다. 이 구조를 그대로 옮기면 디자인이 100% 같아집니다.
`support.js`는 이 디자인 형식을 실행하는 런타임이므로 운영 코드에 넣지 말고, 템플릿 → JSX로 기계적 변환하세요.

## 제외할 것
- 맨 위 검은 **검토용 바**("A안 v4 · 지정 컬러 반영 / 화면 이동 셀렉트 / 이전 A안 · B안")는 시안 검토용입니다. 운영 사이트에 넣지 마세요. 그 아래 흰 헤더(로고)부터가 실제 사이트입니다.
- 화면 이동 셀렉트로 모든 하위·관리자 화면을 확인할 수 있습니다.

## 충실도
**하이파이(픽셀 퍼펙트).** 색·글꼴·간격·모서리·그림자·호버·애니메이션 모두 최종값입니다. 임의로 "개선"하지 말 것.

## 화면 목록 (`state.screen` 값)
공개 페이지
- `home` 메인 — 헤더(스티키) → 히어로(배경에 자동문 모션 영상 반복 재생 + 자동문 열림 인트로) → 01 증상 진단 → 자동문 종류(16:9 모션 영상 + 편개·양개·스윙 카드 3개) → 02 부품별 수리(8개, 4×2) → 03 처리 6단계(데스크톱 1줄 6칸) → 04 최근 시공사례 → 05 베스트 리뷰(큰 카드 1 + 작은 카드 4) → 06 출장 지역(3단 컬럼) → 07 대표 실적 현황(로고 13개) → 08 자주 묻는 질문 → 전화 상담 밴드(번호 3개) → 문자 견적 → 푸터
- `about` 회사소개, `services` / `serviceDetail` 부품별 수리, `regions` / `regionDetail` 지역(시·구·동 3단계), `cases` / `caseDetail` 시공사례, `faq`, `contact` 문의폼(전송완료 상태 포함), `privacy`, `notfound`

관리자 페이지
- `login`, `dash` 대시보드, `pages` 지역 페이지 목록, `editor` 페이지 편집(SEO), `newRegion` 지역 페이지 일괄 생성, `adminCases` / `caseEditor` 시공사례 관리, `inquiries` 문의함, `states` UI 상태 모음(로딩·저장·오류·버튼 상태)

## 반응형 규칙 (renderVals 기준, `w = window.innerWidth`)
- `mob`/`desk` 분기: 헤더·히어로·하단 고정 전화바(모바일만)
- 부품별 수리 `svcCols`: ≥1024 4열 / ≥560 2열 / 그 외 1열
- 6단계 `stepCols`: ≥1100 6열 / ≥640 3열 / 그 외 2열
- 리뷰 작은 카드 `revCols`: ≥560 2열 / 1열
- 실적 로고 `clientBasis`: ≥1100 7개/줄 / ≥700 5개 / 2개 (가운데 정렬)
- 푸터 `footCols`: 데스크톱 `1.3fr 1fr .8fr 1.5fr`
- 출장 지역: `columns: 3 240px` (지역이 늘면 자동 채움)

## 동작
- **자동문 모션 영상 2곳 삽입** (`JNDDoorLoop`, 18.5초 자동 반복, 컨트롤 없음)
  1. 메인 히어로 배경: `bare` 모드(문만 움직이고 글자 없음), `cover` 채움, 위에 검정 오버레이(좌→우 `.9 → .88(45%) → .35`)
  2. 자동문 종류 섹션: 카드 위 16:9 블록, `contain`, 영상 속 TYPE 01~03 글자 포함
  - 화면 밖이거나 탭이 숨겨지면 재생 정지, `prefers-reduced-motion`·인쇄 시 17.2초 정지 화면
  - 운영 구현 시: 같은 코드를 React 컴포넌트로 이식(권장, 선명·가벼움) **또는** 영상 파일에서 MP4로 내보내 `<video autoplay muted loop playsinline>`로 교체. 어느 쪽이든 크기·위치·오버레이는 위 값 그대로
- **지역 SEO 페이지 번호 분산**: 지역 상세 페이지(약 200개)마다 3개 번호 중 하나를 고정 배정 — 지역명 해시(`h = h*31 + charCode`, 시작값 7, `>>> 0`) `% 3`. 같은 페이지는 항상 같은 번호, 페이지 전체로 보면 3개가 고르게 분산. 헤더·하단바·상담 버튼 모두 그 번호 사용
- **전화번호 랜덤 노출(메인 등 일반 페이지)**: `PHONES` 3개(1661-3088 / 1661-5863 / 1661-6878)를 방문마다 셔플, 강조 번호가 `rotateSec`(기본 2.5초)마다 순환. 010 번호는 노출하지 않음.
- **사진으로 견적** 버튼만 `sms:010-8804-1555` (사진 문자 수신용 휴대폰).
- 히어로 자동문 인트로: 마운트 700ms 후 열림. `prefers-reduced-motion` 시 즉시 열림.
- 스크롤 등장(`rise` 키프레임, IntersectionObserver) — `reveal()` 참고.
- 버튼/링크 공통 전환: 0.2–0.3s `cubic-bezier(.2,.8,.2,1)`, 눌림 시 `scale(.97)`, 카드 이미지 호버 `scale(1.045)` 0.8s.
- 자동문 키프레임 `dPen / dYL / dYR / dSw` (helmet `<style>` 그대로 이식).
- 폼: 이름·연락처·동의 필수, 미충족 시 버튼 비활성 + 오류 표시 (`jnd-core.js` contact).

## 디자인 토큰 (최종 팔레트 "지정 1 · 옐로우 + 블랙")
CSS 변수 이름은 디자인 파일과 동일하게 유지하세요(이름은 blue지만 값은 옐로우).
- `--blue #FED91B` (주 강조/버튼 배경), `--blue-600 #F2CB00` (호버), `--blue-700 #DDB800` (눌림), `--blue-50 #FFF9DC`, `--blue-100 #FFF0A6`
- `--blue-t #F07600` (섹션 번호 등 강조 텍스트), `--on-accent #000000` (노란 버튼 위 글자), `--on-dark #FED91B`
- 전화 밴드: `--band-on-bg #000000`, `--band-on-fg #FED91B`, `--band-off-bg rgba(255,255,255,.45)`
- 버튼 그림자 강조색 rgb `254,217,27`
- ※ 16행 `:root` 기본값(파란색)은 `applyPalette()`가 덮어씁니다. **최종값은 위 옐로우 값이 기준.**
- `--ink #000000`, `--g700 #363D47`, `--g600 #555E6B`, `--g500 #6E7682`, `--g400 #9DA4AE`, `--g300 #C9CED5`, `--line #E4E7EB`, `--g100 #F2F4F6`, `--g50 #F8F9FA`
- 상태: `--ok #0F7B55 / #E7F5EF`, `--warn #A75A00 / #FDF2E3`, `--err #D02F3A / #FDECEE`
- 글자: `--fs-d clamp(32px,5.2vw,48px)`, `--fs-1 clamp(26px,3.6vw,34px)`, `--fs-2 22px`, `--fs-3 18px`, `--fs-b 16px`, `--fs-s 14px`, `--fs-c 13px`
- 모서리: `--r-s 8px`, `--r-m 14px`, `--r-l 20px`, `--r-xl 28px`
- 그림자: `--sh-1`, `--sh-2`, `--sh-3`, `--sh-btn`, `--sh-btn-h` (값은 `site/JND-A v4.dc.html` 16행 `:root` 및 `applyPalette()`)
- 글꼴: Pretendard Variable v1.3.9 (jsDelivr), `word-break: keep-all`
- 아이콘: Lucide static font v0.460.0 (`<i class="icon-이름">`)
- 콘텐츠 폭 `max-width:1120px`, 좌우 패딩 `clamp(20px,4vw,40px)`, 섹션 상하 `clamp(56px,8vw,104px)`

## 자산
- `site/assets/photos/photo-01~19.jpg` — 고객 제공 현장·제품 사진 (원본 Google Drive 주소와 사용처는 `manifest.json`)
- `site/logos/` — 실적 13개(samsung, lg, iparkmall, starbucks, spc, koroad, korail, emart, tesla, hillstate, raemian, ipark, xi), 브랜드 3개(brand-sun, brand-hyundai, brand-taesung)
- 나머지 브랜드 8개(우성, H&T코리아, 미래, 건일, 스피드, 토토, 스위코, 태광)는 로고 파일이 없어 텍스트로 표시 — 파일 받으면 교체
- 06 비상배터리 / 07 자동문 기계 / 08 장애인 스위치 카드 사진은 기존 사진 임시 사용 → 실제 현장 사진 받으면 교체
- 리뷰 5건 문구: `materials/uploads/요청사항/추가요청1/내용.txt` (renderVals의 `REV` 배열에 반영됨)

## 참고
- PDF 시안의 중간 빈 공간은 PDF 페이지 나눔 때문이며 실제 사이트에는 없음
- 출장 지역 칸의 빈 공간은 SEO 지역 페이지 데이터가 들어가면 자동으로 채워지거나 줄어듦(레이아웃 형태는 유지)
- 푸터의 출장 지역 중복은 제거 완료

## 미결 사항
- 더현대 로고 미수령 (현재 힐스테이트 표시)
- 문의폼 실제 전송처(이메일/DB), 관리자 로그인 실제 인증, 도메인·배포

## 파일
- 사이트: `site/JND-A v4.dc.html` (템플릿 1–1120행, 로직 1122행~), `site/jnd-data.js`, `site/jnd-core.js`
- 인쇄본: `site/JND-A v4 최종 시안 (PDF용).dc.html`
- 영상: `video/JND 자동문 모션 영상 - 자동문만.dc.html` + `jnd-video.jsx` (장면·타이밍 정의)
