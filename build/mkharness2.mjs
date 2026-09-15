/* 正确做法：整份脚本（含模块顶层 const）一起执行，mocks 预先挂到全局。
   这样模块作用域完整，能真正跑到 generateRaw。                        */
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'D:\\酒馆写卡\\写卡\\_tw_work\\build\\cmp';

const PRELUDE = `
// ================= 假宿主（必须在脚本之前挂好） =================
const fakeWindow = {};
fakeWindow.Mvu = {
  events: { VARIABLE_UPDATE_ENDED: 'e1', VARIABLE_INITIALIZED: 'e2' },
  getMvuData: () => ({
    stat_data: {
      自身: { 觉醒状态: '已觉醒', 觉醒年龄: 6, 出身势力: '灰塔学院', 学院: '白垩塔', 家族背景: '平民' },
      召唤兽: { 物种: '灰狼', 血统品阶: '良种', 契约形态: '未定', 性格: '护食', 羁绊: 3, 技能: [] },
      开局配置: { 开局预设: '灰塔入学日', 初始召唤兽: '良种·灰狼' },
    },
  }),
  parseMessage: async (raw, old) => ({ ...old, stat_data: { ...old.stat_data, __patched: true } }),
  replaceMvuData: async () => {},
};
fakeWindow.TavernHelper = { generateRaw: async () => '' };
fakeWindow.window = fakeWindow;

globalThis.window = fakeWindow;
globalThis.Mvu = fakeWindow.Mvu;
globalThis.TavernHelper = fakeWindow.TavernHelper;
globalThis.initializeGlobal = (n, v) => { fakeWindow[n] = v; };

// z / $ / _ ：只需让模块顶层那几行不炸
const zProxy = new Proxy(function () {}, {
  get: () => zProxy,
  apply: () => zProxy,
  construct: () => zProxy,
});
globalThis.z = new Proxy({}, { get: () => zProxy });
globalThis.$ = () => {};
globalThis._ = { clamp: (v) => v, uniq: (a) => a };
// 假 import：返回脚本期望的 { registerMvuSchema }
globalThis.fakeImport = async () => ({ registerMvuSchema: () => {} });
// ================================================================
`;

const POSTLUDE = `
// ================= 触发两种模式，抓 generateRaw 实参 =================
const gen = fakeWindow['zhaohuan-gen_skill'];
if (typeof gen !== 'function') { console.log('RESULT: 生成器未注册'); process.exit(1); }

const capNorm = [];
globalThis.TavernHelper.generateRaw = async (o) => {
  capNorm.push(JSON.parse(JSON.stringify(o)));
  return '<UpdateVariable><analysis>a</analysis><JSONPatch>[{"op":"add","path":"/技能树/树名","value":"x"}]</JSONPatch></UpdateVariable>';
};
const r1 = await gen('测试风格', true, false);

const capStd = [];
globalThis.TavernHelper.generateRaw = async (o) => {
  capStd.push(JSON.parse(JSON.stringify(o)));
  return '<UpdateVariable><analysis>a</analysis><JSONPatch>[{"op":"add","path":"/技能树/树名","value":"x"}]</JSONPatch></UpdateVariable>';
};
const r2 = await gen('测试风格', true, true);

console.log('非标准模式 结果: ' + JSON.stringify(r1 && r1.ok));
console.log('标准模式   结果: ' + JSON.stringify(r2 && r2.ok));
console.log('');
console.log('--- 非标准模式 传给 generateRaw 的实参 ---');
capNorm.forEach((o, i) => console.log('  [' + i + '] ' + Object.keys(o).sort().join(', ')));
console.log('--- 标准模式 传给 generateRaw 的实参 ---');
capStd.forEach((o, i) => console.log('  [' + i + '] ' + Object.keys(o).sort().join(', ')));
console.log('');
const K = (a) => [...new Set(a.flatMap((o) => Object.keys(o)))].sort();
const k1 = K(capNorm), k2 = K(capStd);
console.log('标准模式独有键 : ' + (k2.filter(k => !k1.includes(k)).join(', ') || '（无）'));
console.log('非标准独有键   : ' + (k1.filter(k => !k2.includes(k)).join(', ') || '（无）'));
console.log('');
for (const k of ['ordered_prompts', 'max_chat_history', 'should_silence', 'disable_world_info', 'no_world_info']) {
  const a = capNorm.length > 0 && capNorm.every(o => k in o);
  const b = capStd.length > 0 && capStd.every(o => k in o);
  console.log('  ' + k.padEnd(20) + ' 非标准=' + (a ? '有' : '无') + '   标准=' + (b ? '有' : '无'));
}
`;

for (const [tag, file] of [
  ['A_base', 'A_script1.js'],
  ['B_gemini', 'B_script1.js'],
]) {
  let src = readFileSync(OUT + '\\' + file, 'utf8');
  // 把脚本自己的远程 import(...) 换成假实现：Node 的 ESM loader 不接受 https:
  const before = (src.match(/\bimport\s*\(/g) || []).length;
  src = src.replace(/\bimport\s*\(\s*[^)]*\)/g, 'fakeImport()');
  console.log('  ' + tag + ': 替换 import(...) ' + before + ' 处');
  const out = PRELUDE + '\n' + src + '\n' + POSTLUDE;
  writeFileSync(OUT + '\\run_' + tag + '.mjs', out, 'utf8');
  console.log('  写出 run_' + tag + '.mjs');
}
