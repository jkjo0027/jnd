import 'server-only';
import type { Inquiry } from './store';
import { SITE_URL } from '../site';
/**
 * 저장 후 Netlify Forms(대시보드 이메일 알림) 또는 기존 웹훅으로 전달한다.
 * sent는 전달 서비스의 접수 확인이며 수신자의 메일 열람 확인을 뜻하지 않는다.
 */
export async function notify(x: Inquiry): Promise<{ status: Inquiry['notify']['status']; error?: string }> {
  if (x.mode === 'test') return { status: 'skipped' };
  const hook = process.env.CONTACT_NOTIFY_WEBHOOK;
  try {
    if (process.env.CONTACT_NOTIFY_PROVIDER === 'netlify-forms') {
      const body = new URLSearchParams({ 'form-name': 'jnd-inquiry', subject: `제이앤디시스템 문의 ${x.id}`, inquiry_id: x.id, submitted_at: x.at, name: x.name, phone: x.phone, area: x.area, symptom: x.sym, building: x.bld, message: x.msg, source: x.source });
      const r = await fetch(new URL('/__forms.html', SITE_URL), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString(), signal: AbortSignal.timeout(8000) });
      return r.ok ? { status: 'sent' } : { status: 'failed', error: `forms ${r.status}` };
    }
    if (!hook) return { status: 'failed', error: '알림 전송 서비스가 설정되지 않았습니다.' };
    const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: x.id, at: x.at, name: x.name, phone: x.phone, area: x.area, sym: x.sym, bld: x.bld, msg: x.msg }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { status: 'failed', error: `webhook ${r.status}` };
    return { status: 'sent' };
  } catch (e) { return { status: 'failed', error: e instanceof Error ? e.message : String(e) }; }
}
