import { NextResponse, type NextRequest } from 'next/server';
import { append, findByIdem, newId, update, claimNotification, type Inquiry } from '@/lib/server/store';
import { allow } from '@/lib/server/ratelimit';
import { notify } from '@/lib/server/notify';

export const runtime = 'nodejs';
const MAX_BODY = 16 * 1024;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '');
const PHONE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

async function finish(inquiry: Inquiry, duplicate: boolean) {
  if (inquiry.mode === 'test') return NextResponse.json({ id: inquiry.id, notify: 'skipped', duplicate });
  const claim = await claimNotification(inquiry.id);
  if (!claim.claimed) {
    if (claim.inquiry.notify.status === 'sent') return NextResponse.json({ id: inquiry.id, notify: 'sent', duplicate });
    return NextResponse.json({ id: inquiry.id, notify: 'retry', error: '문의를 전달하고 있어요. 잠시 후 같은 내용으로 다시 확인해 주세요.', retryable: true }, { status: 202 });
  }
  const result = await notify(claim.inquiry);
  await update(inquiry.id, { notify: { status: result.status, attempts: claim.inquiry.notify.attempts, lastAt: new Date().toISOString(), lastError: result.error } });
  if (result.status !== 'sent') return NextResponse.json({ id: inquiry.id, notify: result.status, error: '문의는 저장됐지만 알림 전달에 실패했어요. 다시 보내기를 누르거나 전화로 문의해 주세요.', retryable: true }, { status: 502 });
  return NextResponse.json({ id: inquiry.id, notify: 'sent', duplicate });
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) return NextResponse.json({ error: '요청이 너무 커요.' }, { status: 413 });
  let body: Record<string, unknown>;
  let raw = '';
  try { raw = await req.text(); } catch { return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 }); }
  if (raw.length > MAX_BODY) return NextResponse.json({ error: '요청이 너무 커요.' }, { status: 413 });
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 }); }
  const idem = str(req.headers.get('idempotency-key') || body.idem, 80);
  if (idem) {
    try { const dup = await findByIdem(idem); if (dup) return await finish(dup, true); }
    catch { return NextResponse.json({ error: '접수 상태 확인에 실패했어요. 잠시 후 다시 시도해 주세요.', retryable: true }, { status: 503 }); }
  }
  // 중복 제출(같은 키)은 토큰을 소비하지 않는다. 신규 접수는 IP 당 10분에 5건
  if (!allow('contact:' + ip, 5, 10 * 60 * 1000)) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요. (짧은 시간에 너무 많은 요청)', retryable: true }, { status: 429 });
  const name = str(body.name, 40), phone = str(body.phone, 20).replace(/\s/g, ''), area = str(body.area, 120), sym = str(body.sym, 60), bld = str(body.bld, 20), msg = str(body.msg, 2000);
  if (!name) return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 });
  if (!PHONE.test(phone)) return NextResponse.json({ error: '연락처 형식을 확인해 주세요.' }, { status: 400 });
  if (body.agree !== true) return NextResponse.json({ error: '개인정보 수집·이용 동의가 필요해요.' }, { status: 400 });
  if (str(body.website, 10)) return NextResponse.json({ id: newId(), notify: 'skipped' }); // honeypot
  const x: Inquiry = {
    id: newId(), at: new Date().toISOString(), name, phone, area, sym, bld, msg, agree: true, source: str(body.source, 200), ip, ua: str(req.headers.get('user-agent'), 200),
    mode: process.env.CONTACT_MODE === 'live' ? 'live' : 'test', notify: { status: 'skipped', attempts: 0 }, status: 'new', idem: idem || newId(),
  };
  try {
    const saved = await append(x);
    return await finish(saved.inquiry, !saved.created);
  } catch { return NextResponse.json({ error: '접수 처리에 실패했어요. 잠시 후 다시 시도해 주세요.', retryable: true }, { status: 503 }); }
}
export function GET() { return NextResponse.json({ error: 'method' }, { status: 405 }); }
