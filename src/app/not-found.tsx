import Link from 'next/link';
import PublicShell from '@/components/PublicShell';

export default function NotFound() {
  return (
    <PublicShell>
      <main className="nf">
        <p className="k">404</p>
        <h1>찾으시는 페이지가<br />없어요</h1>
        <p className="d">주소가 바뀌었거나 삭제된 페이지예요.<br />자동문 고장이라면 증상부터 알려주세요.</p>
        <div className="acts">
          <Link href="/#diagnose" className="btn btn-primary">증상으로 진단하기</Link>
          <Link href="/areas/" className="btn btn-g100">우리 지역 찾기</Link>
        </div>
      </main>
    </PublicShell>
  );
}
