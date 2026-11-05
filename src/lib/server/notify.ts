import 'server-only';
import type { Inquiry } from './store';
/**
 * 접수 알림. 운영 연동(CONTACT_NOTIFY_WEBHOOK 또는 이메일 서비스) 전에는 skipped.
 * 저장이 끝난 뒤 호출되며 실패해도 접수 성공은 유지된다(관리자 문의함에서 재시도).
 */
export async function notify(x: Inquiry): Promise<{ status: Inquiry['notify']['status']; error?: string }> {
  if (x.mode === 'test') return { status: 'skipped' };
  const hook = process.env.CONTACT_NOTIFY_WEBHOOK;
  if (!hook) return { status: 'skipped' };
  try {
    const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, at: x.at, name: x.name, phone: x.phone, area: x.area, sym: x.sym, bld: x.bld, msg: x.msg }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { status: 'failed', error: `webhook ${r.status}` };
    return { status: 'sent' };
  } catch (e) { return { status: 'failed', error: e instanceof Error ? e.message : String(e) }; }
}
