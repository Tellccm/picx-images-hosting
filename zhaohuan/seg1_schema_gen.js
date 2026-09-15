// ============================================================
// 脚本名：变量结构·召唤纪（v3）
// 含：Zod schema + 进化树生成器（静默主 API）+ 技能树生成器
// 状态：设计稿，未在真机执行
// 图标策略：全卡无图标，仅文字
// ============================================================

let registerMvuSchema;
try {
  ({ registerMvuSchema } = await import(
    'https://cdn.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js'
  ));
} catch (e) {
  ({ registerMvuSchema } = await import(
    'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js'
  ));
}

const clampNum = (dft, min, max) =>
  z.coerce.number().prefault(dft).transform(v => {
    const n = Number(v);
    return _.clamp(Number.isFinite(n) ? n : dft, min, max);
  });

const intNum = (dft, min, max) =>
  z.coerce.number().prefault(dft).transform(v => {
    const n = Number(v);
    return _.clamp(Math.floor(Number.isFinite(n) ? n : dft), min, max);
  });

function normalizeRoot(raw) {
  const root = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    ...root,
    自身: root.自身 || {},
    常态状态: root.常态状态 || {},
    势力关系: root.势力关系 || {},
    召唤兽: root.召唤兽 || {},
    养成: root.养成 || {},
    天赋点来源: root.天赋点来源 || {},
    进化树: root.进化树 || {},
    技能树: root.技能树 || {},
    开局配置: root.开局配置 || {},
  };
}

// ===== 品阶 6 档：王种 > 传说种 > 超凡种 > 贵种 > 良种 > 凡种 =====
const 血统品阶 = z.enum(['凡种', '良种', '贵种', '超凡种', '传说种', '王种']);
const 契约形态 = z.enum(['未定', '共生', '武装', '领域', '替身']);
const 品阶合法值 = ['凡种', '良种', '贵种', '超凡种', '传说种', '王种'];
const 规范化品阶 = (v) => (品阶合法值.includes(v) ? v : '凡种');

// 品阶对应阶段上限（生成器与校验共用，避免两处各写一份）
const 品阶阶段上限 = {
  凡种: 3, 良种: 4, 贵种: 4, 超凡种: 5, 传说种: 5, 王种: 5,
};
const 品阶分支建议 = {
  凡种: '2 条', 良种: '2 到 3 条', 贵种: '3 条', 超凡种: '3 到 4 条', 传说种: '4 条', 王种: '4 到 5 条',
};

/* ---------------- 进化树 ---------------- */
const evolutionNodeSchema = z.object({
  阶段: intNum(1, 1, 5),
  名称: z.string().prefault(''),
  说明: z.string().prefault(''),
  前置: z.string().prefault(''),
  已解锁: z.coerce.boolean().prefault(false),
  // 改动：人格底色从"树级固定"下移到节点级，随剧情逐节点累积
  人格底色: z.string().prefault(''),
}).transform(n => {
  const name = String(n.名称 || '').trim();
  const pre = String(n.前置 || '').trim();
  return { ...n, 名称: name, 说明: String(n.说明 || '').trim(), 前置: pre === name ? '' : pre };
});

const evolutionTreeSchema = z.object({
  树名: z.string().prefault('未生成'),
  生成时间: z.string().prefault(''),
  版本: intNum(0, 0, 999),
  生成依据: z.object({
    物种: z.string().prefault(''),
    血统品阶: 血统品阶.prefault('凡种'),
    契约形态: 契约形态.prefault('未定'),
    召唤兽性格: z.string().prefault(''),
    出身势力: z.string().prefault(''),
    学院: z.string().prefault(''),
    家族背景: z.string().prefault(''),
    觉醒年龄: intNum(0, 0, 99),
  }).prefault({}),
  节点: z.record(z.string().describe('进化节点键名'), evolutionNodeSchema).prefault({}),
  当前节点: z.string().prefault(''),
  可解锁: z.array(z.string()).prefault([]),
  已解锁: z.array(z.string()).prefault([]),
  总进化点: intNum(0, 0, 999),
  已使用进化点: intNum(0, 0, 999),
}).prefault({}).transform(t => {
  const nodes = t.节点 || {};
  return {
    ...t,
    已解锁: _.uniq((t.已解锁 || []).filter(k => !!nodes[k])),
    可解锁: _.uniq((t.可解锁 || []).filter(k => !!nodes[k])),
  };
});

/* ---------------- 技能树（结构对齐参考卡：record + 总点数 + 已用点数）---------------- */
const skillNodeSchema = z.object({
  名称: z.string().prefault(''),
  类型: z.enum(['主动', '召唤', '特殊']).prefault('主动'),
  阶位: z.enum(['基础', '进阶', '终极']).prefault('基础'),
  说明: z.string().prefault(''),
  威力: intNum(0, 0, 9999),
  消耗: intNum(0, 0, 999),
  前置: z.string().prefault(''),
  已学会: z.coerce.boolean().prefault(false),
}).transform(s => {
  const name = String(s.名称 || '').trim();
  const pre = String(s.前置 || '').trim();
  return { ...s, 名称: name, 说明: String(s.说明 || '').trim(), 前置: pre === name ? '' : pre };
});

const skillTreeSchema = z.object({
  树名: z.string().prefault('未生成'),
  生成时间: z.string().prefault(''),
  生成依据: z.object({
    物种: z.string().prefault(''),
    血统品阶: 血统品阶.prefault('凡种'),
    契约形态: 契约形态.prefault('未定'),
    风格要求: z.string().prefault(''),
  }).prefault({}),
  技能列表: z.record(z.string().describe('技能键名'), skillNodeSchema).prefault({}),
  总SP: intNum(0, 0, 9999),
  已使用SP: intNum(0, 0, 9999),
}).prefault({}).transform(t => ({
  ...t,
  已使用SP: _.clamp(
    Math.floor(Number(t.已使用SP) || 0), 0,
    Math.floor(Number(t.总SP) || 0)
  ),
}));

const Schema = z.preprocess(normalizeRoot, z.object({
  自身: z.object({
    姓名: z.string().prefault('user'),
    觉醒年龄: intNum(0, 0, 99),
    觉醒状态: z.enum(['已觉醒', '未觉醒']).prefault('已觉醒'),
    出身势力: z.string().prefault('未定'),
    学院: z.string().prefault('未定'),
    家族背景: z.string().prefault('未定'),
    势力声望: intNum(0, -9999, 9999),
    学院排名: intNum(-1, -1, 99999),
    随身物品: z.array(z.string()).prefault([]),
  }).prefault({}),

  常态状态: z.object({
    第几天: intNum(1, 1, 99999),
    时刻: z.string().prefault('清晨'),
    地点: z.string().prefault('未定'),
    体力: clampNum(100, 0, 100),
    精神: clampNum(100, 0, 100),
    伤势: z.string().prefault('无'),
  }).prefault({}),

  势力关系: z.record(z.string(), clampNum(0, -100, 100)).prefault({}),

  召唤兽: z.object({
    名字: z.string().prefault('未定'),
    物种: z.string().prefault('未定'),
    血统品阶: 血统品阶.prefault('凡种'),
    契约形态: 契约形态.prefault('未定'),
    进化阶段: intNum(1, 1, 5),
    性格: z.string().prefault('未定'),
    羁绊: intNum(0, 0, 100),
    技能: z.array(z.string()).prefault([]),
  }).prefault({}),

  养成: z.object({
    训练度: intNum(0, 0, 100),
    进化路线摘要: z.string().prefault('未定'),
    当前天赋点: intNum(0, 0, 999),
    属性: z.object({
      力量: intNum(1, 1, 99),
      敏捷: intNum(1, 1, 99),
      感知: intNum(1, 1, 99),
      灵性: intNum(1, 1, 99),
    }).prefault({}),
    天赋: z.record(z.string(), intNum(0, 0, 5)).prefault({}),
  }).prefault({}),

  天赋点来源: z.object({
    累计获得: intNum(0, 0, 9999),
    已分配: intNum(0, 0, 9999),
  }).prefault({}),

  进化树: evolutionTreeSchema,
  技能树: skillTreeSchema,

  开局配置: z.object({
    已完成: z.coerce.boolean().prefault(false),
    步骤: z.record(z.string(), z.coerce.boolean()).prefault({}),
    初始召唤兽: z.string().prefault('未选'),
    开局预设: z.string().prefault(''),
  }).prefault({}),
}));

$(() => { registerMvuSchema(Schema); });

/* ============================================================
   共用：静默主 API 三段式
   API 范式出处：C2 §5.9（v2.9.9 control_center.js 生产源码，置信度 high）
   依次调用 generateRaw、parseMessage、replaceMvuData
   ============================================================ */
(function () {
  'use strict';
  const NS = 'zhaohuan-gen';

  function hostWindow() {
    try { if (window.top && window.top.document) return window.top; } catch (e) {}
    try { if (window.parent && window.parent.document) return window.parent; } catch (e) {}
    return window;
  }
  function mvu() {
    const w = hostWindow();
    return (typeof Mvu !== 'undefined' && Mvu) || w.Mvu || null;
  }
  function generateRawFn() {
    const w = hostWindow();
    const helper = (typeof TavernHelper !== 'undefined' && TavernHelper) || w.TavernHelper || null;
    if (helper && typeof helper.generateRaw === 'function') return helper.generateRaw.bind(helper);
    if (typeof window.generateRaw === 'function') return window.generateRaw;
    if (typeof w.generateRaw === 'function') return w.generateRaw;
    return null;
  }

  // 每类生成一个独立锁，避免两个生成互相排队或重复触发
  const locks = {};
  function withLock(key, fn) {
    if (locks[key]) return Promise.resolve({ ok: false, reason: '正在生成，请稍候' });
    locks[key] = true;
    return Promise.resolve(fn()).finally(() => { locks[key] = false; });
  }

  // 供生成器拼装上下文的通用片段
  function readSnapshot() {
    const M = mvu();
    if (!M || typeof M.getMvuData !== 'function') return null;
    const d = M.getMvuData({ type: 'message', message_id: 'latest' });
    return d && d.stat_data ? d.stat_data : null;
  }

  async function runGeneration(sys, usr, standardMode) {
    const M = mvu();
    if (!M || typeof M.parseMessage !== 'function') return { ok: false, reason: 'MVU 未就绪' };
    const g = generateRawFn();
    if (typeof g !== 'function') return { ok: false, reason: 'generateRaw 不可用（TavernHelper 版本过低？）' };

    const oldData = M.getMvuData({ type: 'message', message_id: 'latest' });
    if (!oldData) return { ok: false, reason: '读取变量失败' };

    /* generateRaw 的语义（已核对酒馆助手 @types/function/generate.d.ts v4.9.1）：
       ordered_prompts 就是「本次生成使用的完整预设」。未列入其中的提示词一律不生效——
       预设与世界书分别靠 PlaceholderPrompt 'world_info_before' / 'world_info_after' 注入。
       所以控制「带不带预设与世界书」的正确做法是增删这两个占位符，
       而不是传 disable_world_info / no_world_info —— 后者不是合法参数，会被静默忽略。 */
    const tail = [
      { role: 'system', content: sys },
      { role: 'user', content: usr },
    ];
    // 标准模式：不用预设、不注世界书，只发本次生成的提示词
    // 默认模式：把世界书占位符一并排进去，让设定条目参与生成
    const ordered_prompts = standardMode
      ? tail
      : ['world_info_before', ...tail, 'world_info_after'];

    const genOpts = {
      should_silence: true,
      max_chat_history: 0,          // 开局生成不引剧情历史，避免把不存在的"经历"喂进去
      ordered_prompts,
    };
    const raw = String(await g(genOpts) || '').trim();

    if (!/<UpdateVariable/i.test(raw)) return { ok: false, reason: '模型结果未含 <UpdateVariable> 块' };
    const nextData = await M.parseMessage(raw, oldData);
    if (!nextData) return { ok: false, reason: '未能解析变量更新' };
    await M.replaceMvuData(nextData, { type: 'message', message_id: 'latest' });
    return { ok: true, raw };
  }

  /* ---------------- 进化树生成器 ----------------
     修复：原提示词要求"依据主人经历"，但开局阶段不存在经历。
     现只依据「开局配置页已采集的确切值 + 召唤兽自身特质」生成。
     人格底色改为逐节点字段，开局由性格与出身推得，之后由剧情演化。      */
  async function generateEvolutionTree() {
    return withLock('evolution', async () => {
      try {
        const sd = readSnapshot();
        if (!sd) return { ok: false, reason: 'MVU 未就绪' };
        const beast = sd.召唤兽 || {};
        const self = sd.自身 || {};
        const setup = sd.开局配置 || {};

        if (self.觉醒状态 === '未觉醒') return { ok: false, reason: '未觉醒者没有进化树' };
        if (!beast.物种 || beast.物种 === '未定') return { ok: false, reason: '尚未确定召唤兽物种' };

        const rank = 品阶合法值.includes(beast.血统品阶) ? beast.血统品阶 : '凡种';
        const maxStage = 品阶阶段上限[rank] || 3;
        const branches = 品阶分支建议[rank] || '2 条';

        const sys = [
          '你是召唤兽进化树生成器。',
          '只输出一个 <UpdateVariable> 块，块内先 <analysis> 再 <JSONPatch>，不要输出任何其他文字。',
          'op 只用 add / replace。path 以 /进化树/ 开头。',
          '节点数量 6 到 9 个；阶段从 1 到 ' + maxStage + ' 递增；同阶段可以有多个分支。',
          '每个节点必须给出 名称、说明、前置、阶段、已解锁、人格底色。',
          '首个节点（阶段1）的 已解锁 写 true，其余写 false。',
          '前置 填父节点的键名；根节点的 前置 填空字符串。',
          '血统品阶只允许：凡种、良种、贵种、超凡种、传说种、王种。',
          '本卡没有任何剧情历史可参考。你只能依据下面的已知信息推导，禁止编造主人过往经历。',
          '人格底色 的写法：依据该节点的方向与召唤兽性格推得，一句话，写这头兽在这种形态下的行事倾向。',
          '不要写"它曾经如何如何"这类需要历史才能成立的内容。',
          '另外写 /进化树/树名、/进化树/来源/物种、/进化树/来源/血统品阶、/进化树/来源/契约形态、'
            + '/进化树/来源/召唤兽性格、/进化树/来源/出身势力、/进化树/来源/学院、/进化树/来源/家族背景、'
            + '/进化树/来源/觉醒年龄、/进化树/当前节点、/进化树/可解锁、/进化树/已解锁、'
            + '/进化树/总进化点、/进化树/已使用进化点。',
        ].join('\n');

        const usr = [
          '【生成依据（全部为开局已确定的值）】',
          '物种：' + beast.物种,
          '血统品阶：' + rank + '（阶段上限 ' + maxStage + '，分支建议 ' + branches + '）',
          '契约形态：' + (beast.契约形态 || '未定'),
          '召唤兽性格：' + (beast.性格 || '未定'),
          '初始羁绊：' + (beast.羁绊 || 0),
          '觉醒年龄：' + (self.觉醒年龄 || 0),
          '出身势力：' + (self.出身势力 || '未定'),
          '学院：' + (self.学院 || '未定'),
          '家族背景：' + (self.家族背景 || '未定'),
          '开局预设：' + (setup.开局预设 || '未选'),
          '初始召唤兽：' + (setup.初始召唤兽 || '未选'),
          '现有技能：' + ((beast.技能 || []).join('、') || '无'),
          '',
          '请生成这头召唤兽的完整进化树。'
        ].join('\n');

        return await runGeneration(sys, usr);
      } catch (err) {
        console.warn('[进化树] 生成失败', err);
        return { ok: false, reason: (err && err.message) ? err.message : String(err) };
      }
    });
  }

  /* ---------------- 技能树生成器 ----------------
     结构对齐参考卡：技能列表(record) + 总SP + 已使用SP
     标准模式：一次生成完整技能树
     分两步生成：先骨架，再补每一级特殊效果                                   */
  async function generateSkillTree(styleHint, twoStep, standardMode) {
    return withLock('skill', async () => {
      try {
        const sd = readSnapshot();
        if (!sd) return { ok: false, reason: 'MVU 未就绪' };
        const beast = sd.召唤兽 || {};
        if (beast.血统品阶 === undefined) return { ok: false, reason: '召唤兽数据缺失' };
        const rank = 品阶合法值.includes(beast.血统品阶) ? beast.血统品阶 : '凡种';
        const style = String(styleHint || '').trim();

        const 共用约束 = [
          '只输出一个 <UpdateVariable> 块，块内先 <analysis> 再 <JSONPatch>，不要输出任何其他文字。',
          'op 只用 add / replace。path 以 /技能树/ 开头。',
          '写成机制和风味，不要写空泛形容。',
          '每个技能给出 名称、类型、阶位、说明、威力、消耗、前置、已学会。',
          '类型只能是：主动、召唤、特殊。阶位只能是：基础、进阶、终极。',
          '特殊技能默认 3 个，其余都是伤害技能。',
          '不要生成被动技能。',
          '禁止修改任何伤害数值。',
          '前置 填前置技能的键名；无前置填空字符串。',
          '根技能（阶位 基础）的 已学会 写 true，其余写 false。',
          '另外写 /技能树/树名、/技能树/生成依据/物种、/技能树/生成依据/血统品阶、'
            + '/技能树/生成依据/契约形态、/技能树/生成依据/风格要求、/技能树/总SP、/技能树/已使用SP。',
        ].join('\n');

        const 基线 = [
          '【召唤兽】',
          '物种：' + (beast.物种 || '未定'),
          '血统品阶：' + rank,
          '契约形态：' + (beast.契约形态 || '未定'),
          '性格：' + (beast.性格 || '未定'),
          '进化阶段：' + (beast.进化阶段 || 1),
          '【玩家风格要求】' + (style || '（未指定，按物种与品阶自行决定）'),
        ].join('\n');

        if (!twoStep) {
          const sys = ['你是召唤兽技能树生成器。', 共用约束].join('\n');
          return await runGeneration(sys, 基线 + '\n\n请一次生成完整技能树。', standardMode);
        }

        // 第一步：骨架
        const sys1 = [
          '你是召唤兽技能树生成器，当前是第一步：只生成骨架。',
          '只输出一个 <UpdateVariable> 块，块内先 <analysis> 再 <JSONPatch>，不要输出任何其他文字。',
          'op 只用 add / replace。path 以 /技能树/ 开头。',
          '本步只写技能的名称、类型、阶位、前置、已学会，以及 说明 的一行概述。',
          '特殊技能默认 3 个，其余都是伤害技能。不要生成被动技能。',
          '另外写 /技能树/树名、/技能树/生成依据/物种、/技能树/生成依据/血统品阶、'
            + '/技能树/生成依据/契约形态、/技能树/生成依据/风格要求、/技能树/总SP、/技能树/已使用SP。',
        ].join('\n');
        const r1 = await runGeneration(sys1, 基线 + '\n\n请生成技能树骨架（名称、类型、阶位、前置）。', standardMode);
        if (!r1.ok) return r1;

        // 第二步：补每一级特殊效果
        const sd2 = readSnapshot();
        const skeleton = JSON.stringify((sd2 && sd2.技能树) || {});
        const sys2 = [
          '你是召唤兽技能树生成器，当前是第二步：为已有骨架补全每一级特殊效果。',
          '只输出一个 <UpdateVariable> 块，块内先 <analysis> 再 <JSONPatch>，不要输出任何其他文字。',
          'op 只用 replace，path 指向 /技能树/技能列表/<已有键名>/说明 等字段。',
          '不要新增技能，不要改名，不要改类型、阶位、前置。',
          '把每个技能的 说明 补成具体的机制描述，并给出合理的 威力 与 消耗。',
          '禁止修改任何伤害数值。',
        ].join('\n');
        const r2 = await runGeneration(
          sys2,
          基线 + '\n\n【上一步生成的骨架】\n' + skeleton + '\n\n请补全每一级特殊效果。',
          standardMode
        );
        if (!r2.ok) return { ok: false, reason: '第二步失败：' + r2.reason + '（骨架已写入，可重试）' };
        return { ok: true, raw: r2.raw, twoStep: true };
      } catch (err) {
        console.warn('[技能树] 生成失败', err);
        return { ok: false, reason: (err && err.message) ? err.message : String(err) };
      }
    });
  }

  try {
    if (typeof initializeGlobal === 'function') {
      initializeGlobal(NS + '_evolution', generateEvolutionTree);
      initializeGlobal(NS + '_skill', generateSkillTree);
    }
  } catch (e) {}
  window[NS + '_evolution'] = generateEvolutionTree;
  window[NS + '_skill'] = generateSkillTree;
})();
