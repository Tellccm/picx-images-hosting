/* 定点替换世界书条目的 content / 元字段
   用法: node setentry.mjs <worldbook.json> <条目名(精确或片段)> <新正文文件> [key=value ...]
   例:   node setentry.mjs worldbook-lore.json 角色生成模块 new.txt comment=召唤纪·角色生成模块 constant=true order=62
   避免用 edit 工具匹配长中文串（容易因转义差异失败）。                       */
import { readFileSync, writeFileSync } from 'node:fs';

const [wbPath, match, contentPath, ...kv] = process.argv.slice(2);
if (!wbPath || !match || !contentPath) {
  console.error('用法: node setentry.mjs <worldbook.json> <条目名片段> <新正文文件> [key=value ...]');
  process.exit(2);
}

const raw = readFileSync(wbPath, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) throw new Error('worldbook 带 BOM: ' + wbPath);
const wb = JSON.parse(raw);

const hits = wb.entries.filter((e) => String(e.comment || '').includes(match));
if (hits.length === 0) {
  console.error('未匹配到条目: ' + match);
  console.error('现有条目：');
  wb.entries.forEach((e) => console.error('  ' + e.comment));
  process.exit(1);
}
if (hits.length > 1) {
  console.error('匹配到 ' + hits.length + ' 条，请给更精确的名字：');
  hits.forEach((e) => console.error('  ' + e.comment));
  process.exit(1);
}

const ent = hits[0];
const before = String(ent.content || '').length;
ent.content = readFileSync(contentPath, 'utf8');

// 可选改元字段
for (const pair of kv) {
  const i = pair.indexOf('=');
  if (i < 0) continue;
  const k = pair.slice(0, i).trim();
  let v = pair.slice(i + 1);
  if (v === 'true') v = true;
  else if (v === 'false') v = false;
  else if (/^-?\d+$/.test(v)) v = Number(v);
  else if (k === 'keys' || k === 'secondary_keys' || k === 'tags') {
    // 用逗号分隔传入，避免 PowerShell 吃引号
    v = v.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (v.startsWith('[') || v.startsWith('{')) {
    try { v = JSON.parse(v); } catch (e) { console.warn('  警告: ' + k + ' 不是合法 JSON，按字符串处理'); }
  }
  ent[k] = v;
  console.log('  设置 ' + k + ' = ' + JSON.stringify(v));
}

writeFileSync(wbPath, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('已替换 <<' + ent.comment + '>>  content: ' + before + ' -> ' + ent.content.length + ' 字符');
console.log('条目总数: ' + wb.entries.length);
