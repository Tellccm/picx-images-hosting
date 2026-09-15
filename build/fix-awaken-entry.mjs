/* 修好被截断的那行，并恢复缩进 */
import { readFileSync, writeFileSync } from 'node:fs';
const p = process.argv[2];
const wb = JSON.parse(readFileSync(p, 'utf8'));
const e = wb.entries.find((x) => String(x.comment).includes('觉醒制度'));
let c = e.content;

c = c.replace(' 主持: 父母。没有神父，没有观礼，没有',
              ' 在场: 父母。没有神父，没有观礼，也没有任何仪式');
c = c.replace(' 年龄: 五到六岁之间', '  年龄: 五到六岁之间');
c = c.replace(' 地点: **在家里**', '  地点: **在家里**');
c = c.replace(' 时长: 几分钟', '  时长: 几分钟');
c = c.replace(' 在场: 父母。', '  在场: 父母。');
c = c.replace(' 每家都有一台**觉醒仪**', '  每家都有一台**觉醒仪**');
c = c.replace(' 比脸盆大一圈', '  比脸盆大一圈');
c = c.replace(' 仪器发热、发亮', '  仪器发热、发亮');
c = c.replace(' 仪器不是消耗品', '  仪器不是消耗品');
c = c.replace(' 一台养护得当的觉醒仪', '  一台养护得当的觉醒仪');
c = c.replace(' 常见样式:', '  常见样式:');
c = c.replace(/^ 家传铜仪/m, '    家传铜仪');
c = c.replace(/^ 买来的新仪/m, '    买来的新仪');
c = c.replace(/^ 教会仪/m, '    教会仪');
c = c.replace(/^ 贵族仪/m, '    贵族仪');
c = c.replace(' 民间说法:', '  民间说法:');
c = c.replace(/^ · 「仪器越旧越准」/m, '    · 「仪器越旧越准」');
c = c.replace(/^ · 「同一台仪器出的孩子/m, '    · 「同一台仪器出的孩子');
c = c.replace(/^ · 「按下去不亮的/m, '    · 「按下去不亮的');
c = c.replace(/^ · 仪器报出品阶/m, '  · 仪器报出品阶');
c = c.replace(/^ · 精确档位/m, '  · 精确档位');
c = c.replace(/^ · 出什么就是什么/m, '  · 出什么就是什么');
c = c.replace(' 按下去没反应。', '  按下去没反应。');
c = c.replace(' 这不是灾难场面。', '  这不是灾难场面。');
c = c.replace(/^ · 官方口径/m, '  · 官方口径');
c = c.replace(/^ · 教会口径/m, '  · 教会口径');
c = c.replace(/^ · 下城口径/m, '  · 下城口径');
c = c.replace(/^ · 另一种传言/m, '  · 另一种传言');
c = c.replace(' 五岁与六岁在评价上', '  五岁与六岁在评价上');
c = c.replace(' 不要写成年龄越小', '  不要写成年龄越小');
c = c.replace(' 觉醒是私事', '  觉醒是私事');
c = c.replace(/^ · 各家自行到学院/m, '  · 各家自行到学院');
c = c.replace(/^ · 贵种以上记入觉醒册/m, '  · 贵种以上记入觉醒册');
c = c.replace(/^ · 所以「觉醒那天」/m, '  · 所以「觉醒那天」');
c = c.replace(' 孩子哭一声', '  孩子哭一声');

e.content = c;
writeFileSync(p, JSON.stringify(wb, null, 2) + '\n', 'utf8');
console.log(c);
console.log('\n残留: 观礼=' + (c.split('观礼').length - 1) + ' 典礼=' + (c.split('典礼').length - 1) + ' 仪式=' + (c.split('仪式').length - 1));
