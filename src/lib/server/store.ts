import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { persistentCloud, readJSON, updateJSON } from './persistence';

/**
 * 문의 백업과 중복 방지: 운영에서는 사이트 전용 Netlify Blobs, 로컬에서는 비공개 파일.
 * 기존 로컬 JSONL은 처음 저장할 때 읽어 이전 기록을 보존한다. 문의 내역은 공개하지 않는다.
 */
export type Inquiry = {
  id: string; at: string; name: string; phone: string; area: string; sym: string; bld: string; msg: string; agree: true; source: string; ip: string; ua: string;
  mode: 'test' | 'live'; notify: { status: 'skipped' | 'sent' | 'failed' | 'retry'; attempts: number; lastError?: string; lastAt?: string }; status: 'new' | 'done'; idem: string;
};
const VAR = path.join(process.cwd(), 'var');
const FILE = path.join(VAR, 'inquiries.jsonl');
const mem: Inquiry[] = [];
const memoryStore = () => process.env.CONTACT_STORE === 'memory' && !persistentCloud();
const INQUIRIES = 'inquiries-v1.json';
const initialInquiries = (): Inquiry[] => !persistentCloud() && fs.existsSync(FILE)
  ? fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as Inquiry) : [];
async function changeInquiries<T>(change: (all: Inquiry[]) => T): Promise<T> {
  if (memoryStore()) return change(mem);
  return updateJSON(INQUIRIES, initialInquiries, change);
}

export const newId = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `JND-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};
export async function readAll(): Promise<Inquiry[]> {
  if (memoryStore()) return mem.slice();
  return (await readJSON(INQUIRIES, initialInquiries)).data;
}
export async function findByIdem(idem: string) { return (await readAll()).find((x) => x.idem === idem) || null; }
export async function append(x: Inquiry) {
  return changeInquiries((all) => {
    const existing = all.find((entry) => entry.idem === x.idem);
    if (existing) return { inquiry: existing, created: false };
    all.push(x); return { inquiry: x, created: true };
  });
}
export async function update(id: string, patch: Partial<Inquiry>) {
  await changeInquiries((all) => {
    const i = all.findIndex((entry) => entry.id === id);
    if (i < 0) throw new Error('Inquiry not found');
    all[i] = { ...all[i], ...patch };
  });
}
/** Atomic delivery lease: concurrent requests share one submission and one active sender. */
export async function claimNotification(id: string) {
  return changeInquiries((all) => {
    const entry = all.find((x) => x.id === id);
    if (!entry) throw new Error('Inquiry not found');
    if (entry.notify.status === 'sent' || entry.notify.status === 'retry' && Date.now() - Date.parse(entry.notify.lastAt || '') < 30_000) return { inquiry: entry, claimed: false };
    entry.notify = { status: 'retry', attempts: entry.notify.attempts + 1, lastAt: new Date().toISOString() };
    return { inquiry: entry, claimed: true };
  });
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
