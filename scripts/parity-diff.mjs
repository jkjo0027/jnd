#!/usr/bin/env node
// pixelmatch 로 ref/impl 비교 (같은 폭·높이 차이는 짧은 쪽에 맞춰 비교, 높이 차이는 별도 보고). 결과: reports/parity/diff.json + *-diff.png
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const OUT = path.resolve('reports/parity');
const shots = JSON.parse(fs.readFileSync(path.join(OUT, 'shots.json'), 'utf8'));
const rows = [];
for (const r of shots.results) {
  const a = PNG.sync.read(fs.readFileSync(r.ref)), b = PNG.sync.read(fs.readFileSync(r.impl));
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
  const A = crop(a), B = crop(b), D = new PNG({ width: w, height: h });
  const diff = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1 });
  const pct = +((diff / (w * h)) * 100).toFixed(2);
  // 고정 영역(상단 0~900px: 헤더+히어로/제목) — 세로 오프셋 영향 없이 색·폰트·정렬을 비교
  const th = Math.min(900, h);
  const TA = new PNG({ width: w, height: th }), TB = new PNG({ width: w, height: th }), TD = new PNG({ width: w, height: th });
  PNG.bitblt(A, TA, 0, 0, w, th, 0, 0); PNG.bitblt(B, TB, 0, 0, w, th, 0, 0);
  const topDiff = pixelmatch(TA.data, TB.data, TD.data, w, th, { threshold: 0.1 });
  const topPct = +((topDiff / (w * th)) * 100).toFixed(2);
  const file = path.join(OUT, `${r.page}-${r.size}-diff.png`);
  fs.writeFileSync(file, PNG.sync.write(D));
  rows.push({ ...r, comparedW: w, comparedH: h, diffPx: diff, diffPct: pct, topRegionPct: topPct, heightDelta: r.implHeight - r.refHeight });
  console.log(`[diff] ${r.page} ${r.size} full ${pct}% · top900 ${topPct}% (h Δ ${r.implHeight - r.refHeight}px)`);
}
fs.writeFileSync(path.join(OUT, 'diff.json'), JSON.stringify({ at: new Date().toISOString(), rows }, null, 1));
