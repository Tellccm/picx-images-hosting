/* 更新发送时的变量写入：人物职业/专精/武器 + 兽的外貌/性格/战力倾向 + 自定义地点风格处境 */
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2];
let h = readFileSync(page, 'utf8');

const OLD = `      var cmds = [
        "_.set('自身.姓名', '" + q(($('#name').value || 'user').trim()) + "');",
        "_.set('自身.觉醒年龄', " + (Number($('#age').value) || 6) + ");",
        "_.set('自身.觉醒状态', '" + q(pick.awaken || '已觉醒') + "');",
        "_.set('自身.家族背景', '" + q(pick.family || '平民') + "');",
        "_.set('自身.出身势力', '" + q(pick.faction || '无籍游民') + "');",
        "_.set('自身.学院', '" + q(pick.academy || '未入学') + "');",
        "_.set('自身.随身物品', [" + (($('#items').value || '').split(/[、,，]/).map(function (x) { return "'" + q(x.trim()) + "'"; }).filter(function (x) { return x !== "''"; }).join(', ')) + "]);",
        "_.set('常态状态.地点', '" + q(pick.place || '灰塔学院·东院') + "');",
        "_.set('开局配置.开局预设', '开局登记页');",
        "_.set('开局配置.开局注入', '" + q(injText) + "');",
        "_.set('开局配置.初始召唤兽', '" + (un ? '无（破例者）' : q((pick.rank || '凡种') + '·' + (($('#beast-species').value || '未定').trim()))) + "');",
        "_.set('开局配置.已完成', true);"
      ];
      if (!un) {
        cmds.push("_.set('召唤兽.血统品阶', '" + q(pick.rank || '凡种') + "');");
        cmds.push("_.set('召唤兽.物种', '" + q(($('#beast-species').value || '未定').trim()) + "');");
        cmds.push("_.set('召唤兽.性格', '" + q(pick.temper || '未定') + "');");
        cmds.push("_.set('养成.当前天赋点', 3);");
        cmds.push("_.set('天赋点来源.累计获得', 3);");
      } else {
        cmds.push("_.set('养成.当前天赋点', 0);");
        cmds.push("_.set('天赋点来源.累计获得', 0);");
      }
`;

const NEW = `      function fv(sel) { var el = $(sel); return el ? String(el.value || '').trim() : ''; }
      var place = fv('#place-custom') || pick.place || '灰塔学院·东院';
      var tone = fv('#tone-custom') || pick.tone || '入学日';
      var itemsArr = ($('#items').value || '').split(/[、,，]/)
        .map(function (x) { return "'" + q(x.trim()) + "'"; })
        .filter(function (x) { return x !== "''"; });

      var cmds = [
        "_.set('自身.姓名', '" + q(fv('#name') || 'user') + "');",
        "_.set('自身.觉醒年龄', " + (Number($('#age').value) || 6) + ");",
        "_.set('自身.觉醒状态', '" + q(pick.awaken || '已觉醒') + "');",
        "_.set('自身.家族背景', '" + q(pick.family || '平民') + "');",
        "_.set('自身.出身势力', '" + q(pick.faction || '无籍游民') + "');",
        "_.set('自身.学院', '" + q(pick.academy || '未入学') + "');",
        "_.set('自身.职业', '" + q(pick.job || '未定') + "');",
        "_.set('自身.专精', '" + q(fv('#spec') || '未定') + "');",
        "_.set('自身.武器', '" + q(fv('#weapon') || '徒手') + "');",
        "_.set('自身.随身物品', [" + itemsArr.join(', ') + "]);",
        "_.set('常态状态.地点', '" + q(place) + "');",
        "_.set('开局配置.开局预设', '开局登记页');",
        "_.set('开局配置.开局注入', '" + q(injText) + "');",
        "_.set('开局配置.初始召唤兽', '" + (un ? '无（破例者）' : q((pick.rank || '凡种') + '·' + (fv('#beast-species') || '未定'))) + "');",
        "_.set('开局配置.已完成', true);"
      ];
      if (!un) {
        cmds.push("_.set('召唤兽.血统品阶', '" + q(pick.rank || '凡种') + "');");
        cmds.push("_.set('召唤兽.物种', '" + q(fv('#beast-species') || '未定') + "');");
        cmds.push("_.set('召唤兽.性格', '" + q(fv('#beast-temper') || '未定') + "');");
        cmds.push("_.set('养成.当前天赋点', 3);");
        cmds.push("_.set('天赋点来源.累计获得', 3);");
      } else {
        cmds.push("_.set('养成.当前天赋点', 0);");
        cmds.push("_.set('天赋点来源.累计获得', 0);");
      }
`;

if (!h.includes(OLD)) throw new Error('未找到发送写变量区块');
h = h.replace(OLD, NEW);
writeFileSync(page, h, 'utf8');
console.log('发送写变量区块已更新。整页 ' + h.length + ' 字符');
