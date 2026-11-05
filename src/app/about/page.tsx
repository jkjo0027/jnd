import type { Metadata } from 'next';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import { pageMeta, orgJsonLd, JsonLd } from '@/lib/seo';
import { BRAND, INFO } from '@/lib/site';
import { AGENCY, HIST, PHOTO, QUOTE, STEPS } from '@/content/site-data';
import { consultPhones, smsPhone } from '@/lib/gate';
import { ops } from '@/lib/registry';

export const metadata: Metadata = pageMeta({
  title: '업체 소개 | 2018년 평택 설립 자동문 설치·수리 전문 | 제이앤디시스템',
  description: '제이앤디시스템은 2018년 평택에서 시작한 자동문 설치·수리 전문기업입니다. 자체 브랜드 스피드자동문 오퍼레이터·컨트롤러·스위치를 설계·공급하고, 수도권 전역 출장과 1년 무상 A/S를 제공합니다.',
  path: '/about/',
});

export default function About() {
  const sms = smsPhone();
  return (
    <PublicShell>
      <main className="page about">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '업체 소개', path: '/about/' }]} />
        <p className="k">업체 소개</p>
        <h1>멈춘 자동문,<br />원인부터 정확하게 봅니다</h1>
        <p className="lede">{BRAND}은 2018년 평택에서 시작한 자동문 설치·수리 전문기업입니다. 1인 업체가 대부분인 업계에서, 평택 본사를 중심으로 수도권 전역에 전문 대리점을 두고 있어 출장 대응과 A/S가 빠릅니다.</p>
        <div className="photo"><img src={PHOTO.about} alt={`${BRAND} 시공 현장`} loading="lazy" width={800} height={600} className="img-cover" /></div>
        <div className="facts">
          <div className="fact"><p className="k2">설립</p><p className="v">2018년 · 평택</p></div>
          <div className="fact"><p className="k2">설치 보증</p><p className="v">1년 무상 A/S</p></div>
          <div className="fact"><p className="k2">자체 브랜드</p><p className="v">스피드자동문</p></div>
        </div>
        <h2>설치는 6단계로 진행돼요</h2>
        <div className="steps6">{STEPS.map((st) => <div key={st.n}><p className="n">{st.n}</p><p className="t">{st.t}</p><p className="d">{st.d}</p></div>)}</div>
        <div className="quote">
          <div>
            <h2>견적은 문자로 빠르게</h2>
            <p className="d">아래 3가지를 보내주시면 사진을 보고 견적을 안내해 드려요.</p>
            {sms ? <a href={'sms:' + sms} className="btn btn-primary"><Icon name="message-square" />{sms} 문자 보내기</a> : <a href="/contact/#photo" className="btn btn-primary"><Icon name="message-square" />문의 폼으로 사진 보내기</a>}
          </div>
          <ol>{QUOTE.map((q) => <li key={q.n}><b className="n">{q.n}</b><span><b className="t">{q.t}</b><span className="s">{q.d}</span></span></li>)}</ol>
        </div>
        <div className="two">
          <div>
            <h2>연혁</h2>
            {HIST.map((h) => <div key={h.y} className="hist"><b>{h.y}</b><div className="items">{h.items.map((it) => <p key={it.t}><span>{it.m}</span><span>{it.t}</span></p>)}</div></div>)}
          </div>
          <div>
            <h2>전국 대리점</h2>
            {!ops.agencyListApproved && <p className="pending">대리점 목록은 운영자 확인 중이에요. 대리점 지역 문의는 본사(평택)에서 접수한 뒤 배정해 드려요.</p>}
            {AGENCY.map((a) => <div key={a.r} className="agency"><b>{a.r}</b><span>{a.l}</span></div>)}
          </div>
        </div>
        <h2>회사 정보</h2>
        <dl className="info">
          <dt>상호</dt><dd>{BRAND} (J&amp;D SYSTEM)</dd>
          <dt>대표</dt><dd>{INFO.ceo}</dd>
          <dt>사업자번호</dt><dd>{INFO.biz}</dd>
          <dt>본사</dt><dd>{INFO.addr}</dd>
          <dt>상담 시간</dt><dd>{INFO.hours}</dd>
          <dt>전화 · 팩스</dt><dd>{consultPhones().join(' · ')}<br />팩스 {INFO.fax}</dd>
          <dt>이메일</dt><dd>{INFO.email}</dd>
        </dl>
      </main>
      <JsonLd data={orgJsonLd()} />
    </PublicShell>
  );
}
