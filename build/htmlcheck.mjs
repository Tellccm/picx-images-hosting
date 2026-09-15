/* 从 HTML 里抽出内嵌 script，逐个交给 node --check */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const dir = process.argv[2];
const tmp = join(process.env.TEMP, 'htmlcheck_' + Math.random().toString(36).slice(2, 8));
mkdirSync(tmp, { recursive: true });

let n = 0, fail = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  const h = readFileSync(join(dir, f), 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(h))) {
    const body = m[1];
    if (!body.trim()) continue;
    const p = join(tmp, f.replace(/\.html$/, '') + '_' + (i++) + '.mjs');
    writeFileSync(p, body, 'utf8');
    n++;
    try {
      execSync('node --check "' + p + '"', { stdio: 'pipe' });
      console.log('  PASS  ' + f + ' [script#' + (i - 1) + ']  ' + body.length + ' chars');
    } catch (e) {
      fail++;
      console.log('  FAIL  ' + f + ' [script#' + (i - 1) + ']');
      console.log(String(e.stderr || e.message).split('\n').slice(0, 6).map((l) => '        ' + l).join('\n'));
    }
  }
  if (i === 0) console.log('  (无内嵌 script) ' + f);
}
console.log('\n合计 ' + n + ' 段，失败 ' + fail);
