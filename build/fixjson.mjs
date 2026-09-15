/* JSON 修复：把字符串值内部未转义的 ASCII 双引号转义为 \"
   判定规则：只有「后面跟着 空白* ( , } ] : )」的引号才可能是字符串结束符。
   因此位于值中间的引号一定需要转义。                        */
import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let out = '';
  let i = 0;
  let inString = false;
  let fixed = 0;

  while (i < src.length) {
    const ch = src[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      i++;
      continue;
    }
    // 在字符串内
    if (ch === '\\') {                 // 已转义，整体拷贝
      out += src.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === '"') {
      // 向后看：是否是合法的字符串结束位置
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      const next = src[j];
      if (next === ',' || next === '}' || next === ']' || next === ':' || j >= src.length) {
        inString = false;
        out += ch;
        i++;
        continue;
      }
      // 否则是值内部的裸引号，需要转义
      out += '\\"';
      fixed++;
      i++;
      continue;
    }
    out += ch;
    i++;
  }

  writeFileSync(f, out, 'utf8');
  let ok = false, err = '';
  try { JSON.parse(out); ok = true; } catch (e) { err = e.message; }
  console.log(
    (ok ? 'PASS ' : 'FAIL ') + f.split(/[\\/]/).pop() +
    '  转义修正 ' + fixed + ' 处  ' + (ok ? '(JSON 现已可解析)' : '-> ' + err)
  );
}
