/* 新增世界书条目
   用法: node addentry.mjs <worldbook.json> <正文文件> name=... order=... constant=true/false keys=a,b,c
   正文文件内容即 content。                                                */
import { readFileSync, writeFileSync } from 'node:fs';

const [wbPath, contentPath, ...kv] = process.argv.slice(2);
const raw = readFileSync(wbPath, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) throw new Error('worldbook 带 BOM');
const wb = JSON.parse(raw);

const ent = {
  comment: '',
  keys: [],
  constant: false,
  enabled: true,
  position: 0,
  order: 50,
};
ent.content = readFileSync(contentPath, 'utf8').replace(/\s+$/, '');

for (const pair of kv) {
  const i = pair.indexOf('=');
  if (i < 0) continue;
  const k = pair.slice(0, i).trim();
  let v = pair.slice(i + 1);
  if (v === 'true') v = true;
  else if (v === 'false') v = false;
  else if (/^-?\d+$/.test(v)) v = Number(v);
  else if (k === 'keys' || k === 'secondary_keys' || k === 'tags') {
    v = v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  ent[k] = v;
  console.log('  ' + k + ' = ' + JSON.stringify(v));
}

if (wb.entries.some((e) => e.comment === ent.comment)) {
  console.error('条目已存在: ' + ent.comment);
  process.exit(1);
}
wb.entries.push(ent);
writeFileSync(wbPath, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('已新增 <<' + ent.comment + '>>  ' + ent.content.length + ' 字符；条目总数 ' + wb.entries.length);
