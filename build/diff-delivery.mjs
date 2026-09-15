/* 逐字段比对：本地基线卡 vs Gemini 交付卡 */
import { readFileSync } from 'node:fs';

const A_PATH = 'D:\\酒馆写卡\\写卡\\_tw_work\\build\\dist\\召唤纪.json';
const B_PATH = process.argv[2];

const A = JSON.parse(readFileSync(A_PATH, 'utf8'));
const B = JSON.parse(readFileSync(B_PATH, 'utf8'));

const out = [];
const p = (s) => out.push(s);

function size(s) { return Buffer.byteLength(String(s ?? ''), 'utf8'); }

p('===== 顶层 =====');
p('  spec        基线=' + A.spec + '   交付=' + B.spec);
p('  spec_version基线=' + A.spec_version + '   交付=' + B.spec_version);
p('  文件字节    基线=' + size(JSON.stringify(A)) + '   交付=' + size(JSON.stringify(B)));

const da = A.data || {}, db = B.data || {};
p('');
p('===== data 层标量字段 =====');
const scalars = ['name', 'creator', 'character_version', 'creator_notes', 'description',
                 'personality', 'scenario', 'first_mes', 'mes_example',
                 'system_prompt', 'post_history_instructions', 'talkativeness'];
for (const k of scalars) {
  const a = da[k], b = db[k];
  if (JSON.stringify(a) === JSON.stringify(b)) {
    p('  [同] ' + k + '  (' + size(a) + ' 字节)');
  } else {
    p('  [变] ' + k + '  基线 ' + size(a) + ' 字节  ->  交付 ' + size(b) + ' 字节');
    p('       基线: ' + JSON.stringify(String(a ?? '').slice(0, 120)));
    p('       交付: ' + JSON.stringify(String(b ?? '').slice(0, 120)));
  }
}

p('');
p('===== data 层数组/对象字段 =====');
for (const k of ['tags', 'alternate_greetings', 'group_only_greetings']) {
  const a = JSON.stringify(da[k]), b = JSON.stringify(db[k]);
  p('  ' + (a === b ? '[同] ' : '[变] ') + k);
  if (a !== b) { p('       基线: ' + String(a).slice(0, 200)); p('       交付: ' + String(b).slice(0, 200)); }
}

p('');
p('===== extensions 顶层键 =====');
const ea = Object.keys(da.extensions || {}).sort();
const eb = Object.keys(db.extensions || {}).sort();
p('  基线: ' + ea.join(', '));
p('  交付: ' + eb.join(', '));
const onlyA = ea.filter(k => !eb.includes(k));
const onlyB = eb.filter(k => !ea.includes(k));
if (onlyA.length) p('  仅基线有: ' + onlyA.join(', '));
if (onlyB.length) p('  仅交付有: ' + onlyB.join(', '));

p('');
p('===== 正则规则 =====');
const ra = (da.extensions || {}).regex_scripts || [];
const rb = (db.extensions || {}).regex_scripts || [];
p('  条数: 基线=' + ra.length + '  交付=' + rb.length);
const maxR = Math.max(ra.length, rb.length);
for (let i = 0; i < maxR; i++) {
  const x = ra[i], y = rb[i];
  if (!x || !y) { p('  [' + i + '] 一方缺失  基线=' + (x ? x.scriptName : '无') + '  交付=' + (y ? y.scriptName : '无')); continue; }
  const same = JSON.stringify(x) === JSON.stringify(y);
  p('  [' + i + '] ' + (same ? '[同] ' : '[变] ') + x.scriptName + '  vs  ' + y.scriptName);
  if (!same) {
    for (const f of ['scriptName', 'findRegex', 'placement', 'disabled', 'markdownOnly', 'promptOnly', 'runOnEdit']) {
      if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) {
        p('       ' + f + ':');
        p('         基线=' + JSON.stringify(x[f]));
        p('         交付=' + JSON.stringify(y[f]));
      }
    }
    if (x.replaceString !== y.replaceString) {
      p('       replaceString: 基线 ' + size(x.replaceString) + ' 字节 -> 交付 ' + size(y.replaceString) + ' 字节');
    }
  }
}

p('');
p('===== Tavern Helper 脚本 =====');
const sa = ((da.extensions || {}).tavern_helper || {}).scripts || [];
const sb = ((db.extensions || {}).tavern_helper || {}).scripts || [];
p('  段数: 基线=' + sa.length + '  交付=' + sb.length);
const maxS = Math.max(sa.length, sb.length);
for (let i = 0; i < maxS; i++) {
  const x = sa[i], y = sb[i];
  if (!x || !y) { p('  [' + i + '] 一方缺失  基线=' + (x ? x.name : '无') + '  交付=' + (y ? y.name : '无')); continue; }
  const same = JSON.stringify(x) === JSON.stringify(y);
  p('  [' + i + '] ' + (same ? '[同] ' : '[变] ') + x.name + ' (' + size(x.content) + ')  vs  ' + y.name + ' (' + size(y.content) + ')');
}

p('');
p('===== 世界书 =====');
const ba = da.character_book || {};
const bb = db.character_book || {};
const enA = ba.entries || [], enB = bb.entries || [];
p('  name: ' + ba.name + '  vs  ' + bb.name);
p('  条数: 基线=' + enA.length + '  交付=' + enB.length);
p('  scan_depth: ' + ba.scan_depth + ' vs ' + bb.scan_depth + '   token_budget: ' + ba.token_budget + ' vs ' + bb.token_budget);
const namesA = enA.map(e => e.name);
const namesB = enB.map(e => e.name);
const miss = namesA.filter(n => !namesB.includes(n));
const add = namesB.filter(n => !namesA.includes(n));
if (miss.length) p('  交付缺失条目: ' + miss.join(' | '));
if (add.length) p('  交付新增条目: ' + add.join(' | '));
for (const na of namesA) {
  const x = enA.find(e => e.name === na);
  const y = enB.find(e => e.name === na);
  if (!y) continue;
  const same = JSON.stringify(x) === JSON.stringify(y);
  p('  ' + (same ? '[同] ' : '[变] ') + na + '  (' + x.content.length + ' -> ' + y.content.length + ')');
  if (!same) {
    for (const f of ['enabled', 'constant', 'position', 'depth', 'insertion_order', 'selective']) {
      if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) p('       ' + f + ': ' + JSON.stringify(x[f]) + ' -> ' + JSON.stringify(y[f]));
    }
    if (JSON.stringify(x.keys) !== JSON.stringify(y.keys)) p('       keys: ' + JSON.stringify(x.keys) + ' -> ' + JSON.stringify(y.keys));
  }
}

console.log(out.join('\n'));
