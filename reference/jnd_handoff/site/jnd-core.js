// 3개 시안 공통 동작 로직 (화면 이동, 지역 탐색, 필터, 폼, 관리자 편집기)
export const initState = () => ({
  screen: 'home', step: 0, sym: null, pick: null, svc: 'sensor',
  bc: null, bg: null, rc: '용인시', rg: '처인구', rdg: null, symOpen: 0,
  caseId: 'c1', fr: '전체', fs: '전체',
  form: { name: '', phone: '', area: '', sym: '', msg: '' }, agree: false, sent: false, formTried: false,
  lid: '', lpw: '', lerr: false,
  pf: '전체', q: '', loading: false, treeOpen: { '용인시': true },
  es: 0, mode: 'page',
  ed: { city: '용인시', gu: '처인구', dong: '김량장동', title: '', body: '김량장동 상가·병원·사무실 출입구 자동문을 점검합니다. 문이 안 열리거나, 닫히다 다시 열리거나, 제멋대로 움직일 때 증상을 알려주시면 원인을 먼저 설명드리고 수리합니다.', caseId: 'c1', photos: [{ n: 'IMG_0412.jpg', alt: '김량장동 상가 출입구 자동문 스위치 점검 모습' }, { n: 'IMG_0413.jpg', alt: '' }] },
  seoEdit: false, seo: { t: '', d: '', c: '' }, pv: 'm', toast: null,
  inqOpen: 0, inqDone: {}, nr: { p: '경기', city: '용인시', gu: '처인구', dongs: ['김량장동', '역북동', '삼가동'], inp: '', tpl: 0 },
  mapSel: null
});

export function build(self, T) {
  const S = self.state, D = S.D;
  const set = (o) => self.setState(o);
  const go = (screen, x) => () => { self.setState({ screen, ...(x || {}) }); try { window.scrollTo(0, 0); } catch (e) {} };
  const toast = (t) => { set({ toast: t }); clearTimeout(self._tt); self._tt = setTimeout(() => set({ toast: null }), 2400); };
  const short = (c) => c.replace(/(특별시|광역시|시)$/, '');
  const rname = (c, g, d) => [g === '전체' ? short(c) : short(c) + ' ' + g, d].filter(Boolean).join(' ');
  const city = (n) => D.CITIES.find((x) => x.c === n);
  const chip = (on) => (on ? T.on : T.off);
  const svcOf = (id) => D.SVCS.find((x) => x.id === id);
  const desk = S.w >= 1024;
  const s = {}; [...D.MENU_U, ...D.MENU_A].forEach(([k]) => (s[k] = S.screen === k));
  const adminKeys = D.MENU_A.map((m) => m[0]).filter((k) => k !== 'login');
  const isAdmin = adminKeys.includes(S.screen);
  const isUser = !isAdmin && S.screen !== 'login';
  const menuU = D.MENU_U.map(([k, l]) => ({ k, l })), menuA = D.MENU_A.map(([k, l]) => ({ k, l }));
  const curLabel = [...D.MENU_U, ...D.MENU_A].find((m) => m[0] === S.screen)[1];

  // home diagnosis
  const sym = D.SYMS.find((x) => x.id === S.sym) || D.SYMS[0];
  const pk = D.PICKS.find((x) => x.l === S.pick) || D.PICKS[0];
  const symList = D.SYMS.map((o) => ({ ...o, ...chip(S.sym === o.id), on: S.sym === o.id, pick: () => set({ sym: o.id, step: 1 }) }));
  const picks = D.PICKS.map((p) => ({ ...p, ...chip(S.pick === p.l), pickIt: () => set({ pick: p.l, step: 2 }) }));
  const resCase = D.CASES.find((c) => c.svc === sym.svc);
  const home = {
    step0: S.step === 0, step1: S.step === 1, step2: S.step === 2, canBack: S.step > 0,
    progress: ['33%', '66%', '100%'][S.step], stepLabel: (S.step + 1) + ' / 3',
    back: () => set({ step: Math.max(0, S.step - 1) }), restart: () => set({ step: 0, sym: null, pick: null }),
    sym, pk, svc: svcOf(sym.svc), hasCase: !!resCase, rcase: resCase, outArea: !pk.c, inArea: !!pk.c,
    openCase: go('caseDetail', { caseId: resCase ? resCase.id : 'c1' }),
    openRegion: go('regionDetail', { rc: pk.c || '용인시', rg: pk.g || '처인구', rdg: null }),
    actSteps: sym.act.map((t, i) => ({ t, n: i + 1 }))
  };

  // services
  const sv = svcOf(S.svc);
  const svcCards = D.SVCS.map((o) => ({ ...o, open: go('serviceDetail', { svc: o.id }), ...chip(S.svc === o.id), pick: () => set({ svc: o.id }) }));
  const svSyms = D.SYMS.filter((x) => x.svc === sv.id);
  const svCases = D.CASES.filter((c) => c.svc === sv.id).map((c) => ({ ...c, open: go('caseDetail', { caseId: c.id }) }));

  // region browse
  const bcity = S.bc && city(S.bc);
  const single = bcity && bcity.gus.length === 1;
  const lvl = !bcity ? 0 : (single || S.bg) ? 2 : 1;
  const bgu = bcity && (single ? bcity.gus[0] : bcity.gus.find((g) => g.g === S.bg));
  const browse = {
    l0: lvl === 0, l1: lvl === 1, l2: lvl === 2,
    title: lvl === 0 ? '어느 지역인가요?' : lvl === 1 ? bcity.c + '의 어느 구인가요?' : (single ? bcity.c : short(bcity.c) + ' ' + S.bg) + ' 어느 동인가요?',
    groups: ['경기', '서울', '인천', '충청'].map((p) => ({ p, items: D.CITIES.filter((c) => c.p === p).map((c) => ({ t: c.c, tag: c.tag, n: c.gus.reduce((a, g) => a + g.d.length, 0) + c.gus.length, isHq: c.tag === '본사', open: () => set({ bc: c.c, bg: null }) })) })),
    gus: bcity && !single ? bcity.gus.map((g) => ({ t: g.g, n: g.d.length, preview: g.d.slice(0, 3).join(' · '), open: () => set({ bg: g.g }) })) : [],
    dongs: bgu ? bgu.d.map((d) => ({ t: d, open: go('regionDetail', { rc: bcity.c, rg: bgu.g, rdg: d }) })) : [],
    openAll: bgu ? go('regionDetail', { rc: bcity.c, rg: bgu.g, rdg: null }) : null,
    allLabel: bgu ? rname(bcity.c, bgu.g) + ' 전체 안내 보기' : '',
    crumbs: [{ t: '전체 지역', go: () => set({ bc: null, bg: null }) }].concat(bcity ? [{ t: bcity.c, go: () => set({ bg: null }) }] : []).concat(bcity && S.bg ? [{ t: S.bg, go: () => {} }] : []),
    up: () => (S.bg ? set({ bg: null }) : set({ bc: null })), canUp: lvl > 0
  };

  // region detail
  const rcity = city(S.rc) || D.CITIES[3];
  const rgu = rcity.gus.find((g) => g.g === S.rg) || rcity.gus[0];
  const rn = rname(rcity.c, rgu.g, S.rdg);
  const rcasesExact = D.CASES.filter((c) => c.city === rcity.c && (rgu.g === '전체' || c.gu === rgu.g));
  const rcases = (rcasesExact.length ? rcasesExact : D.CASES.slice(0, 3)).map((c) => ({ ...c, open: go('caseDetail', { caseId: c.id }) }));
  const rd = {
    name: rn, h1: rn + ' 자동문 수리', guName: rname(rcity.c, rgu.g), isDong: !!S.rdg, cityName: rcity.c, tag: rcity.tag,
    sub: rn + ' 상가·병원·사무실 출입구 자동문의 센서, 스위치, 컨트롤러, 번호키 고장을 점검하고 수리해요.',
    dongs: rgu.d.map((d) => ({ t: d, ...chip(d === S.rdg), open: () => set({ rdg: d }) })),
    dongCount: rgu.d.length + '개 읍·면·동',
    syms: D.SYMS.slice(0, 6).map((o, i) => ({ ...o, open: S.symOpen === i, closed: S.symOpen !== i, toggle: () => set({ symOpen: S.symOpen === i ? -1 : i }), svcT: svcOf(o.svc).t })),
    cases: rcases, exact: rcasesExact.length > 0, nearby: rcasesExact.length === 0,
    faq: [
      { q: rn + '도 출장 오나요?', a: '네. ' + rn + ' 전 지역 출장 점검해요. 도착 시간은 전화 주시면 바로 안내해 드려요.' },
      { q: rn + ' 수리 비용은 어떻게 정해지나요?', a: '현장 사진과 증상을 확인한 뒤 비용을 먼저 안내하고, 동의하시면 작업해요.' },
      { q: '어떤 자동문을 수리하나요?', a: '상가·건물 출입구의 슬라이딩 자동문 센서, 스위치, 컨트롤러, 번호키를 점검·교체해요.' },
      { q: '상담 가능한 시간은요?', a: D.INFO.hours + ' 전화 상담이 가능해요.' }
    ],
    crumbs: [rcity.c].concat(rgu.g !== '전체' ? [rgu.g] : []).concat(S.rdg ? [S.rdg] : []).join(' › '),
    toGu: () => set({ rdg: null })
  };

  // cases
  const FR = ['전체', ...new Set(D.CASES.map((c) => c.area))], FS = ['전체', '센서', '스위치', '컨트롤러', '번호키', '설치'];
  const caseList = D.CASES.filter((c) => (S.fr === '전체' || c.area === S.fr) && (S.fs === '전체' || c.svcT === S.fs)).map((c, i) => ({ ...c, open: go('caseDetail', { caseId: c.id }), no: String(i + 1).padStart(2, '0') }));
  const cases = {
    fr: FR.map((t) => ({ t, ...chip(S.fr === t), pick: () => set({ fr: t }) })),
    fs: FS.map((t) => ({ t, ...chip(S.fs === t), pick: () => set({ fs: t }) })),
    list: caseList, empty: caseList.length === 0, has: caseList.length > 0, count: caseList.length,
    reset: () => set({ fr: '전체', fs: '전체' }),
    all: D.CASES.map((c) => ({ ...c, open: go('caseDetail', { caseId: c.id }) }))
  };
  const cs0 = D.CASES.find((c) => c.id === S.caseId);
  const cs = {
    ...cs0, svcName: svcOf(cs0.svc).t,
    steps: [{ k: '증상', v: cs0.sym, icon: 'circle-alert', n: '01' }, { k: '점검', v: cs0.check, icon: 'search', n: '02' }, { k: '조치', v: cs0.act, icon: 'wrench', n: '03' }, { k: '결과', v: cs0.res, icon: 'circle-check', n: '04' }],
    others: D.CASES.filter((c) => c.id !== cs0.id).slice(0, 3).map((c) => ({ ...c, open: go('caseDetail', { caseId: c.id }) })),
    toRegion: go('regionDetail', { rc: cs0.city, rg: cs0.gu === '전체' ? city(cs0.city).gus[0].g : cs0.gu, rdg: cs0.id === 'c5' ? '양벌동' : null })
  };

  // faq
  const faqGroups = ['고장·증상', '비용·출장', '서비스'].map((cat) => ({ cat, items: D.FAQ.filter((f) => f.cat === cat) }));

  // contact
  const F = S.form;
  const fset = (k) => (e) => set({ form: { ...S.form, [k]: e.target.value } });
  const canSubmit = F.name.trim() && F.phone.trim() && S.agree;
  const contact = {
    on: { name: fset('name'), phone: fset('phone'), area: fset('area'), sym: fset('sym'), msg: fset('msg') },
    canSubmit: !!canSubmit, cannot: !canSubmit, agree: S.agree, agreeOff: !S.agree && !(S.formTried && !S.agree),
    toggleAgree: () => set({ agree: !S.agree }),
    submit: (e) => { e && e.preventDefault && e.preventDefault(); if (!canSubmit) { set({ formTried: true }); return; } set({ sent: true }); },
    tried: S.formTried && !canSubmit, sent: S.sent, notSent: !S.sent,
    nameErr: S.formTried && !F.name.trim(), phoneErr: S.formTried && !F.phone.trim(), agreeErr: S.formTried && !S.agree,
    reset: () => set({ sent: false, formTried: false, agree: false, form: { name: '', phone: '', area: '', sym: '', msg: '' } }),
    symOpts: D.SYMS.map((x) => x.t)
  };

  // login
  const login = {
    onId: (e) => set({ lid: e.target.value, lerr: false }), onPw: (e) => set({ lpw: e.target.value, lerr: false }),
    submit: (e) => { e && e.preventDefault && e.preventDefault(); if (!S.lid || !S.lpw) set({ lerr: true }); else go('dash')(); },
    err: S.lerr, demo: go('dash')
  };

  // admin pages list
  const PF = ['전체', '발행', '비공개', '임시저장'];
  const badge = (st) => T.badge[st] || T.badge['발행'];
  const pageRows = D.PAGES.filter((p) => (S.pf === '전체' || p.st === S.pf) && (!S.q || p.t.includes(S.q) || p.path.includes(S.q))).map((p) => ({ ...p, ...badge(p.st), open: go('editor', { mode: 'page', es: 0 }) }));
  const loadFor = (o) => { set({ ...o, loading: true }); clearTimeout(self._lt); self._lt = setTimeout(() => set({ loading: false }), 600); };
  const countSt = (st) => D.PAGES.filter((p) => st === '전체' || p.st === st).length;
  const pages = {
    pf: PF.map((t) => ({ t, n: countSt(t), ...chip(S.pf === t), pick: () => loadFor({ pf: t }) })),
    q: S.q, onQ: (e) => loadFor({ q: e.target.value }), clearQ: () => set({ q: '' }),
    rows: pageRows, loading: S.loading, ready: !S.loading && pageRows.length > 0, empty: !S.loading && pageRows.length === 0, skel: [1, 2, 3, 4],
    reset: () => set({ q: '', pf: '전체' })
  };
  const tree = D.CITIES.map((c) => ({
    t: c.c, n: c.gus.reduce((a, g) => a + g.d.length, 0), open: !!S.treeOpen[c.c], closed: !S.treeOpen[c.c],
    toggle: () => set({ treeOpen: { ...S.treeOpen, [c.c]: !S.treeOpen[c.c] } }),
    gus: c.gus.map((g) => ({ t: g.g === '전체' ? c.c + ' 전체' : g.g, d: g.d.map((d, i) => ({ t: d, st: i % 5 === 3 ? '임시저장' : i % 7 === 5 ? '비공개' : '발행', ...badge(i % 5 === 3 ? '임시저장' : i % 7 === 5 ? '비공개' : '발행'), open: go('editor', { mode: 'page', es: 0, ed: { ...S.ed, city: c.c, gu: g.g, dong: d, title: '' } }) })) }))
  }));

  // editor (page / case)
  const E = S.ed, isCase = S.mode === 'case';
  const ecity = city(E.city) || D.CITIES[3];
  const egu = ecity.gus.find((g) => g.g === E.gu) || ecity.gus[0];
  const ecase = D.CASES.find((c) => c.id === E.caseId);
  const ern = rname(ecity.c, egu.g, E.dong);
  const autoT = isCase ? ecase.place + ' ' + ecase.title + ' 시공사례 | ' + D.BRAND : ern + ' 자동문 수리 | ' + D.BRAND;
  const autoD = isCase ? ecase.place + ' 자동문 ' + ecase.sym + ' 증상, ' + ecase.title + '으로 해결한 시공사례입니다. 점검부터 결과까지 사진으로 확인하세요.' : ern + ' 자동문 센서·스위치·컨트롤러 고장 점검과 교체. 증상별 원인과 조치 방법, 가까운 시공사례를 확인하고 바로 전화 상담하세요.';
  const autoC = isCase ? 'https://' + D.INFO.domain + '/시공사례/' + ecase.id : 'https://' + D.INFO.domain + '/지역/' + ecity.c + (egu.g !== '전체' ? '/' + egu.g : '') + (E.dong ? '/' + E.dong : '');
  const seo = S.seoEdit ? S.seo : { t: autoT, d: autoD, c: autoC };
  const eset = (k) => (e) => set({ ed: { ...S.ed, [k]: e.target.value } });
  const steps = isCase ? ['사례 정보', '증상·조치', '사진', '검색 설정', '미리보기·발행'] : ['지역 선택', '제목·본문', '사진', '검색 설정', '미리보기·발행'];
  const editor = {
    isCase, isPage: !isCase, kind: isCase ? '시공사례' : '지역 페이지',
    steps: steps.map((t, i) => ({ t, n: i + 1, cur: i === S.es, done: i < S.es, todo: i > S.es, ...(i === S.es ? T.stepOn : i < S.es ? T.stepDone : T.stepOff), go: () => set({ es: i }) })),
    st0: S.es === 0, st1: S.es === 1, st2: S.es === 2, st3: S.es === 3, st4: S.es === 4, stepT: steps[S.es], stepN: S.es + 1, progress: ((S.es + 1) / 5 * 100) + '%',
    prev: () => set({ es: Math.max(0, S.es - 1) }), next: () => set({ es: Math.min(4, S.es + 1) }), hasPrev: S.es > 0, hasNext: S.es < 4, isLast: S.es === 4,
    cities: D.CITIES.map((c) => c.c), gus: ecity.gus.map((g) => g.g), dongs: [''].concat(egu.d),
    city: ecity.c, gu: egu.g, dong: E.dong || '', name: ern,
    onCity: (e) => { const c = city(e.target.value); set({ ed: { ...S.ed, city: c.c, gu: c.gus[0].g, dong: c.gus[0].d[0] } }); },
    onGu: (e) => { const g = ecity.gus.find((x) => x.g === e.target.value); set({ ed: { ...S.ed, gu: g.g, dong: g.d[0] } }); },
    onDong: eset('dong'),
    title: E.title || (isCase ? ecase.place + ' ' + ecase.title : ern + ' 자동문 수리'), onTitle: eset('title'),
    body: E.body, onBody: eset('body'),
    caseOpts: D.CASES.map((c) => ({ v: c.id, t: c.place + ' — ' + c.title })), caseId: E.caseId,
    onCase: (e) => set({ ed: { ...S.ed, caseId: e.target.value } }), ecase, ecaseSvc: svcOf(ecase.svc).t,
    photos: E.photos.map((p, i) => ({ ...p, no: i + 1, missing: !p.alt, ok: !!p.alt, onAlt: (e) => { const ph = S.ed.photos.slice(); ph[i] = { ...ph[i], alt: e.target.value }; set({ ed: { ...S.ed, photos: ph } }); }, remove: () => set({ ed: { ...S.ed, photos: S.ed.photos.filter((_, j) => j !== i) } }) })),
    addPhoto: () => set({ ed: { ...S.ed, photos: S.ed.photos.concat([{ n: 'IMG_04' + (14 + S.ed.photos.length) + '.jpg', alt: '' }]) } }),
    altMissing: E.photos.filter((p) => !p.alt).length, altAllOk: E.photos.every((p) => p.alt), altWarn: E.photos.some((p) => !p.alt),
    seoEdit: S.seoEdit, seoAuto: !S.seoEdit, seo,
    tLen: seo.t.length + '자', dLen: seo.d.length + '자', tOver: seo.t.length > 40, dOver: seo.d.length > 120,
    toggleSeo: () => set(S.seoEdit ? { seoEdit: false } : { seoEdit: true, seo: { t: autoT, d: autoD, c: autoC } }),
    resetSeo: () => set({ seoEdit: false }),
    onSeoT: (e) => set({ seo: { ...S.seo, t: e.target.value } }), onSeoD: (e) => set({ seo: { ...S.seo, d: e.target.value } }), onSeoC: (e) => set({ seo: { ...S.seo, c: e.target.value } }),
    pvM: S.pv === 'm', pvPC: S.pv === 'pc', setM: () => set({ pv: 'm' }), setPC: () => set({ pv: 'pc' }), pvM2: chip(S.pv === 'm'), pvPC2: chip(S.pv === 'pc'),
    pvWidth: S.pv === 'm' ? '320px' : '100%',
    serpUrl: autoC.replace('https://', '').split('/').join(' › '),
    publish: () => { toast((isCase ? '시공사례' : '지역 페이지') + '를 발행했어요'); },
    saveDraft: () => toast('임시저장했어요'),
    hide: () => toast('비공개로 저장했어요'),
    back: go(isCase ? 'adminCases' : 'pages')
  };

  // new region
  const N = S.nr;
  const newRegion = {
    ...N, onP: (e) => set({ nr: { ...N, p: e.target.value } }), onCity: (e) => set({ nr: { ...N, city: e.target.value } }), onGu: (e) => set({ nr: { ...N, gu: e.target.value } }),
    onInp: (e) => set({ nr: { ...N, inp: e.target.value } }),
    add: () => { const v = N.inp.trim(); if (v && !N.dongs.includes(v)) set({ nr: { ...N, dongs: N.dongs.concat([v]), inp: '' } }); },
    onKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = N.inp.trim(); if (v && !N.dongs.includes(v)) set({ nr: { ...N, dongs: N.dongs.concat([v]), inp: '' } }); } },
    dongChips: N.dongs.map((d) => ({ t: d, rm: () => set({ nr: { ...N, dongs: N.dongs.filter((x) => x !== d) } }) })),
    count: N.dongs.length + 1, guName: (N.city ? short(N.city) : '') + ' ' + N.gu,
    tpls: ['기본형 — 증상별 안내 + 사례 + FAQ', '사례 강조형 — 가까운 시공사례 먼저', '간단형 — 출장 범위 + 전화 CTA'].map((t, i) => ({ t, on: N.tpl === i, off: N.tpl !== i, ...chip(N.tpl === i), pick: () => set({ nr: { ...N, tpl: i } }) })),
    preview: [N.gu ? (N.city ? short(N.city) : '') + ' ' + N.gu + ' 자동문 수리' : ''].concat(N.dongs.map((d) => (N.city ? short(N.city) : '') + ' ' + N.gu + ' ' + d + ' 자동문 수리')).filter(Boolean),
    create: () => { toast((N.dongs.length + 1) + '개 페이지를 임시저장으로 만들었어요'); go('pages', { pf: '임시저장' })(); },
    can: !!(N.city && N.gu), cannot: !(N.city && N.gu)
  };

  // admin cases
  const adminCases = D.CASES.map((c, i) => ({ ...c, st: i === 3 ? '임시저장' : '발행', ...badge(i === 3 ? '임시저장' : '발행'), d: ['10.27', '10.22', '10.18', '10.15', '10.09'][i], open: go('caseEditor', { mode: 'case', es: 0, ed: { ...S.ed, caseId: c.id } }) }));

  // inquiries
  const inq = D.INQ.map((x, i) => {
    const st = S.inqDone[i] ? '연락 완료' : x.st;
    return { ...x, st, isNew: st === '새 문의', isDone: st !== '새 문의', ...(st === '새 문의' ? T.badge['새 문의'] : T.badge['비공개']), open: S.inqOpen === i, closed: S.inqOpen !== i, sel: S.inqOpen === i ? T.selRow : T.row, toggle: () => set({ inqOpen: S.inqOpen === i ? -1 : i }), done: () => { set({ inqDone: { ...S.inqDone, [i]: true } }); toast('연락 완료로 바꿨어요'); } };
  });
  const inqSel = inq[S.inqOpen] || null;
  const newCount = inq.filter((x) => x.isNew).length;

  const dash = {
    stats: [
      { k: '전체 페이지', v: '252', sub: '발행 238 · 비공개 6 · 임시 8', icon: 'file-text', to: go('pages', { pf: '전체' }) },
      { k: '이번 주 발행', v: '12', sub: '지역 9 · 시공사례 3', icon: 'send', to: go('pages', { pf: '발행' }) },
      { k: '새 문의', v: String(newCount), sub: '확인하지 않은 문의', icon: 'message-square', to: go('inquiries') },
      { k: '검색 등록', v: '230', sub: '색인 요청 완료 · 대기 22', icon: 'globe', to: go('pages') }
    ],
    recent: D.PAGES.filter((p) => p.st === '발행').slice(0, 4).map((p) => ({ ...p, open: go('editor', { mode: 'page', es: 0 }) })),
    inq: inq.slice(0, 3).map((x, i) => ({ ...x, open: go('inquiries', { inqOpen: i }) })),
    index: [{ k: '색인 완료', v: 230, pct: '91%' }, { k: '요청 대기', v: 14, pct: '6%' }, { k: '오류', v: 8, pct: '3%' }]
  };

  const adminNav = [['dash', '대시보드', 'layout-dashboard'], ['pages', '지역 페이지', 'map-pin'], ['newRegion', '새 지역 추가', 'map-pin-plus'], ['adminCases', '시공사례', 'images'], ['inquiries', '문의 내역', 'inbox'], ['states', '상태 화면', 'layers']].map(([k, t, icon]) => {
    const on = S.screen === k || (k === 'pages' && S.screen === 'editor') || (k === 'adminCases' && S.screen === 'caseEditor');
    return { k, t, icon, on, badge: k === 'inquiries' ? String(newCount) : '', hasBadge: k === 'inquiries' && newCount > 0, ...(on ? T.navOn : T.navOff), go: go(k) };
  });

  return {
    D, B: D.BRAND, P: D.PHONE, I: D.INFO, s, desk, mob: !desk, isUser, isAdmin, isLogin: S.screen === 'login',
    callBar: isUser && !desk, menuU, menuA, cur: S.screen, curLabel,
    onMenu: (e) => go(e.target.value)(), toast: S.toast, hasToast: !!S.toast,
    nav: {
      home: go('home', { step: 0 }), about: go('about'), services: go('services'), service: go('serviceDetail'), regions: go('regions', { bc: null, bg: null }),
      region: go('regionDetail'), cases: go('cases'), caseD: go('caseDetail'), faq: go('faq'), contact: go('contact'), privacy: go('privacy'), nf: go('notfound'),
      login: go('login'), dash: go('dash'), pages: go('pages'), editor: go('editor', { mode: 'page', es: 0 }), newRegion: go('newRegion'), adminCases: go('adminCases'),
      caseEditor: go('caseEditor', { mode: 'case', es: 0 }), inquiries: go('inquiries'), states: go('states'),
      yongin: go('regionDetail', { rc: '용인시', rg: '처인구', rdg: null })
    },
    home, svcCards, sv, svSyms, svHasCases: svCases.length > 0, svNoCases: svCases.length === 0, svCases,
    browse, rd, cases, cs, faqGroups, contact, login, pages, tree, editor, newRegion, adminCases, inq, inqSel, hasInqSel: !!inqSel, newCount, dash, adminNav,
    cities: D.CITIES, chip
  };
}
