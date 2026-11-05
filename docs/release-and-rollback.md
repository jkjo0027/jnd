# 배포·롤백 (release and rollback)

운영 호스트 `https://jndsystem.kr/` 하나. 이 문서의 외부 작업(도메인·DNS·호스팅 결제·운영 전환·실고객 알림·콘솔 계정 변경)은 모두 **운영자 승인 후** 실행한다.

## 1. 빌드와 검증 (재현 명령)

```bash
npm ci
npm run registry:validate      # 레지스트리 검증 (prebuild 에서도 실행)
npm run typecheck && npm run lint
npm run build                  # CONTENT_GATE 기본 strict
npm start                      # http://127.0.0.1:3000
npm test                       # node --test (서버 기동 시 API 테스트 포함)
npm run seo:audit -- --base http://127.0.0.1:3000
npm run content:dupcheck -- --base http://127.0.0.1:3000
```

2026-11-04 실행 결과(전수 발행 후): 빌드 성공(정적 346 페이지 + 동적 관리자/API), 타입 체크 통과, 테스트 10/10, SEO 감사 331/331 URL 200·self-canonical·index·H1 1개·고유 title/description, 내부 4xx/5xx·고아·리디렉션 체인·스테이징 노출 0건, 미지 경로 404 확인. 상세는 `reports/seo-audit.json`.

## 2. 환경변수 (`.env.example`)

| 변수 | 설명 | 책임 |
|---|---|---|
| `CONTENT_GATE` | `strict`(운영) / `preview`(디자인 대조·내부 QA 만, 운영 배포 금지) | 개발 |
| `CONTACT_MODE` | `test`(저장만, 알림 없음) → 운영 연동 후 `live` | 운영자 결정 |
| `CONTACT_STORE` | `file`(var/inquiries.jsonl) — 서버리스에서는 쓰기 불가하므로 DB/외부 저장 어댑터 필요(`src/lib/server/store.ts` 교체) | 개발 + 호스팅 결정 |
| `CONTACT_NOTIFY_WEBHOOK`, `CONTACT_NOTIFY_EMAIL` | 접수 알림. 실패는 `notify.status=failed` 로 기록되고 관리자 문의함에서 재시도 | 운영자(수신처 PPTX 06-3) |
| `CONTACT_ATTACHMENTS` 등 | 사진 첨부(승인 전 off) | 운영자 |
| `ADMIN_USERS`, `ADMIN_SESSION_SECRET` | 관리자 계정(운영자 명의, `node scripts/admin-hash.mjs`), 세션 서명키 | 운영자 발급 → 개발 설정 |
| `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION` | 소유 확인 메타(운영자 계정에서 발급) | 운영자 |

비밀 값·고객 자료는 저장소·로그·공개 번들에 넣지 않는다. `var/` 는 git 제외, 파일 권한 600.

## 3. 공개 게이트와 발행 절차

1. 콘텐츠 작성 → `data/registry/publication-ledger.json` 상태 `candidate → evidence_ready → review`.
2. 검수(근거·안전·고유 의도·권리·메타·링크·연락처) 통과 → `node scripts/ledger-set.mjs --status approved --reviewer "<이름>" --note "<근거>" <pageId…>`.
3. `npm run build` 는 `approved`/`published` 만 정적 생성, 사이트맵에 포함. 그 외 경로는 **실제 404**.
4. 배포 성공·운영 응답 확인 후 `--status published` 로 전환(publishedAt 기록) 하고 `node scripts/content-lastmod.mjs` 로 lastmod 갱신 → 커밋.
5. 후기·로고·전화번호 등 블록 단위 게이트는 `data/ops/config.json` 플래그(`docs/owner-approvals.md` 확인 후).

### 3-1. 2026-11-05 품질 감사 이후 게이트

- 공개 조건은 `contentStatus === 'PUBLISHED' && indexEligibility === true` (`src/lib/registry.ts isPublic`). 구 `status` 필드는 호환용으로 동기화만 된다.
- 등급(`qualityClass`): A 독립 가치(지역·서비스 근거 있음) · B 보강 후 발행 적합 · C 통합(mergeTarget 으로 308) · D 사실 확인 전 공개 부적합(404). 규칙은 `scripts/ledger-upgrade.mjs` 가 `data/registry/fact-ledger.json` 의 근거로 결정적으로 적용한다. 수동 예외는 `ledger-set.mjs --status … --class …` 로 남기고(`reviewNotes.manual`) 재실행 시 보존된다.
- 빌드 전 검증(`prebuild`)이 막는 것: D 등급 발행, `serviceVerified=false` 서비스의 발행, fact-ledger 미확인 서비스 발행, 발행 근거(`reviewNotes.why`) 없는 발행, 통합 대상이 비공개인 C.
- 통합(C) URL 의 리디렉션은 `next.config.ts` 가 대장에서 생성한다(코드에 경로를 적지 않음). 대장을 바꾸면 빌드가 따라간다.
- 전체 검증 한 번에: `npm run qa` (레지스트리 → 타입 → 린트 → 테스트 → SEO 크롤 감사 → 근접 중복 → 콘텐츠 품질 → 모바일). 서버(`npm start`)가 떠 있어야 한다.

### 3-2. 지역 B 페이지 통합 플레이북 (지표가 나쁠 때)

D+60 에 GSC "크롤링됨 — 현재 색인되지 않음" 이 지역 B 페이지의 절반을 넘으면, 근거 없는 지역 페이지는 광역 허브로 통합한다.
1. `node scripts/ledger-set.mjs --status HOLD --class C --merge /areas/<province>/ --reviewer "<이름>" --note "D+60 미색인 — 허브 통합" R12-repair …`
2. `npm run build` (리디렉션 자동 생성) → `npm run seo:audit` 로 `merge-redirect` 0 확인 → 배포 → `npm run indexnow` 로 이동 통지.
3. 반대로 지역 근거(사진·출장 기록)가 생기면 `fact-ledger.json regionEvidence` 에 추가 → `npm run ledger:upgrade` → A 승격.

### 3-3. 운영자 발행 저장소(런타임)

- 관리자에서 만든 페이지는 빌드 산출물이 아니라 `var/content/pages.json`(+ `history/`)에 저장되고 요청 시 렌더링된다. 사진은 `var/uploads/`. **배포 시 `var/` 를 보존·백업**해야 한다(롤백 시에도 유지). 새 배포 후 운영자 글이 사라지면 `var/` 마운트를 확인한다.
- 단일 Node 서버(`next start`, 디스크 쓰기 가능) 기준. 서버리스·다중 인스턴스는 `src/lib/server/content.ts`·`uploads.ts` 의 읽기/쓰기 함수를 DB·오브젝트 스토리지 어댑터로 교체한다(인터페이스 동일).
- 공개 상세 라우트는 `dynamicParams=true`·`revalidate=60`, 사이트맵은 요청마다 생성. 발행·비공개 시 `revalidatePath` 로 즉시 반영하고 응답 이후 자가 검사를 실행한다. 상세: `docs/operator-publishing.md`.

## 4. 호스팅 선택 (운영자 결정 대기)

- 기본: 정적 생성 + 서버 문의/인증을 함께 지원하는 Node 배포(Vercel/Netlify/Cloudflare 또는 Node 서버). `proxy.ts`(관리자 보호), `/api/contact`, `/admin/*` 가 서버 실행을 필요로 한다.
- 정적 전용 호스팅을 택하면 `output: 'export'` 제약(동적 라우트·proxy·API 불가) 때문에 문의 API·인증·관리자를 별도 서버로 분리하고, 호스트에서 404·헤더(`X-Robots-Tag` for /admin, /api)·리디렉션(http→https, www→apex, trailing slash)을 설정해야 한다.
- 다중 인스턴스에서는 메모리 rate limit(`src/lib/server/ratelimit.ts`)과 파일 저장소를 공유 저장소로 교체.

## 5. 배포 체크리스트 (D+0)

1. 버전 태그: `git tag v<yyyy.mm.dd>-<n>` (예 `v2026.11.04-1`), 빌드 ID 기록.
2. 직전 사이트맵·경로 맵 보관: `curl https://jndsystem.kr/sitemap.xml > reports/releases/<tag>-sitemap.xml`, `npm run registry:export` 결과 보관.
3. 배포 후 운영 응답 재검사: `npm run seo:audit -- --base https://jndsystem.kr` (X-Robots-Tag/robots meta·canonical·robots.txt·sitemap.xml·TLS). `curl -I https://jndsystem.kr/` 로 HTTPS·헤더, `curl -I http://jndsystem.kr/`·`https://www.jndsystem.kr/` 로 apex HTTPS 정규화(www DNS 가 실제 제공될 때만).
4. 문의 접수 테스트(`CONTACT_MODE=test` 상태에서 접수 ID 확인, 운영 알림 미발송) → 운영자 수신처 확인 후 `live`.
5. 오류율·폼 장애·광범위한 색인 차단(noindex/robots)·경로 맵 이상 발견 시 **배포 확대 중지 → 롤백**.
6. QA/스테이징 환경은 인증 또는 접근 제어(호스트의 비밀번호 보호 또는 `proxy.ts` 확장)로 보호하고 색인시키지 않는다.

## 6. 롤백

- 코드: 직전 태그로 재배포 (`git checkout v<이전 태그> && npm ci && npm run build` 또는 호스팅의 이전 배포 승격).
- 콘텐츠: 대장에서 해당 pageId 를 `hold`/`retired` 로 바꾸고 재빌드 → 경로는 404(삭제 경로는 상황에 따라 410 을 호스트에서 설정). 통합은 동등 목적지가 있을 때만 `redirect-map.json` 에 301/308 한 번으로 등록.
- 데이터: `var/inquiries.jsonl`·`var/audit.log` 는 append-only. DB 어댑터로 바꾼 경우 마이그레이션 복구 절차를 어댑터 문서에 둔다.
- 사이트맵: 롤백 후 직전 XML 과 diff 하여 빠진 URL 을 확인하고 콘솔에 재제출.

## 7. 신규 도메인·이전

- jndsystem.kr 등록자·DNS·인증서(호스트 자동 발급)·메일 레코드(MX/SPF — 이메일 수신처 결정 후)·호스팅 상태를 운영자와 검증. 서치콘솔 DNS TXT 는 운영자 DNS 에 추가.
- 기존 사이트(제이앤디시스템.com)는 PPTX 06-8 회신이 "해당사항없음"이므로 URL 이전 없음이 기본. 이전을 승인하면 백업·유입 상위 URL·외부 링크·URL별 매핑을 확보한 뒤 `redirect-map.json` 의 비활성 항목을 검증·활성화하고 Google 의 사이트 이전 가이드에 따라 콘솔에 변경 주소를 알린다. 쇼핑몰(jndmall.co.kr) 경로·DNS 는 전환하지 않는다.

## 8. 측정

- 전화·문자 버튼 클릭(`tel:`/`sms:` 클릭 이벤트)과 서버가 확정한 폼 접수(접수 ID)를 분리해 집계. 테스트 접수(`mode=test`)는 운영 지표에서 제외(`contact_submit_test`).
- 분석 도구에 전화번호·이름·사진·문의 본문을 보내지 않는다(이벤트 페이로드는 접수 ID 만).
- GA4 등 측정 ID 는 운영자 계정에서 발급(PPTX 06-6) 후 설정. 현재 미설치.
