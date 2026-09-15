/* 用新的表单结构替换 start 页的 <div class="wrap"> … 注入控制 </div> 区块 */
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2];
const newBody = process.argv[3];
const html = readFileSync(page, 'utf8');
const body = readFileSync(newBody, 'utf8');

const startMark = '  <!-- 1 身份 -->';
const endMark = '  <!-- 预览与发送 -->';
const i = html.indexOf(startMark);
const j = html.indexOf(endMark);
if (i < 0 || j < 0 || j <= i) throw new Error('未找到替换区间: i=' + i + ' j=' + j);

const out = html.slice(0, i) + body.trimEnd() + '\n\n' + html.slice(j);
writeFileSync(page, out, 'utf8');
console.log('已替换表单区块：' + (j - i) + ' -> ' + body.length + ' 字符');
console.log('整页现在 ' + out.length + ' 字符');
