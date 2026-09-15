/* 对齐 schema 改名：自身.职业 -> 自身.流派；召唤兽加类别/元素/特征/外貌/战力倾向 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));

/* 1) 更新规则 */
const rule = wb.entries.find((e) => String(e.comment).includes('变量更新规则'));
rule.content = rule.content
  .replace('/自身/职业           只能是：未定、近战、魔法、神术、游走',
           '/自身/流派           字符串，自由填写。如「剑术」「火系」「治疗」「魔武双修」\n                    组合不受限制，但博而不精要付出代价')
  .replace('/召唤兽/物种          字符串，自由描述，不要写品阶',
           '/召唤兽/名字          字符串。觉醒后由 <user> 取名，未取则写「未命名」\n' +
           '/召唤兽/类别          只能是：兽类、狐类、猫类、鸟类、爬行类、虫类、水生类、异种类\n' +
           '/召唤兽/元素          只能是：无、火、水、风、地、雷、冰、光、暗\n' +
           '                    元素只影响描述与场景互动，不直接加数值。首次登场定下后不得更改\n' +
           '/召唤兽/物种          字符串。由类别 + 元素 + 品阶推导，如「狐类·火·贵种」→「焰狐」\n' +
           '/召唤兽/特征          字符串，一处最显眼的特征\n' +
           '/召唤兽/外貌          字符串，可观察的外形描写\n' +
           '/召唤兽/战力倾向      只能是：牵制、侦查、护卫、驮运、示警');

/* 2) initvar */
const iv = wb.entries.find((e) => String(e.comment).includes('initvar'));
let c = iv.content;
c = c.replace('"职业": "未定",', '"流派": "未定",');
c = c.replace('"资源": { "生命": 10, "生命上限": 10, "法力": 0, "法力上限": 0 },',
              '"资源": { "生命": 20, "生命上限": 20, "法力": 0, "法力上限": 0, "体力": 100, "体力上限": 100 },');
c = c.replace(`"召唤兽": {
    "名字": "未定",
    "物种": "未定",`,
`"召唤兽": {
    "名字": "未命名",
    "类别": "未定",
    "物种": "未定",
    "元素": "无",`);
c = c.replace(`    "进化阶段": 1,
    "性格": "未定",
    "羁绊": 0,`,
`    "进化阶段": 1,
    "特征": "",
    "外貌": "",
    "性格": "未定",
    "战力倾向": "未定",
    "羁绊": 0,`);
iv.content = c;

writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log('规则长度 ' + rule.content.length);
console.log('initvar 长度 ' + iv.content.length);
console.log('校验 initvar JSON:');
try {
  const o = JSON.parse(iv.content);
  console.log('  OK  自身 keys=' + Object.keys(o.自身).join(','));
  console.log('      召唤兽 keys=' + Object.keys(o.召唤兽).join(','));
} catch (e) { console.error('  FAIL ' + e.message); process.exit(1); }
