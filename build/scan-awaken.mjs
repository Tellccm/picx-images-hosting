import { readFileSync } from 'node:fs';
const wb = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const kw = ['觉醒礼','觉醒日','仪式','观礼','祷词','阵纹','神父','教会'];
let total = 0;
for (const e of wb.entries) {
  const hits = kw.filter(k => String(e.content||'').includes(k));
  if (hits.length) {
    console.log('<<' + e.comment + '>>  命中: ' + hits.join(' ') + '  (len=' + String(e.content).length + ')');
  }
}
// 精确计数
const all = wb.entries.map(e => String(e.content||'')).join('\n');
console.log('');
for (const k of kw) console.log('  ' + k + ' 全文出现 ' + (all.split(k).length - 1) + ' 次');
