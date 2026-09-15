/* 清理：order 归一为数字；删除被图鉴取代的旧条目 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));

let fixed = 0;
for (const e of wb.entries) {
  const n = Number(e.order);
  if (!Number.isFinite(n)) {
    console.warn('  order 非法: ' + e.comment + ' -> ' + JSON.stringify(e.order));
    e.order = 50;
    fixed++;
  } else if (typeof e.order !== 'number') {
    e.order = n;
    fixed++;
  }
}
console.log('  order 归一 ' + fixed + ' 条');

const drop = ['召唤纪·召唤兽图鉴·示例物种', '召唤纪·召唤兽图鉴框架'];
const before = wb.entries.length;
wb.entries = wb.entries.filter((e) => !drop.includes(e.comment));
console.log('  删除 ' + (before - wb.entries.length) + ' 条旧图鉴条目');

// 排序保证输出稳定（order 降序）
wb.entries.sort((a, b) => (b.order || 0) - (a.order || 0));

writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('  条目总数 ' + wb.entries.length);
wb.entries.forEach((e) => console.log('    order=' + String(e.order).padStart(6) + '  ' + e.comment));
