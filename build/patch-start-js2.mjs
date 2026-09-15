/* 更新 start 页脚本：类别/元素池 + 流派改文本 + 命名 */
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2];
let h = readFileSync(page, 'utf8');
function must(from, to, label) {
  if (!h.includes(from)) throw new Error('未找到锚点: ' + label);
  h = h.replace(from, to);
  console.log('  已改: ' + label);
}

/* 1) DATA: job -> beastCat / beastElem */
must(
`    job: [
      ['近战', '剑、斧、盾、枪。正面接战的主力，吃装备'],
      ['魔法', '火冰风土、塑能、幻术。贵且慢，被近身就危险'],
      ['神术', '治疗、净化、祝福。需要教会授权'],
      ['游走', '匕首、短弓、陷阱、交涉。最不挑出身'],
      ['未定', '还没定型。可以普攻，不能发挥特长']
    ],`,
`    beastCat: [
      ['兽类', '犬、狼、狮、豹、熊、犀。最常见，最看体格'],
      ['狐类', '狐、貂、獾、狸。机敏，幻术倾向'],
      ['猫类', '猫、猞猁、山猫。静、快、独，不好指挥'],
      ['鸟类', '鹰、隼、枭、鸦、鹤。视野与机动，能飞'],
      ['爬行类', '蜥、蛇、龟、鳄。皮糙，抗性强，动作慢'],
      ['虫类', '蜂、蛛、甲虫、螳。群体或单体的极端'],
      ['水生类', '鲸、鲨、鳐、章。要有水才发挥得开'],
      ['异种类', '归不进上面任何一类的。多被送进灰烬所']
    ],
    beastElem: [
      ['无', '大多数。没有元素倾向，就是普通的兽'],
      ['火', '体温偏高，呼气带热'],
      ['水', '体表湿润，能在水里久待'],
      ['风', '体轻，动作快，落点轻'],
      ['地', '体沉，抗打，脚步重'],
      ['雷', '反应极快，毛羽常有静电'],
      ['冰', '体表偏凉，呼气成霜'],
      ['光', '少见。外观偏白，夜里微微发亮'],
      ['暗', '少见。多于夜间活跃，被说不祥']
    ],`,
  'DATA 换为 beastCat / beastElem'
);

/* 2) 默认值 */
must(
`  pick.job = '近战'; pick.beastRole = '牵制';`,
`  pick.beastCat = '兽类'; pick.beastElem = '无'; pick.beastRole = '牵制';`,
  '默认值'
);

/* 3) 初始化列表与 key 映射 */
must(
`  ['#awaken', '#rank', '#family', '#faction', '#academy', '#job', '#beast-role', '#place', '#tone'].forEach(function (id) {`,
`  ['#awaken', '#rank', '#family', '#faction', '#academy', '#beast-cat', '#beast-elem', '#beast-role', '#place', '#tone'].forEach(function (id) {`,
  '初始化列表'
);
must(
`    var k = { awaken: 'awaken', rank: 'rank', family: 'family', faction: 'faction', academy: 'academy',
      job: 'job', 'beast-role': 'beastRole', place: 'place', tone: 'tone' }[id.replace('#', '')];`,
`    var k = { awaken: 'awaken', rank: 'rank', family: 'family', faction: 'faction', academy: 'academy',
      'beast-cat': 'beastCat', 'beast-elem': 'beastElem', 'beast-role': 'beastRole',
      place: 'place', tone: 'tone' }[id.replace('#', '')];`,
  '初始化 key 映射'
);

/* 4) 点击 map */
must(
`        academy: ['academy', DATA.academy], job: ['job', DATA.job],
        beastRole: ['beast-role', DATA.beastRole],`,
`        academy: ['academy', DATA.academy],
        beastCat: ['beast-cat', DATA.beastCat], beastElem: ['beast-elem', DATA.beastElem],
        beastRole: ['beast-role', DATA.beastRole],`,
  '点击 map'
);

/* 5) 监听新输入框 */
must(
`  ['#name', '#age', '#items', '#beast-species', '#beast-mark', '#beast-look',
   '#spec', '#weapon', '#place-custom', '#tone-custom', '#situation'].forEach(function (sel) {`,
`  ['#name', '#age', '#items', '#beast-name', '#beast-mark', '#beast-look',
   '#style', '#spec', '#weapon', '#style-hint', '#place-custom', '#tone-custom', '#situation'].forEach(function (sel) {`,
  '监听输入框'
);

writeFileSync(page, h, 'utf8');
console.log('完成，整页 ' + h.length);
