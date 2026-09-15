/* 一次性补丁：给变量更新规则加上人物战斗字段，并在 initvar 备忘里注明前端块数 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));

const rule = wb.entries.find((e) => String(e.comment).includes('变量更新规则'));
if (!rule) throw new Error('未找到变量更新规则条目');

const oldBlock = '/自身/势力声望        整数，可为负\n/自身/学院排名        整数，-1 表示未上榜\n/自身/随身物品        字符串数组，add 追加、remove 删除';
const newBlock = [
  '/自身/势力声望        整数，可为负',
  '/自身/学院排名        整数，-1 表示未上榜',
  '/自身/随身物品        字符串数组，add 追加、remove 删除',
  '',
  '/自身/职业           只能是：未定、近战、魔法、神术、游走',
  '                    这是 <user> 自己的战斗体系，与召唤兽无关。定型后不得随意更改',
  '/自身/专精           字符串，如「长剑」「火系」「治疗」「匕首」。与职业相符',
  '/自身/武器           字符串，当前实际持有的武器名。没有就写「徒手」',
  '/自身/属性/力量      整数，1 到 99',
  '/自身/属性/敏捷      整数，1 到 99',
  '/自身/属性/体质      整数，1 到 99',
  '/自身/属性/智力      整数，1 到 99',
  '/自身/属性/精神      整数，1 到 99',
  '  —— 这五项由脚本在升级时发放属性点，**你只能改小数量的日常波动（受伤、状态），不得大额直接加**',
  '  —— 大幅提升必须来自明确的成长事件，且一次不超过 1 点',
  '/自身/资源/生命      整数，当前生命',
  '/自身/资源/生命上限   整数。升级或体质变化时同步调整',
  '/自身/资源/法力      整数。近战与游走职业通常为 0',
  '/自身/资源/法力上限   整数。近战与游走职业通常为 0',
  '/自身/技能           字符串数组，add 追加、remove 删除',
].join('\n');

if (!rule.content.includes(oldBlock)) {
  console.error('未匹配到 /自身/ 字段块，未做修改。实际内容片段：');
  const i = rule.content.indexOf('/自身/势力声望');
  console.error(rule.content.slice(Math.max(0, i - 100), i + 300));
  process.exit(1);
}
rule.content = rule.content.replace(oldBlock, newBlock);

// 备忘条目：前端块数对齐现状
const memo = wb.entries.find((e) => String(e.comment).includes('前端使用说明'));
if (memo) {
  memo.content = memo.content
    .replace('本卡前端共三块：', '本卡前端共五块：')
    .replace(
      '3. 开局预设页 —— 正则匹配 <customized></customized>，远程挂载 zhaohuan/',
      '3. 进化树面板 —— 正则匹配 【召唤纪·进化树】\n4. 技能树面板 —— 正则匹配 【召唤纪·技能树】\n5. 开局登记页 —— 正则匹配 <customized></customized>，远程挂载 zhaohuan/'
    );
}

writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('已更新变量更新规则：content ' + rule.content.length + ' 字符');
console.log('已更新前端备忘：' + (memo ? '是' : '未找到'));
