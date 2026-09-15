import { readFileSync, writeFileSync } from 'node:fs';
const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));
const drop = ['召唤纪·固定人物录', '召唤纪·灰塔学院人物志与定级考核'];
const before = wb.entries.length;
wb.entries = wb.entries.filter((e) => !drop.includes(e.comment));
writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('  删除 ' + (before - wb.entries.length) + ' 条；剩余 ' + wb.entries.length);
