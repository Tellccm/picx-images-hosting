/* 生成器的生成依据补上 类别/元素/名字/特征/战力倾向 */
import { readFileSync, writeFileSync } from 'node:fs';
const f = process.argv[2];
let s = readFileSync(f, 'utf8');
function rep(from, to, label) {
  if (!s.includes(from)) throw new Error('未找到: ' + label);
  s = s.replace(from, to);
  console.log('  已改: ' + label);
}

/* 进化树生成依据 */
rep(`          '【生成依据（全部为开局已确定的值）】',
          '物种：' + beast.物种,`,
`          '【生成依据（全部为开局已确定的值）】',
          '名字：' + (beast.名字 || '未命名'),
          '类别：' + (beast.类别 || '未定'),
          '元素：' + (beast.元素 || '无'),
          '物种：' + beast.物种,
          '特征：' + (beast.特征 || '无'),
          '外貌：' + (beast.外貌 || '未定'),
          '战力倾向：' + (beast.战力倾向 || '未定'),`,
  '进化树生成依据');

/* 技能树基线 */
rep(`          '【召唤兽】',
          '物种：' + (beast.物种 || '未定'),
          '血统品阶：' + rank,`,
`          '【召唤兽】',
          '名字：' + (beast.名字 || '未命名'),
          '类别：' + (beast.类别 || '未定'),
          '元素：' + (beast.元素 || '无'),
          '物种：' + (beast.物种 || '未定'),
          '特征：' + (beast.特征 || '无'),
          '战力倾向：' + (beast.战力倾向 || '未定'),
          '血统品阶：' + rank,`,
  '技能树基线');

writeFileSync(f, s, 'utf8');
console.log('完成，脚本 ' + s.length + ' 字符');
