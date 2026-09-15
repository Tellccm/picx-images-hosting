/* 把两个版本里「有差异」的组件内容各写一份文件，便于逐行比对 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const A = JSON.parse(readFileSync('D:\\酒馆写卡\\写卡\\_tw_work\\build\\dist\\召唤纪.json', 'utf8'));
const B = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const OUT = 'D:\\酒馆写卡\\写卡\\_tw_work\\build\\cmp';
mkdirSync(OUT, { recursive: true });

const ra = A.data.extensions.regex_scripts, rb = B.data.extensions.regex_scripts;
const sa = A.data.extensions.tavern_helper.scripts, sb = B.data.extensions.tavern_helper.scripts;

writeFileSync(OUT + '\\A_regex4.txt', ra[4].replaceString, 'utf8');
writeFileSync(OUT + '\\B_regex4.txt', rb[4].replaceString, 'utf8');
writeFileSync(OUT + '\\A_script1.js', sa[1].content, 'utf8');
writeFileSync(OUT + '\\B_script1.js', sb[1].content, 'utf8');
writeFileSync(OUT + '\\A_script2.js', sa[2].content, 'utf8');
writeFileSync(OUT + '\\B_script2.js', sb[2].content, 'utf8');

console.log('已导出到 ' + OUT);
console.log('');
console.log('=== 脚本1（变量结构）差异 ===');
diffLines(sa[1].content, sb[1].content);
console.log('');
console.log('=== 脚本2（技能树面板）差异 ===');
diffLines(sa[2].content, sb[2].content);
console.log('');
console.log('=== 正则规则4（技能树面板）差异 ===');
diffLines(ra[4].replaceString, rb[4].replaceString);

function diffLines(x, y) {
  const lx = x.split('\n'), ly = y.split('\n');
  const setX = new Set(lx), setY = new Set(ly);
  let n = 0;
  lx.forEach((l, i) => { if (!setY.has(l)) { console.log('  - 基线 L' + (i + 1) + ': ' + l.slice(0, 150)); n++; } });
  ly.forEach((l, i) => { if (!setX.has(l)) { console.log('  + 交付 L' + (i + 1) + ': ' + l.slice(0, 150)); n++; } });
  if (n === 0) console.log('  （无整行差异，差异在行内）');
  console.log('  行数: 基线 ' + lx.length + ' -> 交付 ' + ly.length);
}
