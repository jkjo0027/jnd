#!/usr/bin/env node
// 사용: node scripts/admin-hash.mjs '<password>'  → ADMIN_USERS 에 넣을 scrypt 해시 출력
import crypto from 'node:crypto';
const pw = process.argv[2];
if (!pw || pw.length < 10) { console.error('10자 이상 비밀번호를 인자로 주세요'); process.exit(2); }
const salt = crypto.randomBytes(16);
console.log(`scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`);
