/* 更新 buildText：接入职业/专精/武器/战力倾向/自定义性格外貌/自定义地点风格/处境 */
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2];
let h = readFileSync(page, 'utf8');

const startMark = 'function buildText() {';
const endMark = 'function refresh() {';
const i = h.indexOf(startMark);
const j = h.indexOf(endMark);
if (i < 0 || j < 0) throw new Error('未找到 buildText 区间');

const NEW = `function buildText() {
    function v(sel) { var el = $(sel); return el ? String(el.value || '').trim() : ''; }
    var name = v('#name') || '我';
    var age = $('#age').value || 6;
    var unawakened = pick.awaken === '未觉醒';
    var place = v('#place-custom') || pick.place || '灰塔学院·东院';
    var tone = v('#tone-custom') || pick.tone || '入学日';
    var L = [];

    L.push('【开局登记】');
    L.push('姓名：' + name + '　觉醒年龄：' + age + ' 岁　觉醒结果：' + (pick.awaken || '已觉醒'));
    L.push('我的路：' + (pick.job || '未定') +
      (v('#spec') ? '（' + v('#spec') + '）' : '') +
      '　武器：' + (v('#weapon') || '徒手'));
    L.push(unawakened ? '血统品阶：无（破例者）' : '血统品阶：' + (pick.rank || '凡种'));
    L.push('家族背景：' + (pick.family || '平民') +
      '　出身势力：' + (pick.faction || '无籍游民') +
      '　就读：' + (pick.academy || '未入学'));

    if (!unawakened) {
      var sp = v('#beast-species') || '未定';
      var mk = v('#beast-mark');
      var look = v('#beast-look');
      var tem = v('#beast-temper');
      var line = '初始召唤兽：' + (pick.rank || '凡种') + '·' + sp + (mk ? '（' + mk + '）' : '');
      if (look) line += '　外貌：' + look;
      if (tem) line += '　性格：' + tem;
      if (pick.beastRole) line += '　战力倾向：' + pick.beastRole;
      L.push(line);
    }

    L.push('随身物品：' + (v('#items') || '身无长物'));
    L.push('起始地点：' + place);
    L.push('开局风格：' + tone);
    if (v('#situation')) L.push('开局处境：' + v('#situation'));
    L.push('');
    L.push('请从这个局面开始。按〈世界规则〉与〈五维与职业体系〉判定。');
    L.push('记住：召唤兽是辅助，不是我的战力来源 —— 我自己靠' + (pick.job || '未定') + '打。');
    L.push('不要替我决定，也不要给我无依据的优待。');
    return L.join('\\n');
  }

  `;

h = h.slice(0, i) + NEW + h.slice(j);
writeFileSync(page, h, 'utf8');
console.log('buildText 已替换。整页 ' + h.length + ' 字符');
