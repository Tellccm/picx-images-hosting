/* 收尾：buildText 与发送块的字段改名 */
import { readFileSync, writeFileSync } from 'node:fs';
const page = process.argv[2];
let h = readFileSync(page, 'utf8');
function rep(from, to, label) {
  const n = h.split(from).length - 1;
  if (n === 0) throw new Error('未找到: ' + label);
  h = h.split(from).join(to);
  console.log('  已改(' + n + '): ' + label);
}

/* buildText: 流派 */
rep(`    L.push('我的路：' + (pick.job || '未定') +
      (v('#spec') ? '（' + v('#spec') + '）' : '') +
      '　武器：' + (v('#weapon') || '徒手'));`,
`    L.push('我的路：' + (v('#style') || '未定') +
      (v('#spec') ? '（' + v('#spec') + '）' : '') +
      (v('#style-hint') ? '　倾向：' + v('#style-hint') : '') +
      '　武器：' + (v('#weapon') || '徒手'));`,
  'buildText 流派行');

/* buildText: 召唤兽描述 */
rep(`      var sp = v('#beast-species') || '未定';
      var mk = v('#beast-mark');
      var look = v('#beast-look');
      var tem = v('#beast-temper');
      var line = '初始召唤兽：' + (pick.rank || '凡种') + '·' + sp + (mk ? '（' + mk + '）' : '');
      if (look) line += '　外貌：' + look;
      if (tem) line += '　性格：' + tem;
      if (pick.beastRole) line += '　战力倾向：' + pick.beastRole;
      L.push(line);`,
`      var nm = v('#beast-name');
      var mk = v('#beast-mark');
      var look = v('#beast-look');
      var tem = v('#beast-temper');
      var cat = pick.beastCat || '兽类';
      var elem = pick.beastElem || '无';
      var line = '初始召唤兽：' + (pick.rank || '凡种') + '·' + cat +
        (elem !== '无' ? '（' + elem + '元素）' : '') +
        '　名字：' + (nm || '尚未取名');
      if (mk) line += '　特征：' + mk;
      if (look) line += '　外貌：' + look;
      if (tem) line += '　性格：' + tem;
      if (pick.beastRole) line += '　战力倾向：' + pick.beastRole;
      L.push(line);`,
  'buildText 召唤兽行');

/* buildText 结尾 */
rep(`L.push('记住：召唤兽是辅助，不是我的战力来源 —— 我自己靠' + (pick.job || '未定') + '打。');`,
  `L.push('记住：召唤兽是辅助，不是我的战力来源 —— 我自己靠' + (v('#style') || '流派') + '打。');`,
  'buildText 结尾');

/* 发送：自身字段 */
rep(`        "_.set('自身.职业', '" + q(pick.job || '未定') + "');",
        "_.set('自身.专精', '" + q(fv('#spec') || '未定') + "');",`,
`        "_.set('自身.流派', '" + q(fv('#style') || '未定') + "');",
        "_.set('自身.专精', '" + q(fv('#spec') || '未定') + "');",`,
  '发送 自身.流派');

/* 发送：初始召唤兽摘要 */
rep(`"_.set('开局配置.初始召唤兽', '" + (un ? '无（破例者）' : q((pick.rank || '凡种') + '·' + (fv('#beast-species') || '未定'))) + "');",`,
`"_.set('开局配置.初始召唤兽', '" + (un ? '无（破例者）' : q((pick.rank || '凡种') + '·' + (pick.beastCat || '兽类') + (pick.beastElem && pick.beastElem !== '无' ? '·' + pick.beastElem : ''))) + "');",`,
  '发送 初始召唤兽摘要');

/* 发送：召唤兽字段 */
rep(`        cmds.push("_.set('召唤兽.血统品阶', '" + q(pick.rank || '凡种') + "');");
        cmds.push("_.set('召唤兽.物种', '" + q(fv('#beast-species') || '未定') + "');");
        cmds.push("_.set('召唤兽.性格', '" + q(fv('#beast-temper') || '未定') + "');");`,
`        cmds.push("_.set('召唤兽.血统品阶', '" + q(pick.rank || '凡种') + "');");
        cmds.push("_.set('召唤兽.名字', '" + q(fv('#beast-name') || '未命名') + "');");
        cmds.push("_.set('召唤兽.类别', '" + q(pick.beastCat || '兽类') + "');");
        cmds.push("_.set('召唤兽.元素', '" + q(pick.beastElem || '无') + "');");
        cmds.push("_.set('召唤兽.物种', '" + q((pick.beastCat || '兽类') + (pick.beastElem && pick.beastElem !== '无' ? '·' + pick.beastElem : '')) + "');");
        cmds.push("_.set('召唤兽.特征', '" + q(fv('#beast-mark')) + "');");
        cmds.push("_.set('召唤兽.外貌', '" + q(fv('#beast-look')) + "');");
        cmds.push("_.set('召唤兽.性格', '" + q(fv('#beast-temper') || '未定') + "');");
        cmds.push("_.set('召唤兽.战力倾向', '" + q(pick.beastRole || '未定') + "');");`,
  '发送 召唤兽字段');

writeFileSync(page, h, 'utf8');
console.log('完成，整页 ' + h.length);
