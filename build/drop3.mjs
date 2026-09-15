import { readFileSync, writeFileSync } from 'node:fs';
const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));
const before = wb.entries.length;
wb.entries = wb.entries.filter(e => !String(e.comment).includes('觉醒礼当日'));
writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('  删除 ' + (before - wb.entries.length) + ' 条；剩余 ' + wb.entries.length);
