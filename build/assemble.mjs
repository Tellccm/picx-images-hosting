/* ============================================================
   召唤纪 · 卡组装脚本
   输入：../seg*.{js,html}（卡内前端与生成器）、./worldbook-*.json、./card-identity.json
   输出：./dist/召唤纪.json           —— chara_card_v3 内嵌世界书，可直接导入
         ./dist/召唤纪.split.json     —— 世界书外置版（条目另存，供手动挂载）
         ./dist/召唤纪.worldbook.json —— 外置世界书本体
   原则：源与产物分离。改源，再跑本脚本重建产物。
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// 组件源既可能在 ../zhaohuan/（Git 仓库结构），也可能在 ../（平铺目录）
const SRC = existsSync(join(HERE, '..', 'zhaohuan', 'seg1_schema_gen.js'))
  ? join(HERE, '..', 'zhaohuan')
  : join(HERE, '..');
const DIST = join(HERE, 'dist');
if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

const read = (p) => readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));

/* ---------------- 1. 组件 ---------------- */
const seg = {
  schema: read(join(SRC, 'seg1_schema_gen.js')),
  statusbar: read(join(SRC, 'seg2_statusbar.html')),
  panel: read(join(SRC, 'seg3_panel.html')),
  evolution: read(join(SRC, 'seg4_evolution.html')),
  skillJs: read(join(SRC, 'seg8_skill_panel.js')),
  skillHtml: read(join(SRC, 'seg9_skill_panel.html')),
};

// 技能树面板：布局块 + 逻辑块合成一个可挂载单元
const skillPanelUnit =
  seg.skillHtml.trimEnd() +
  '\n\n<script>\n' + seg.skillJs.trim() + '\n</script>\n';

/* ---------------- 2. 正则规则 ---------------- */
const regex_scripts = [
  {
    scriptName: '召唤纪·开局预设挂载',
    findRegex: '<customized>\\s*([\\s\\S]*?)\\s*</customized>',
    replaceString:
      '<body>\n<script>\n' +
      "$('body').load('https://testingcf.jsdelivr.net/gh/Tellccm/picx-images-hosting@v51/zhaohuan/start.html')\n" +
      '</script>\n</body>',
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
  },
  {
    scriptName: '召唤纪·常态状态栏',
    findRegex: '【召唤纪·状态栏】',
    replaceString: seg.statusbar,
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
  },
  {
    scriptName: '召唤纪·养成面板',
    findRegex: '【召唤纪·面板】',
    replaceString: seg.panel,
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
  },
  {
    scriptName: '召唤纪·进化树面板',
    findRegex: '【召唤纪·进化树】',
    replaceString: seg.evolution,
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
  },
  {
    scriptName: '召唤纪·技能树面板',
    findRegex: '【召唤纪·技能树】',
    replaceString: skillPanelUnit,
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
  },
  {
    // 把变量更新块从玩家视野里藏掉；只作用于显示层
    scriptName: '召唤纪·隐藏变量更新块',
    findRegex: '/<(?:UpdateVariable|update)>[\\s\\S]*?<\\/(?:UpdateVariable|update)>/gi',
    replaceString: '',
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: false,
  },
  {
    // 把变量更新块从发给模型的上下文里去掉
    scriptName: '召唤纪·变量更新块不进上下文',
    findRegex: '/<(?:UpdateVariable|update)>[\\s\\S]*?<\\/(?:UpdateVariable|update)>/gi',
    replaceString: '',
    placement: [2],
    disabled: false,
    markdownOnly: false,
    promptOnly: true,
    runOnEdit: false,
  },
];

/* ---------------- 3. Tavern Helper 脚本 ---------------- */
const tavern_scripts = [
  {
    name: 'MVU',
    enabled: true,
    content: "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js';",
  },
  {
    name: '变量结构·召唤纪',
    enabled: true,
    content: seg.schema,
  },
];

/* ---------------- 4. 世界书 ---------------- */
const lore = readJson(join(HERE, 'worldbook-lore.json')).entries;
const mvu = readJson(join(HERE, 'worldbook-mvu.json')).entries;
const allEntries = [...mvu, ...lore];

// 转成 v3 character_book.entries 结构
const v3Entries = allEntries.map((e) => {
  const isConst = !!e.constant;
  return {
    name: e.comment,
    comment: e.comment,
    content: e.content,
    enabled: e.enabled !== false,
    constant: isConst,
    keys: e.keys || [],
    secondary_keys: [],
    selective: !isConst,
    insertion_order: typeof e.order === 'number' ? e.order : 100,
    position: typeof e.position === 'number' ? e.position : 0,
    ...(typeof e.depth === 'number' ? { depth: e.depth } : {}),
    case_sensitive: false,
    extensions: {},
  };
});

const character_book = {
  name: '召唤纪·世界书',
  description: '《召唤纪》设定、制度、势力与 MVU 变量规则',
  scan_depth: 4,
  token_budget: 2048,
  recursive_scanning: false,
  extensions: {},
  entries: v3Entries,
};

/* ---------------- 5. 身份字段 ---------------- */
const id = readJson(join(HERE, 'card-identity.json'));

/* ---------------- 6. 组装 ---------------- */
const data = {
  name: id.name,
  description: id.description,
  personality: id.personality,
  scenario: id.scenario,
  first_mes: id.first_mes,
  mes_example: id.mes_example,
  creator_notes: id.creator_notes,
  system_prompt: '',
  post_history_instructions: '',
  alternate_greetings: [],
  tags: id.tags,
  creator: id.creator,
  character_version: id.character_version,
  character_book,
  group_only_greetings: [],
  extensions: {
    talkativeness: '0.5',
    fav: false,
    world: character_book.name,
    depth_prompt: { prompt: '', depth: 4, role: 'system' },
    regex_scripts,
    tavern_helper: {
      scripts: tavern_scripts,
    },
    zhaohuan_build: {
      builder: 'build/assemble.mjs',
      version: id.character_version,
      components: {
        statusbar: 'seg2_statusbar.html',
        panel: 'seg3_panel.html',
        evolution: 'seg4_evolution.html',
        skillPanel: ['seg9_skill_panel.html', 'seg8_skill_panel.js'],
        schemaAndGenerators: 'seg1_schema_gen.js',
        startPage: 'https://testingcf.jsdelivr.net/gh/Tellccm/picx-images-hosting@v51/zhaohuan/start.html',
      },
      worldbookEntries: v3Entries.length,
      regexRules: regex_scripts.length,
      tavernScripts: tavern_scripts.length,
    },
  },
};

const card = {
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data,
};

const full = JSON.stringify(card, null, 2);
writeFileSync(join(DIST, '召唤纪.json'), full, 'utf8');

// 世界书外置版
writeFileSync(
  join(DIST, '召唤纪.worldbook.json'),
  JSON.stringify({ name: character_book.name, entries: v3Entries }, null, 2),
  'utf8'
);
const splitCard = JSON.parse(full);
splitCard.data.character_book = { name: character_book.name, entries: [] };
splitCard.data.extensions.world = character_book.name;
writeFileSync(join(DIST, '召唤纪.split.json'), JSON.stringify(splitCard, null, 2), 'utf8');

/* ---------------- 7. 自检报告 ---------------- */
const report = [];
const push = (s) => report.push(s);

push('卡名        : ' + data.name);
push('版本        : ' + data.character_version + '  spec=' + card.spec + '/' + card.spec_version);
push('世界书条目  : ' + v3Entries.length + '  (常量 ' + v3Entries.filter(e => e.constant).length + ' / 关键词 ' + v3Entries.filter(e => !e.constant).length + ')');
push('正则规则    : ' + regex_scripts.length);
push('TH 脚本     : ' + tavern_scripts.length + '  (' + tavern_scripts.map(s => s.name).join(', ') + ')');
push('first_mes   : ' + JSON.stringify(data.first_mes));
push('description : ' + data.description.length + ' 字符');
push('mes_example : ' + data.mes_example.length + ' 字符');
push('整卡大小    : ' + (full.length / 1024).toFixed(1) + ' KB');

const errors = [];
const warns = [];

// 结构断言
if (card.spec !== 'chara_card_v3' || card.spec_version !== '3.0') errors.push('spec 头不对');
if (!Array.isArray(data.character_book.entries) || !data.character_book.entries.length) errors.push('世界书为空');
if (!regex_scripts.length) errors.push('无正则规则');

// 必填字段
['name', 'description', 'personality', 'scenario', 'first_mes'].forEach((k) => {
  if (!data[k] || !String(data[k]).trim()) errors.push('data.' + k + ' 为空');
});

// 正则必须能编译
regex_scripts.forEach((r) => {
  try { new RegExp(r.findRegex); } catch (e) { errors.push('正则编译失败 [' + r.scriptName + ']: ' + e.message); }
});

// 挂载 URL 必须可解析且指向 v48
const mountRx = regex_scripts.find(r => r.scriptName.includes('开局预设挂载'));
if (!mountRx) errors.push('缺少开局预设挂载规则');
else if (!/picx-images-hosting@v51\/zhaohuan\/start\.html/.test(mountRx.replaceString)) errors.push('挂载 URL 不是 v51 版本');

// 占位标记必须与正则一致
const markerPairs = [
  ['【召唤纪·状态栏】', '召唤纪·常态状态栏'],
  ['【召唤纪·面板】', '召唤纪·养成面板'],
  ['【召唤纪·进化树】', '召唤纪·进化树面板'],
  ['【召唤纪·技能树】', '召唤纪·技能树面板'],
];
markerPairs.forEach(([marker, ruleName]) => {
  if (!regex_scripts.some(r => r.scriptName === ruleName)) errors.push('缺规则: ' + ruleName);
});

// 世界书：枚举一致性（王种必须最高）
const tierEntry = v3Entries.find(e => e.name.includes('血统品阶六档'));
if (tierEntry) {
  const order = ['凡种', '良种', '贵种', '超凡种', '传说种', '王种'];
  const text = tierEntry.content;
  const idx = order.map(t => text.indexOf(t));
  if (idx.some(i => i < 0)) errors.push('品阶条目缺档位');
  else if (!(idx[4] < idx[5])) errors.push('品阶条目里 传说种 未排在 王种 之前（王种应最高）');
} else warns.push('未找到品阶条目（关键词触发，可能命名变了）');

/* 图标扫描：按 Unicode 码点逐字判定，比正则可靠。
   PS 5.1 的 .NET 正则不支持 \u{...}，所以这里用码点区间循环，不用正则。
   白名单只放中文标点与全角空格，其余符号/emoji 一律视为图标残留。 */
const ICON_ALLOW = new Set([0x2026, 0x00b7, 0x3000, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d]);
function isIconChar(cp) {
  if (ICON_ALLOW.has(cp)) return false;
  if (cp >= 0x1f000 && cp <= 0x1faff) return true;   // emoji 主体
  if (cp >= 0x2190 && cp <= 0x21ff) return true;     // 箭头
  if (cp >= 0x2300 && cp <= 0x23ff) return true;     // 技术符号
  if (cp >= 0x2460 && cp <= 0x24ff) return true;     // 带圈数字
  if (cp >= 0x25a0 && cp <= 0x27bf) return true;     // 几何/杂项符号
  if (cp >= 0x2b00 && cp <= 0x2bff) return true;     // 杂项箭头
  if (cp >= 0x2600 && cp <= 0x26ff) return true;     // 杂项符号
  if (cp === 0xfe0f || cp === 0x20e3) return true;   // 变体选择符 / 组合键帽
  return false;
}
function findIcons(text) {
  const found = new Map();
  for (const ch of String(text ?? '')) {
    const cp = ch.codePointAt(0);
    if (isIconChar(cp) && !found.has(ch)) found.set(ch, cp);
  }
  return found;
}
const iconTargets = [
  ...tavern_scripts.map((s) => ['TH:' + s.name, s.content]),
  ...regex_scripts.map((r) => ['Reg:' + r.scriptName, r.replaceString]),
  ['data.description', data.description],
  ['data.personality', data.personality],
  ['data.scenario', data.scenario],
  ['data.mes_example', data.mes_example],
  ['data.creator_notes', data.creator_notes],
];
let iconTotal = 0;
iconTargets.forEach(([label, content]) => {
  const found = findIcons(content);
  if (found.size) {
    iconTotal += found.size;
    errors.push('图标残留 [' + label + ']: ' +
      [...found].map(([c, cp]) => c + ' U+' + cp.toString(16).toUpperCase()).join(' '));
  }
});

// 断言：图标扫描器本身必须能识别 emoji（防扫描器失效后静默通过）
if (!findIcons('\u{1F600}').size) errors.push('图标扫描器失效：未能识别 emoji');


/* 脚本语法严格校验：用 node --check 原生校验所有独立脚本与 HTML 内嵌 script */
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const allScripts = [];
tavern_scripts.forEach(s => {
  allScripts.push({ name: 'TH:' + s.name, content: s.content });
});
regex_scripts.forEach(r => {
  const matches = [...r.replaceString.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
  matches.forEach((m, idx) => {
    allScripts.push({ name: 'Reg:' + r.scriptName + ' [script#' + idx + ']', content: m[1] });
  });
});

const leftover = [];
allScripts.forEach(({ name, content }) => {
  const tmpPath = join(tmpdir(), 'check_' + Math.random().toString(36).slice(2) + '.mjs');
  try {
    writeFileSync(tmpPath, content, 'utf8');
    execSync('node --check "' + tmpPath + '"', { stdio: 'pipe' });
  } catch (err) {
    errors.push('脚本语法错误 [' + name + ']: ' + (err.stderr ? err.stderr.toString() : err.message));
  } finally {
    // unlinkSync 必须已导入，否则 ReferenceError 会被这个 catch 吞掉、临时文件残留
    try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch (e) { leftover.push(tmpPath); }
  }
});
if (leftover.length) errors.push('临时校验文件未能清理（unlinkSync 可能未导入）: ' + leftover.length + ' 个');
if (typeof unlinkSync !== 'function') errors.push('unlinkSync 未导入');

// 脚本：generateRaw 三段式必须齐
const schemaScript = tavern_scripts.find(s => s.name.includes('变量结构'));
['generateRaw', 'parseMessage', 'replaceMvuData', 'max_chat_history', 'should_silence'].forEach((k) => {
  if (!schemaScript.content.includes(k)) errors.push('生成器缺关键调用: ' + k);
});
// 断言改为检验「实际要求」，而不是禁用某个词：
// 开局没有剧情历史，生成器必须(a)声明无历史可参考、(b)禁止编造经历、(c)背景用开局配置页采集的值。
if (!/没有任何剧情历史可参考/.test(schemaScript.content)) {
  errors.push('生成器未声明"无剧情历史可参考"（开局没有经历，必须显式声明）');
}
if (!/禁止编造主人过往经历/.test(schemaScript.content)) {
  errors.push('生成器未禁止编造主人过往经历');
}
['出身势力', '觉醒年龄', '开局预设'].forEach((k) => {
  if (!schemaScript.content.includes(k)) errors.push('生成器未使用开局配置页的字段: ' + k);
});
if (!/max_chat_history:\s*0/.test(schemaScript.content)) {
  errors.push('生成器未设 max_chat_history: 0（开局生成不应引入不存在的历史）');
}

// 不得把令牌写进卡
const blob = full;
if (/ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}/.test(blob)) errors.push('卡内出现令牌样式字符串！');

/* 生成器参数合法性（已核对酒馆助手 @types/function/generate.d.ts v4.9.1）：
   GenerateRawConfig 的合法字段只有 custom_api / generation_id / image / injects / json_schema /
   max_chat_history / overrides / preset_name / should_silence / should_stream / tool_choice /
   tools / user_input，加上 GenerateRawConfig 扩展的 ordered_prompts。
   下面两个是曾经被编出来、会被静默忽略的参数，禁止再出现在**代码**里。
   注意：注释与字符串里允许出现这两个名字（代码注释解释了它们为何非法），
   所以先把注释和字符串字面量剥掉，只查真实代码 —— 否则会误判自己的说明文字。 */
function stripCommentsAndStrings(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; out += '""'; continue;
    }
    out += c; i++;
  }
  return out;
}
const schemaCode = stripCommentsAndStrings(schemaScript.content);
['disable_world_info', 'no_world_info'].forEach((bad) => {
  if (schemaCode.includes(bad)) {
    errors.push('生成器代码里出现非法参数 ' + bad + '（不在 GenerateRawConfig 里，会被静默忽略）');
  }
});

// 标准模式必须通过 ordered_prompts 里增删世界书占位符实现，而不是靠非法开关。
// 这几条是「正向检查」，用原文匹配 —— 占位符名可能同时出现在注释与代码里，
// 剥注释反而会造成假阴性。只有上面的「禁用检查」需要剥注释以避开说明文字。
if (!/standardMode/.test(schemaScript.content)) {
  errors.push('生成器缺少 standardMode 参数（标准模式未接线）');
}
if (!/world_info_before/.test(schemaScript.content)) {
  errors.push('生成器未使用 world_info_before 占位符（预设/世界书无法通过 ordered_prompts 控制）');
}
if (!/world_info_after/.test(schemaScript.content)) {
  errors.push('生成器未使用 world_info_after 占位符');
}
if (!/ordered_prompts\s*,/.test(schemaScript.content)) {
  errors.push('生成器未把 ordered_prompts 作为变量传入（模式切换无法生效）');
}
if (!/standardMode\s*\n?\s*\?\s*tail/.test(schemaScript.content)) {
  errors.push('标准模式未走「仅本次提示词」分支（模式语义不明）');
}

// 技能树面板脚本只允许挂一份：内嵌在正则里，不再作为独立 Tavern Helper 脚本
const panelDup = tavern_scripts.filter(s => s.name.includes('技能树面板')).length;
if (panelDup > 0) {
  errors.push('技能树面板脚本被重复挂载（独立脚本 ' + panelDup + ' 份 + 正则内嵌 1 份），会导致事件重复注册');
}

// 构建脚本自身：unlinkSync 必须已导入（否则临时文件静默残留）
if (typeof unlinkSync !== 'function') errors.push('assemble.mjs 未导入 unlinkSync');

push('');
push('图标扫描      : ' + iconTargets.length + ' 个目标，发现 ' + iconTotal + ' 种图标字符');
push('内嵌脚本校验  : ' + allScripts.length + ' 段已过 node --check');
push('错误 ' + errors.length + ' 项：');
errors.forEach(e => push('  [ERR] ' + e));
push('警告 ' + warns.length + ' 项：');
warns.forEach(w => push('  [WARN] ' + w));
push('');
push(errors.length ? '构建结果: FAIL' : '构建结果: PASS');

const out = report.join('\n');
writeFileSync(join(DIST, 'build-report.txt'), out, 'utf8');
console.log(out);
if (errors.length) process.exitCode = 1;
