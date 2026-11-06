import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { readJSON, updateJSON } from './persistence';

/**
 * 문의 접수 백업 기록. CONTACT_STORE=file(기본) 은 var/inquiries.jsonl(비공개 경로, git 제외) 에 append.
 * 관리자 화면에는 문의 내역을 두지 않는다 — 접수는 알림 채널(CONTACT_NOTIFY_WEBHOOK/EMAIL)로 전달하고 이 파일은 접수 ID·중복 방지·장애 시 복구용이다.
 * 서버리스(쓰기 불가) 환경에서는 운영자가 DB/외부 저장소 어댑터를 설정해야 한다 (docs/release-and-rollback.md).
 */
export type Inquiry = {
  id: string; at: string; name: string; phone: string; area: string; sym: string; bld: string; msg: string; agree: true; source: string; ip: string; ua: string;
  mode: 'test' | 'live'; notify: { status: 'skipped' | 'sent' | 'failed' | 'retry'; attempts: number; lastError?: string; lastAt?: string }; status: 'new' | 'done'; idem: string;
};
const VAR = path.join(process.cwd(), 'var');
const FILE = path.join(VAR, 'inquiries.jsonl');
const mem: Inquiry[] = [];
const fileStore = () => (process.env.CONTACT_STORE || 'file') === 'file';

export const newId = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `JND-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};
export function readAll(): Inquiry[] {
  if (!fileStore()) return mem.slice();
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Inquiry);
}
export function findByIdem(idem: string) { return readAll().find((x) => x.idem === idem) || null; }
export function append(x: Inquiry) {
  if (!fileStore()) { mem.push(x); return; }
  fs.mkdirSync(VAR, { recursive: true });
  fs.appendFileSync(FILE, JSON.stringify(x) + '\n', { mode: 0o600 });
}
export function update(id: string, patch: Partial<Inquiry>) {
  const all = readAll().map((x) => (x.id === id ? { ...x, ...patch } : x));
  if (!fileStore()) { mem.splice(0, mem.length, ...all); return; }
  fs.mkdirSync(VAR, { recursive: true });
  fs.writeFileSync(FILE, all.map((x) => JSON.stringify(x)).join('\n') + (all.length ? '\n' : ''), { mode: 0o600 });
}
/** 관리자 기록과 대장 초안은 재배포와 무관하게 보존한다. */
type AuditEntry = { at?: string; who: string; action: string; target?: string; detail?: string; ip?: string };
export async function audit(entry: AuditEntry) {
  const value = { at: new Date().toISOString(), ...entry };
  await updateJSON('audit-v1.json', () => [] as AuditEntry[], (all) => { all.push(value); });
}
export async function readAudit(n = 200) {
  return (await readJSON('audit-v1.json', () => [] as AuditEntry[])).data.slice(-n);
}
export async function readDrafts(): Promise<Record<string, unknown>[]> {
  return (await readJSON('registry-drafts-v1.json', () => [] as Record<string, unknown>[])).data;
}
export async function appendDraft(d: Record<string, unknown>) {
  await updateJSON('registry-drafts-v1.json', () => [] as Record<string, unknown>[], (all) => { all.push(d); });
}
