# 제이앤디시스템 공식 사이트 — jndsystem.kr

A안 v4 디자인(옐로우 + 블랙)을 Next.js 16 App Router 로 구현한 자동문 설치·수리 사이트. 승인 기반 발행(대장), 검색 검증 도구, 운영 인수인계 문서를 포함한다.

```bash
npm ci
cp .env.example .env            # 운영 값은 운영자에게서 받음
npm run build && npm start      # http://127.0.0.1:3000
npm test                        # 레지스트리·API 테스트
npm run seo:audit               # 사이트맵 100% 크롤 감사
```

| 경로 | 내용 |
|---|---|
| `src/app` | 라우트(홈, /services, /areas, /guides, /cases, /about, /faq, /contact, /privacy, 404, sitemap, robots, /api/contact, /admin) |
| `src/components`, `src/content` | v4 이식 컴포넌트, 콘텐츠(시안 데이터·서비스·가이드 30·지역 사실 56 + 생성기 `content/gen`) |
| `data/registry` | candidate-pages · keyword-map · area-aliases · publication-ledger · redirect-map · search-evidence · content-lastmod |
| `data/ops/config.json` | 운영자 확인 플래그(전화번호·후기·로고 등 게이트) |
| `scripts` | XLSX 가져오기/검증, 대장 도구, SEO 감사, 중복 검사, 디자인 비교, OG 생성, CSV 내보내기 |
| `docs` | source-audit · design-parity · owner-approvals · release-and-rollback · search-console-runbook · content-generation |
| `reference/jnd_handoff` | 디자인 원본(참조 전용, 공개 번들에 포함하지 않음) |
| `inputs` | 엑셀 원본(ZIP 은 git 제외) |

공개 게이트: `CONTENT_GATE=strict`(운영) 에서는 대장 `approved/published` 페이지와 `data/ops/config.json` 에서 확인된 블록만 공개된다. `preview` 는 디자인 대조·내부 QA 전용이다.

## 2026-11-05 품질 감사 이후 추가된 명령

| 명령 | 역할 |
|---|---|
| `npm run ledger:upgrade` | `fact-ledger.json` 근거로 발행 대장 등급(A/B/C/D)·상태(PUBLISHED/HOLD/…) 재계산 |
| `npm run intent:audit` | 키워드 2,476개 의도 클러스터·카니벌라이제이션 분석 → `reports/intent-audit.md`, `data/export/intent-audit.csv` |
| `npm run content:audit` | 공개 URL 전수 렌더링 본문 품질(고유/템플릿 비율·확약 문구) → `reports/content-quality.md`, `data/export/content-quality.csv` |
| `npm run content:lastmod -- --base …` | 렌더링 본문 해시로 sitemap lastmod 갱신 |
| `npm run mobile:check` | 390/320px 가로 넘침·터치 타깃·글자 크기 |
| `node scripts/perf-lab.mjs` | 실험실 LCP·CLS·전송량(field 지표 아님) → `reports/perf-lab.json` |
| `npm run indexnow` | IndexNow 변경 통지 드라이런(`--submit` 은 운영자 승인 후) |
| `npm run search:dashboard` | 엔진별 발행/색인 적합/색인 확인/실노출 대시보드 → `reports/measurement-dashboard.md` |
| `npm run qa` | 위 검증을 한 번에(서버 필요) |

최종 보고: `reports/seo-geo-audit-2026-11-05.md`.

## 운영자 페이지 발행 (관리자 → 새 페이지 작성)

운영자가 코드·배포 없이 시공사례·증상 가이드·서비스·지역 서비스 페이지를 만들고 공개·수정·비공개한다. 절차·상태·사진 규칙·자동 검사·권한은 `docs/operator-publishing.md`. 수용 테스트: `node scripts/publish-acceptance.mjs --base http://127.0.0.1:3000` (관리자 계정 환경변수 필요, 44항목).

- 저장소 `var/content/`(페이지·이력), 사진 `var/uploads/`(원본 비공개 / 공개 WebP → `/uploads/{id}-{w}.webp`). `var/` 는 백업 대상이며 git 에 넣지 않는다.
- 문의 내역 화면은 두지 않는다. 문의 폼 접수는 알림 채널로 전달하고 `var/inquiries.jsonl` 은 백업 기록이다.
