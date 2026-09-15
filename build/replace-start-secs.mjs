/* 用新的第二~五段替换 start 页对应区块 */
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2];
const newBody = process.argv[3];
let h = readFileSync(page, 'utf8');
const body = readFileSync(newBody, 'utf8');

const startMark = '  <!-- 2 你自己的战斗体系 -->';
const endMark = '  <!-- 6 初始资源 -->';
let i = h.indexOf(startMark);
if (i < 0) i = h.indexOf('  <!-- 2 职业 -->');
if (i < 0) throw new Error('未找到第 2 段起点');
const j = h.indexOf(endMark);
if (j < 0) throw new Error('未找到第 6 段起点');
if (j <= i) throw new Error('区间顺序异常 i=' + i + ' j=' + j);

h = h.slice(0, i) + body.trimEnd() + '\n\n' + h.slice(j);
writeFileSync(page, h, 'utf8');
console.log('已替换第 2~5 段：' + (j - i) + ' -> ' + body.length + ' 字符；整页 ' + h.length);
