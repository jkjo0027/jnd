import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

/** Site-scoped storage survives deploys. Credentials come from Netlify's runtime. */
export const persistentCloud = () => process.env.JND_STORAGE === 'netlify-blobs' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const store = () => getStore({ name: 'jnd-cms-v1', consistency: 'strong' });
const root = () => process.env.JND_DATA_DIR || path.join(process.cwd(), 'var', 'cms');
const file = (key: string) => {
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.includes('..') || key.startsWith('/')) throw new Error('Invalid storage key');
  return path.join(/* turbopackIgnore: true */ root(), key);
};
const digest = (data: Buffer) => crypto.createHash('sha256').update(data).digest('hex');
const missing = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT';
let localQueue: Promise<unknown> = Promise.resolve();

export class StorageConflict extends Error { readonly status = 409; }

export async function readJSON<T>(key: string, empty: () => T): Promise<{ data: T; etag?: string }> {
  if (persistentCloud()) {
    const value = await store().getWithMetadata(key, { type: 'json', consistency: 'strong' });
    return value ? { data: value.data as T, etag: value.etag } : { data: empty() };
  }
  try { const data = await fs.readFile(/* turbopackIgnore: true */ file(key)); return { data: JSON.parse(data.toString()) as T, etag: digest(data) }; }
  catch (e) { if (missing(e)) return { data: empty() }; throw e; }
}

async function compareWrite(key: string, data: unknown, etag?: string): Promise<boolean> {
  if (persistentCloud()) {
    const result = await store().setJSON(key, data, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    return result.modified;
  }
  const write = localQueue.then(async () => {
    let current: string | undefined;
    try { current = digest(await fs.readFile(/* turbopackIgnore: true */ file(key))); } catch (e) { if (!missing(e)) throw e; }
    if (current !== etag) return false;
    await writeBytes(key, Buffer.from(JSON.stringify(data)));
    return true;
  });
  localQueue = write.catch(() => undefined);
  return write;
}

/** The callback runs again on a competing write and must have no external side effects. */
export async function updateJSON<T, R>(key: string, empty: () => T, change: (data: T) => R): Promise<R> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, etag } = await readJSON(key, empty);
    const result = change(data);
    if (await compareWrite(key, data, etag)) return result;
  }
  throw new StorageConflict('다른 작업이 먼저 저장됐어요. 새로고침 후 다시 시도해 주세요.');
}

export async function readBytes(key: string): Promise<Buffer | null> {
  if (persistentCloud()) {
    const data = await store().get(key, { type: 'arrayBuffer', consistency: 'strong' });
    return data === null ? null : Buffer.from(data);
  }
  try { return await fs.readFile(/* turbopackIgnore: true */ file(key)); } catch (e) { if (missing(e)) return null; throw e; }
}
export async function writeBytes(key: string, data: Buffer): Promise<void> {
  if (persistentCloud()) { await store().set(key, new Uint8Array(data).buffer); return; }
  const destination = file(key);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = destination + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  await fs.writeFile(temporary, data, { mode: 0o600 });
  await fs.rename(temporary, destination);
}
export async function deleteBytes(key: string): Promise<void> {
  if (persistentCloud()) { await store().delete(key); return; }
  await fs.rm(file(key), { force: true });
}
