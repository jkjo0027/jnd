import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

/**
 * 사진 업로드 처리. 원본은 var/uploads/orig (비공개, 0600), 공개용 WebP 는 var/uploads/web/{id}-{w}.webp 로 만들어 /uploads/ 라우트가 제공한다.
 * - 원래 파일명(한글·영문·공백·괄호 등 UTF-8)은 표시용으로만 저장하고 저장 키는 고유 ID + 확인된 확장자다. 같은 이름을 올려도 덮어쓰지 않는다.
 * - 실제 형식은 매직 바이트로 판정(JPEG/PNG/WebP). HEIC 등은 안내 후 거부. EXIF 회전 반영 후 메타데이터(위치정보 포함) 제거.
 */
export type Upload = { id: string; name: string; ext: 'jpg' | 'png' | 'webp'; mime: string; bytes: number; w: number; h: number; sizes: number[]; by: string; at: string };
const ROOT = path.join(process.cwd(), 'var', 'uploads');
const ORIG = path.join(ROOT, 'orig'), WEB = path.join(ROOT, 'web'), INDEX = path.join(ROOT, 'index.jsonl');
export const MAX_MB = Number(process.env.UPLOAD_MAX_MB || 15);
export const MAX_PIXELS = Number(process.env.UPLOAD_MAX_PIXELS || 40_000_000);
export const WIDTHS = [480, 960, 1600];
export const ALLOWED = 'JPEG · PNG · WebP';

function sniff(buf: Buffer): { ext: Upload['ext']; mime: string } | { reject: string } {
  if (buf.length < 12) return { reject: '파일이 비어 있거나 손상됐어요.' };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  const ftyp = buf.subarray(4, 12).toString('ascii');
  if (/^ftyp(heic|heix|hevc|mif1|msf1|avif)/.test(ftyp)) return { reject: 'HEIC/AVIF 는 아직 받지 않아요. 휴대폰 설정에서 "호환성 우선(JPEG)"으로 바꾸거나 JPEG 로 변환해 올려 주세요.' };
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return { reject: 'GIF 는 받지 않아요. JPEG/PNG/WebP 로 올려 주세요.' };
  return { reject: `지원하지 않는 형식이에요. ${ALLOWED} 만 올릴 수 있어요(확장자가 아니라 실제 파일 내용으로 판정해요).` };
}
const safeName = (n: string) => n.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/]/g, '_').trim().slice(0, 255) || 'photo';

export async function processUpload(file: { name: string; bytes: Buffer }, by: string): Promise<{ upload?: Upload; error?: string }> {
  if (file.bytes.length > MAX_MB * 1024 * 1024) return { error: `파일이 ${MAX_MB}MB 를 넘어요(${(file.bytes.length / 1048576).toFixed(1)}MB).` };
  const s = sniff(file.bytes);
  if ('reject' in s) return { error: s.reject };
  let img = sharp(file.bytes, { failOn: 'error', limitInputPixels: MAX_PIXELS }).rotate();
  let meta;
  try { meta = await img.metadata(); } catch { return { error: '이미지를 읽을 수 없어요. 파일이 손상됐거나 너무 커요.' }; }
  const w0 = meta.width || 0, h0 = meta.height || 0;
  if (!w0 || !h0) return { error: '이미지 크기를 읽을 수 없어요.' };
  if (w0 * h0 > MAX_PIXELS) return { error: `해상도가 너무 커요(${w0}×${h0}). ${Math.round(MAX_PIXELS / 1e6)}MP 이하로 줄여 주세요.` };
  const id = crypto.randomBytes(6).toString('hex');
  fs.mkdirSync(ORIG, { recursive: true }); fs.mkdirSync(WEB, { recursive: true });
  fs.writeFileSync(path.join(ORIG, `${id}.${s.ext}`), file.bytes, { mode: 0o600 });
  // 회전이 반영된 실제 치수(EXIF orientation 5~8 이면 가로·세로가 바뀐다)
  const rotated = (meta.orientation || 1) >= 5 ? { w: h0, h: w0 } : { w: w0, h: h0 };
  const sizes = WIDTHS.filter((w) => w < rotated.w); if (!sizes.length || rotated.w <= WIDTHS[WIDTHS.length - 1]) sizes.push(Math.min(rotated.w, WIDTHS[WIDTHS.length - 1]));
  const uniq = [...new Set(sizes)].sort((a, b) => a - b);
  let outH = rotated.h;
  for (const w of uniq) {
    img = sharp(file.bytes, { failOn: 'error', limitInputPixels: MAX_PIXELS }).rotate();
    const info = await img.resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(WEB, `${id}-${w}.webp`));
    if (w === uniq[uniq.length - 1]) outH = info.height;
  }
  const largest = uniq[uniq.length - 1];
  const up: Upload = { id, name: safeName(file.name), ext: s.ext, mime: s.mime, bytes: file.bytes.length, w: largest, h: outH, sizes: uniq, by, at: new Date().toISOString() };
  fs.appendFileSync(INDEX, JSON.stringify(up) + '\n', { mode: 0o600 });
  return { upload: up };
}
export function readUploads(): Upload[] {
  if (!fs.existsSync(INDEX)) return [];
  return fs.readFileSync(INDEX, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Upload);
}
/** 공개 파일 경로(이름 검증 후). 없으면 null */
export function webFile(name: string): string | null {
  if (!/^[a-f0-9]{12}-\d{2,4}\.webp$/.test(name)) return null;
  const p = path.join(WEB, name);
  return fs.existsSync(p) ? p : null;
}
/** 삭제된 초안에서만 쓰던 사진 정리(공개 글이 쓰는 사진은 보존) */
export function removeUploads(ids: string[]) {
  for (const id of ids) {
    if (!/^[a-f0-9]{12}$/.test(id)) continue;
    for (const f of fs.existsSync(WEB) ? fs.readdirSync(WEB) : []) if (f.startsWith(id + '-')) fs.rmSync(path.join(WEB, f), { force: true });
    for (const f of fs.existsSync(ORIG) ? fs.readdirSync(ORIG) : []) if (f.startsWith(id + '.')) fs.rmSync(path.join(ORIG, f), { force: true });
  }
}
export const srcset = (ph: { id: string; sizes: number[] }) => ph.sizes.map((w) => `/uploads/${ph.id}-${w}.webp ${w}w`).join(', ');
export const srcOf = (ph: { id: string; sizes: number[] }, prefer = 960) => `/uploads/${ph.id}-${ph.sizes.reduce((a, b) => (Math.abs(b - prefer) < Math.abs(a - prefer) ? b : a), ph.sizes[0])}.webp`;
