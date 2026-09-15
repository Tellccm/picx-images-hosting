/* 命名改为面板必填项 + 一键生成候选名 */
import { readFileSync, writeFileSync } from 'node:fs';
const page = process.argv[2];
let h = readFileSync(page, 'utf8');
function rep(from, to, label) {
  if (!h.includes(from)) throw new Error('未找到: ' + label);
  h = h.replace(from, to);
  console.log('  已改: ' + label);
}

/* 1) 表单：名字单独一段，加候选名按钮 */
rep(
`    <div class="row" style="margin-bottom:8px">
      <div><span class="lbl">名字（可留空，之后再由剧情定）</span><input class="inp" id="beast-name" placeholder="例：灰耳 / 未命名"></div>
      <div><span class="lbl">最显眼的特征</span><input class="inp" id="beast-mark" placeholder="例：右翼缺一羽"></div>
    </div>`,
`    <div class="row" style="margin-bottom:4px">
      <div><span class="lbl">给它取名</span><input class="inp" id="beast-name" placeholder="例：灰耳 / 阿炭 / 雪团"></div>
      <div style="flex:0 0 118px"><span class="lbl">&nbsp;</span><button class="opt" id="roll-name" style="width:100%;padding:9px 10px">换个名字</button></div>
    </div>
    <div class="hint" id="name-hint">名字你说了算。觉醒当场通常来不及取，几天后才定下来也正常 —— 但这一栏定了，它就一直是这个名。</div>
    <div class="row" style="margin-bottom:8px">
      <div><span class="lbl">最显眼的特征</span><input class="inp" id="beast-mark" placeholder="例：右翼缺一羽"></div>
    </div>`,
  '命名栏 + 候选名按钮');

/* 2) 候选名池 + 生成逻辑（插在 DATA 之后） */
rep(
`  var pick = {};   // 单选结果`,
`  var NAME_POOL = [
    '灰耳', '阿炭', '雪团', '铜铃', '小满', '黑豆', '阿岬', '铁蛋', '芦花', '青眼',
    '石苔', '火绒', '白牙', '断尾', '小寒', '阿鸦', '泥鳅', '炭头', '老六', '碎星',
    '薄雾', '灯芯', '阿灰', '铜钱', '沙砾', '短耳', '小蓟', '阿岚', '绯瞳', '骨朵'
  ];

  var pick = {};   // 单选结果`,
  '候选名池');

/* 3) buildText：名字必填，空则未命名 */
rep(
`      var line = '初始召唤兽：' + (pick.rank || '凡种') + '·' + cat +
        (elem !== '无' ? '（' + elem + '元素）' : '') +
        '　名字：' + (nm || '尚未取名');`,
`      if (!nm) nm = '未命名';
      var line = '初始召唤兽：' + (pick.rank || '凡种') + '·' + cat +
        (elem !== '无' ? '（' + elem + '元素）' : '') +
        '　名字：' + nm;`,
  'buildText 名字默认值');

/* 4) 绑定「换个名字」按钮 */
rep(
`  ['#name', '#age', '#items', '#beast-name', '#beast-mark', '#beast-look',`,
`  var rollBtn = document.getElementById('roll-name');
  if (rollBtn) rollBtn.addEventListener('click', function () {
    var used = {};
    var pool = NAME_POOL.filter(function (n) { return n !== $('#beast-name').value.trim(); });
    var nm = pool[Math.floor(Math.random() * pool.length)] || '灰耳';
    $('#beast-name').value = nm;
    $('#text').value = buildText();
    $('#name-hint').textContent = '已填入「' + nm + '」。不满意就再点一次，或者自己改。';
  });

  ['#name', '#age', '#items', '#beast-name', '#beast-mark', '#beast-look',`,
  '绑定候选名按钮');

writeFileSync(page, h, 'utf8');
console.log('完成，整页 ' + h.length);
