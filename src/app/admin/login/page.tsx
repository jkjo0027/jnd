import Icon from '@/components/Icon';
import LogoMark from '@/components/Logo';
import { BRAND } from '@/lib/site';
import { configured } from '@/lib/server/auth';

export default async function Login({ searchParams }: { searchParams: Promise<{ err?: string; next?: string }> }) {
  const sp = await searchParams;
  const ok = configured();
  return (
    <main className="login">
      <form action="/api/admin/login" method="post">
        <span style={{ marginBottom: 8 }}><LogoMark size={56} ring="#F8F9FA" /></span>
        <h1>{BRAND}<br />관리자 로그인</h1>
        {!ok && <p className="err"><Icon name="circle-alert" size={18} />관리자 계정이 아직 설정되지 않았어요 (.env ADMIN_USERS, ADMIN_SESSION_SECRET)</p>}
        {sp.err && <p className="err" role="alert"><Icon name="circle-alert" size={18} />아이디와 비밀번호를 확인해 주세요</p>}
        <input name="id" placeholder="아이디" autoComplete="username" required maxLength={64} />
        <input name="pw" type="password" placeholder="비밀번호" autoComplete="current-password" required maxLength={200} />
        <input type="hidden" name="next" value={sp.next || '/admin/'} />
        <button type="submit" className="btn btn-primary submit" disabled={!ok}>로그인</button>
        <p style={{ margin: 0, fontSize: 'var(--fs-c)', color: 'var(--g500)', textAlign: 'center' }}>데모 계정 없음 — 운영자 명의 계정을 발급한 뒤 초대합니다.</p>
      </form>
    </main>
  );
}
