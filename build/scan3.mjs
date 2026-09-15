import { readFileSync } from 'node:fs';
const wb = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const all = wb.entries.map(e => [e.comment, String(e.content||'')]);
console.log('=== 检查被误改的「家长」 ===');
for (const [nm, c] of all) {
  let i = -1;
  while ((i = c.indexOf('家长', i+1)) !== -1) {
    console.log('<<' + nm + '>>  ...' + c.slice(Math.max(0,i-70), i+80).replace(/\n/g,' / ') + '...');
  }
}
console.log('');
console.log('=== 检查残留的仪式痕迹 ===');
for (const kw of ['行「','观礼','典礼','仪式','排场','必须行']) {
  for (const [nm, c] of all) {
    const n = c.split(kw).length - 1;
    if (n) console.log('  ' + kw + ' 出现在 <<' + nm + '>> x' + n);
  }
}
