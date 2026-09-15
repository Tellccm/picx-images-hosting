/* 在两个假宿主上执行「变量结构·召唤纪」脚本的生成器，抓 generateRaw 的实参
   目的：验证标准模式开关到底有没有改变传给 generateRaw 的对象            */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'D:\\酒馆写卡\\写卡\\_tw_work\\build\\cmp';
mkdirSync(OUT, { recursive: true });

function extractIIFE(path) {
  const src = readFileSync(path, 'utf8');
  const lines = src.split('\n');
  const start = lines.findIndex((l) => l.trim() === '(function () {');
  const end = lines.findIndex((l, i) => i > start && l.trim() === '})();');
  if (start < 0 || end < 0) throw new Error('找不到 IIFE 边界: ' + path);
  return { header: lines.slice(0, start).join('\n'), body: lines.slice(start, end + 1).join('\n') };
}

function buildHarness(body) {
  return `
// ---- 假宿主 ----
const captured = [];
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
fakeWindow.TavernHelper = {
  generateRaw: async (opts) => {
    captured.push(JSON.parse(JSON.stringify(opts)));
    return '<UpdateVariable><analysis>x</analysis><JSONPatch>[{"op":"add","path":"/进化树/树名","value":"t"}]</JSONPatch></UpdateVariable>';
  },
};
fakeWindow.window = fakeWindow;

// 全局替身
globalThis.window = fakeWindow;
globalThis.Mvu = fakeWindow.Mvu;
globalThis.TavernHelper = fakeWindow.TavernHelper;
globalThis.initializeGlobal = (n, v) => { fakeWindow[n] = v; };
globalThis.console = console;

// z / $ / _ 只需让模块顶层不报错即可（生成器不依赖它们）
globalThis.z = new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => ({}) }) });
globalThis.$ = () => {};
globalThis._ = { clamp: (v) => v, uniq: (a) => a };

${body}

// ---- 触发两种模式 ----
const gen = fakeWindow['zhaohuan-gen_skill'];
if (typeof gen !== 'function') { console.log('RESULT: 生成器未注册'); process.exit(1); }

globalThis.__captured = captured;
globalThis.__gen = gen;
`;
}

function report(labelA, capA, labelB, capB) {
  const norm = (o) => {
    const c = { ...o };
    return c;
  };
  console.log('  ' + labelA + ' 传给 generateRaw 的键:');
  capA.forEach((o, i) => console.log('    [' + i + '] ' + Object.keys(o).sort().join(', ')));
  console.log('  ' + labelB + ' 传给 generateRaw 的键:');
  capB.forEach((o, i) => console.log('    [' + i + '] ' + Object.keys(o).sort().join(', ')));

  const keysA = new Set(capA.flatMap((o) => Object.keys(o)));
  const keysB = new Set(capB.flatMap((o) => Object.keys(o)));
  const onlyB = [...keysB].filter((k) => !keysA.has(k));
  const onlyA = [...keysA].filter((k) => !keysB.has(k));
  console.log('');
  console.log('  标准模式独有键 : ' + (onlyB.length ? onlyB.join(', ') : '（无）'));
  console.log('  非标准模式独有键: ' + (onlyA.length ? onlyA.join(', ') : '（无）'));

  // 关键：ordered_prompts 与 max_chat_history 在两种模式下是否都保留
  for (const k of ['ordered_prompts', 'max_chat_history', 'should_silence', 'disable_world_info', 'no_world_info']) {
    const inA = capA.every((o) => k in o);
    const inB = capB.every((o) => k in o);
    console.log('  ' + k.padEnd(20) + ' 标准模式=' + (inB ? '有' : '无') + '   非标准=' + (inA ? '有' : '无'));
  }
}

for (const [tag, path] of [
  ['基线(A)', 'D:\\酒馆写卡\\写卡\\_tw_work\\build\\cmp\\A_script1.js'],
  ['交付(B)', 'D:\\酒馆写卡\\写卡\\_tw_work\\build\\cmp\\B_script1.js'],
]) {
  const { body } = extractIIFE(path);
  const code = buildHarness(body);
  writeFileSync(OUT + '\\harness_' + tag.replace(/[()]/g, '') + '.mjs', code, 'utf8');
}
console.log('已写出 harness 文件：');
console.log('  ' + OUT + '\\harness_基线A.mjs');
console.log('  ' + OUT + '\\harness_交付B.mjs');
