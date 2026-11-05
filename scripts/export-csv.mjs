#!/usr/bin/env node
// 내부 데이터 CSV 내보내기: candidate-pages, keyword-map, publication-ledger, redirect-map, search-evidence → data/export/*.csv
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry', f), 'utf8'));
const OUT = path.join(ROOT, 'data/export'); fs.mkdirSync(OUT, { recursive: true });
const csv = (rows, cols) => '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => { const v = r[c]; const s = v == null ? '' : Array.isArray(v) ? v.join('|') : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','))].join('\n') + '\n';
const w = (name, rows, cols) => { fs.writeFileSync(path.join(OUT, name), csv(rows, cols)); console.log(`[export] ${name} ${rows.length}`); };
const cand = R('candidate-pages.json'); w('candidate-pages.csv', cand.pages, ['pageId', 'sheetRow', 'type', 'regionLabel', 'primaryKeyword', 'sourceUrl', 'candidatePath', 'titleDraft', 'descriptionDraft', 'bodyTopic', 'evidenceNeeded', 'batch', 'sheetStatus', 'hubPath', 'publishCondition']);
const kw = R('keyword-map.json'); w('keyword-map.csv', kw.keywords, ['keywordId', 'sheetRow', 'areaLabel', 'intent', 'keyword', 'compactVariant', 'candidatePath', 'pageId', 'evidenceType', 'monthlyVolume', 'note']);
const led = R('publication-ledger.json'); w('publication-ledger.csv', led.records, ['pageId', 'type', 'path', 'parent', 'status', 'contentStatus', 'qualityClass', 'indexEligibility', 'serviceVerified', 'serviceAreaVerified', 'technicalReviewed', 'lastHumanReviewedAt', 'finalPath', 'mergeTarget', 'contentOwner', 'primaryIntent', 'sourceRows', 'aliases', 'coverageEvidence', 'evidenceIds', 'reviewer', 'reviewedAt', 'publishedAt', 'updatedAt', 'indexPolicy', 'mergeTarget', 'notes']);
const rm = R('redirect-map.json'); w('redirect-map.csv', rm.redirects, ['from', 'to', 'status', 'reason', 'verifiedBy', 'verifiedAt', 'active']);
const se = R('search-evidence.json'); w('search-evidence.csv', se.rows, ['engine', 'property', 'batchId', 'path', 'requestType', 'submittedAt', 'checkedAt', 'state', 'liveStatus', 'canonicalSeen', 'evidence', 'errorCause', 'owner', 'recheckAt']);
w('search-dashboard.csv', se.dashboard, ['engine', 'evidence_scope', 'from', 'to', 'as_of', 'eligible', 'indexed_confirmed', 'indexed_unknown', 'exposed_confirmed', 'exposure_coverage', 'impressions', 'clicks', 'verdict', 'evidence_ref']);
