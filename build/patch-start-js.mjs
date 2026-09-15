/* 更新 start 页脚本：新字段（职业/专精/武器/战力倾向/自定义性格外貌/自定义地点风格/处境） */
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2];
let h = readFileSync(page, 'utf8');

function must(from, to, label) {
  if (!h.includes(from)) throw new Error('未找到锚点: ' + label);
  h = h.replace(from, to);
  console.log('  已改: ' + label);
}

/* 1) DATA：加 job / beastRole，去掉 temper 预设 */
must(
`    temper: [
      ['护食', '谁碰它的碗都不行，包括你'],
      ['认生', '对陌生人龇牙，对你也不太热情'],
      ['黏人', '走哪跟哪，你上茅房它蹲门口'],
      ['懒散', '叫三声动一下，但真出事时它最快'],
      ['记仇', '你上次踩了它尾巴，它记到现在'],
      ['爱叫', '什么都想叫两声，夜里也一样']
    ],`,
`    job: [
      ['近战', '剑、斧、盾、枪。正面接战的主力，吃装备'],
      ['魔法', '火冰风土、塑能、幻术。贵且慢，被近身就危险'],
      ['神术', '治疗、净化、祝福。需要教会授权'],
      ['游走', '匕首、短弓、陷阱、交涉。最不挑出身'],
      ['未定', '还没定型。可以普攻，不能发挥特长']
    ],
    beastRole: [
      ['牵制', '咬住、拖住、替你看住一个方向'],
      ['侦查', '放出去看路、探人、听动静'],
      ['护卫', '挡在你身前，或替你挨一下'],
      ['驮运', '背东西、驮人、走长路'],
      ['示警', '提前发现危险，叫一声让你知道']
    ],`,
  'DATA 加 job / beastRole，删 temper 预设'
);

/* 2) 删掉 temper 的 renderOpts 调用 */
must(
`  renderOpts('temper', 'temper', DATA.temper);\n`,
``,
  '删除 renderOpts(temper)'
);

/* 3) 默认值：temper -> 文本，加 job / beastRole */
must(
`  pick.awaken = '已觉醒'; pick.rank = '凡种'; pick.family = '平民';
  pick.faction = '无籍游民'; pick.academy = '白垩塔'; pick.temper = '护食';
  pick.place = '灰塔学院·东院'; pick.tone = '入学日';
  ['#awaken', '#rank', '#family', '#faction', '#academy', '#temper', '#place', '#tone'].forEach(function (id) {`,
`  pick.awaken = '已觉醒'; pick.rank = '凡种'; pick.family = '平民';
  pick.faction = '无籍游民'; pick.academy = '白垩塔';
  pick.job = '近战'; pick.beastRole = '牵制';
  pick.place = '灰塔学院·东院'; pick.tone = '入学日';
  ['#awaken', '#rank', '#family', '#faction', '#academy', '#job', '#beast-role', '#place', '#tone'].forEach(function (id) {`,
  '更新默认值与初始化列表'
);

/* 4) 初始化列表里的 key 映射：去掉 temper */
must(
`    var k = { awaken: 'awaken', rank: 'rank', family: 'family', faction: 'faction', academy: 'academy', temper: 'temper', place: 'place', tone: 'tone' }[id.replace('#', '')];`,
`    var k = { awaken: 'awaken', rank: 'rank', family: 'family', faction: 'faction', academy: 'academy',
      job: 'job', 'beast-role': 'beastRole', place: 'place', tone: 'tone' }[id.replace('#', '')];`,
  '初始化 key 映射'
);

/* 5) 点击处理里的 map：temper -> job / beastRole，并映射到元素 id */
must(
`      var map = { awaken: ['awaken', DATA.awaken || []], rank: ['rank', DATA.rank],
        family: ['family', DATA.family], faction: ['faction', DATA.faction],
        academy: ['academy', DATA.academy], temper: ['temper', DATA.temper],
        place: ['place', DATA.place], tone: ['tone', DATA.tone] };`,
`      var map = { awaken: ['awaken', []], rank: ['rank', DATA.rank],
        family: ['family', DATA.family], faction: ['faction', DATA.faction],
        academy: ['academy', DATA.academy], job: ['job', DATA.job],
        beastRole: ['beast-role', DATA.beastRole],
        place: ['place', DATA.place], tone: ['tone', DATA.tone] };`,
  '点击 map 更新'
);

/* 6) 监听新输入框 */
must(
`  ['#name', '#age', '#items', '#beast-species', '#beast-mark'].forEach(function (sel) {`,
`  ['#name', '#age', '#items', '#beast-species', '#beast-mark', '#beast-look',
   '#spec', '#weapon', '#place-custom', '#tone-custom', '#situation'].forEach(function (sel) {`,
  '监听新输入框'
);

writeFileSync(page, h, 'utf8');
console.log('完成。整页 ' + h.length + ' 字符');
