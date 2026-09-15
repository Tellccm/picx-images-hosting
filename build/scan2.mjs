import { readFileSync } from 'node:fs';
const wb = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const e of wb.entries) {
  const c = String(e.content||'');
  let i = -1;
  while ((i = c.indexOf('记录官', i+1)) !== -1) {
    console.log('<<' + e.comment + '>>');
    console.log('   ...' + c.slice(Math.max(0,i-90), i+110).replace(/\n/g,' / ') + '...');
  }
}
