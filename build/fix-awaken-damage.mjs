/* 修复上一次过度替换造成的损伤：
   1) 神父 -> 家长 误伤（温德尔神父、教会称呼、圣烛堂等）
   2) 残留仪式措辞（观礼/典礼/仪式/行「觉醒」） */
import { readFileSync, writeFileSync } from 'node:fs';

const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));

const FIX = [
  // --- 误伤的「家长」还原为「神父」 ---
  ['霜镜城只有一座分堂和一个家长', '霜镜城只有一座分堂和一个神父'],
  ['温德尔家长', '温德尔神父'],
  ['称「某家长」「某执事」即可', '称「某神父」「某执事」即可'],
  ['没有家长，没有观礼，没有', '没有神父，没有观礼，没有'],
  // --- 残留仪式措辞 ---
  ['每个人到了五至六岁，都要行「觉醒」。', '每个人到了五至六岁都会觉醒。'],
  ['时长: 几分钟。有的孩子一会就好，有的要坐上小半天\n  主持: 父母。没有神父，没有观礼，没有',
   '时长: 几分钟。有的孩子一会就好，有的要坐上小半天\n  在场: 父母。没有神父，没有观礼，没有典礼'],
  ['没有神父，没有观礼，没有典礼\n', '没有神父，没有观礼，也没有任何仪式\n'],
  // --- 世界规则里的「行「」 ---
  ['都要行「觉醒」', '都会觉醒'],
];

let changed = 0;
for (const e of wb.entries) {
  let c = String(e.content || '');
  const before = c;
  for (const [from, to] of FIX) {
    if (c.includes(from)) c = c.split(from).join(to);
  }
  if (c !== before) { e.content = c; changed++; console.log('  改: ' + e.comment); }
}
writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('共修改 ' + changed + ' 条\n');

const all = wb.entries.map((e) => String(e.content || '')).join('\n');
console.log('残留检查:');
['家长', '神父', '观礼', '典礼', '仪式', '行「', '觉醒礼'].forEach((k) => {
  console.log('  ' + k + ' = ' + (all.split(k).length - 1));
});
console.log('\n「家长」剩余上下文:');
for (const e of wb.entries) {
  const c = String(e.content || '');
  let i = -1;
  while ((i = c.indexOf('家长', i + 1)) !== -1) {
    console.log('  <<' + e.comment + '>> ...' + c.slice(Math.max(0, i - 50), i + 60).replace(/\n/g, ' / ') + '...');
  }
}
