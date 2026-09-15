/* 收尾：把残留的「记录官」改为家用仪器口径 */
import { readFileSync, writeFileSync } from 'node:fs';
const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));
const e = wb.entries.find((x) => String(x.comment).includes('品阶鉴定'));
let c = e.content;
c = c.split('· 觉醒当场的记录官只能报个大概。正式定级要去上城的鉴定所。')
     .join('· 家用的觉醒仪只能报个大概（凡/良/贵三档）。正式定级要去上城的鉴定所。');
c = c.split('就认了记录官那句「大概」。')
     .join('就认了自家仪器报的那个「大概」。');
e.content = c;
writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('已更新 <<' + e.comment + '>>  残留记录官 = ' + (c.split('记录官').length - 1));
console.log('\n--- 该条正文 ---');
console.log(c);
