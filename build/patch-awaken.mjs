/* 把全卡的「觉醒礼」框架改为「家常觉醒」框架 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));

const RULES = [
  // 核心术语
  ['觉醒礼上，人第一次召唤出自己的兽', '孩子在家里第一次唤出自己的兽'],
  ['觉醒礼', '觉醒'],
  ['觉醒日', '觉醒那天'],
  // 仪式元素
  ['神父念祷词', '家长扶着孩子的肩'],
  ['念一段固定的祷词', '扶着孩子的肩'],
  ['再念一次祷词', '让孩子再按一次'],
  ['祷词', ''],
  ['院子中央用盐和铁屑画的阵纹，风一吹就散了一角', '堂屋中央那台用了三代的觉醒仪，铜面擦得发亮'],
  ['阵纹用盐和铁屑画成，用完就扫掉', '仪器是家传的，铜面被擦得发亮'],
  ['站在阵纹里的孩子', '把手按在石芯上的孩子'],
  ['站在院子中央的阵纹里', '把手按在家里的觉醒仪上'],
  ['阵纹', '仪器'],
  ['神父会再念一次', '家里会让孩子再试一次'],
  ['神父', '家长'],
  // 场景
  ['记录官当场报出品阶，登记入册。报错要担责，所以他会看很久。',
   '家用仪器只能报个大概。精确档位要去上城的鉴定所复核。'],
  ['记录官手里那本册子会跟着孩子一辈子——上面写什么，就是什么。',
   '觉醒本身是私事，但结果要自行去学院或教会报备，报晚了要罚。'],
  ['记录官在那一栏写「无」，然后画一道横线——那道线是封死的，后面不会再写别的。',
   '官方册子上那一栏写「无」。这道记录此后不会再改。'],
  ['家族长辈的反应比结果本身更值得写：有人当场哭，有人转身就走，有人一声不吭。',
   '父母的反应比结果本身更值得写：有人当场哭，有人默默把仪器擦干净收起来，有人一声不吭。'],
];

let changed = 0;
for (const e of wb.entries) {
  let c = String(e.content || '');
  const before = c;
  for (const [from, to] of RULES) {
    if (c.includes(from)) c = c.split(from).join(to);
  }
  // 清掉可能产生的双空格与残缺标点
  c = c.replace(/  +/g, ' ').replace(/。\s*。/g, '。').replace(/：\s*：/g, '：');
  if (c !== before) {
    e.content = c;
    changed++;
    console.log('  改: ' + e.comment);
  }
}
writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('共修改 ' + changed + ' 条');

const all = wb.entries.map((e) => String(e.content || '')).join('\n');
console.log('\n残留检查:');
['觉醒礼', '祷词', '阵纹', '记录官'].forEach((k) => {
  console.log('  ' + k + ' = ' + (all.split(k).length - 1));
});
