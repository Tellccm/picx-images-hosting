/* ============================================================
   卡内前端 · 技能树生成面板
   布局对齐参考截图：输入框 + 生成按钮 / 两个开关行 / 说明 / 虚线占位区 / 技能树展示
   图标策略：无图标，全文字
   状态：设计稿，未在真机执行
   ============================================================ */
(function () {
  'use strict';
  const NS = 'zhaohuan-skill';
  const root = document.getElementById(NS);
  if (!root || root.dataset.zksBound === '1') return;
  root.dataset.zksBound = '1';

  const $ = (s) => root.querySelector(s);
  let twoStep = true;       // 默认开：分两步生成
  let standardMode = false; // 默认关：标准模式
  let busy = false;
  const disposers = [];

  function toast(msg, ok) {
    const el = $('#zks-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.borderColor = ok === false ? 'rgba(200,80,90,.7)' : 'rgba(60,110,80,.6)';
    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('on'), 2400);
  }

  function hostWindow() {
    try { if (window.top && window.top.document) return window.top; } catch (e) {}
    try { if (window.parent && window.parent.document) return window.parent; } catch (e) {}
    return window;
  }
  function mvu() {
    const w = hostWindow();
    return (typeof Mvu !== 'undefined' && Mvu) || w.Mvu || null;
  }
  function readSkillTree() {
    try {
      const M = mvu();
      if (!M || typeof M.getMvuData !== 'function') return null;
      const d = M.getMvuData({ type: 'message', message_id: 'latest' });
      return d && d.stat_data ? (d.stat_data.技能树 || {}) : null;
    } catch (e) { return null; }
  }
  function readBeast() {
    try {
      const M = mvu();
      if (!M || typeof M.getMvuData !== 'function') return null;
      const d = M.getMvuData({ type: 'message', message_id: 'latest' });
      return d && d.stat_data ? (d.stat_data.召唤兽 || {}) : null;
    } catch (e) { return null; }
  }

  // 优先用跨 iframe 共享接口，其次本窗口全局
  async function callGenerator(styleHint, useTwoStep, isStandardMode) {
    const w = hostWindow();
    let fn = null;
    try {
      if (typeof waitGlobalInitialized === 'function') fn = await waitGlobalInitialized('zhaohuan-gen_skill');
    } catch (e) {}
    if (typeof fn !== 'function') fn = window['zhaohuan-gen_skill'] || w['zhaohuan-gen_skill'];
    if (typeof fn !== 'function') return { ok: false, reason: '生成器未注册（脚本侧未加载？）' };
    return await fn(styleHint, useTwoStep, isStandardMode);
  }

  async function doGenerate() {
    if (busy) { toast('正在生成，请稍候'); return; }
    const beast = readBeast();
    if (!beast || !beast.物种 || beast.物种 === '未定') {
      toast('尚未确定召唤兽物种，无法生成技能树', false);
      return;
    }
    busy = true;
    const btn = $('#zks-gen');
    if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
    const before = JSON.stringify((readSkillTree() || {}).技能列表 || {});
    try {
      const hint = String(($('#zks-style') || {}).value || '').trim();
      const r = await callGenerator(hint, twoStep, standardMode);
      if (r && r.ok) {
        toast(twoStep ? '技能树已生成（分两步）' : '技能树已生成');
        render();
      } else {
        toast('生成失败：' + ((r && r.reason) || '未知原因'), false);
      }
    } catch (e) {
      toast('生成失败：' + (e && e.message ? e.message : e), false);
    } finally {
      busy = false;
      if (btn) { btn.disabled = false; btn.textContent = '生成技能树'; }
      void before;
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  const 阶位顺序 = { 基础: 1, 进阶: 2, 终极: 3 };

  function renderTree() {
    const t = readSkillTree();
    const beast = readBeast();
    const box = $('#zks-tree');
    if (!box) return;

    const subject = (beast && beast.物种 && beast.物种 !== '未定')
      ? ((beast.血统品阶 || '') + ' · ' + beast.物种 + (beast.契约形态 && beast.契约形态 !== '未定' ? ' · ' + beast.契约形态 : ''))
      : '未确定召唤兽';

    if (!t || !t.技能列表 || !Object.keys(t.技能列表).length) {
      box.innerHTML =
        '<div class="zks-empty-subject">当前对象：' + esc(subject) + '</div>' +
        '<div class="zks-empty-main">点击上方按钮，为该召唤兽生成专属技能树</div>';
      return;
    }

    const list = t.技能列表;
    const keys = Object.keys(list).sort((a, b) => {
      const sa = 阶位顺序[list[a].阶位] || 9, sb = 阶位顺序[list[b].阶位] || 9;
      return sa - sb;
    });
    const sp = Math.floor(Number(t.总SP) || 0);
    const used = Math.floor(Number(t.已使用SP) || 0);

    const h = [];
    h.push('<div class="zks-tree-head">' +
      '<div class="zks-tree-title">' + esc(t.树名 || '未命名技能树') + '</div>' +
      '<div class="zks-tree-sub">' + esc(subject) + '</div>' +
      '<div class="zks-sp">SP ' + used + ' / ' + sp + '</div>' +
      '</div>');

    ['基础', '进阶', '终极'].forEach((tier) => {
      const group = keys.filter((k) => (list[k].阶位 || '基础') === tier);
      if (!group.length) return;
      h.push('<div class="zks-tier"><div class="zks-tier-label">' + tier + '</div><div class="zks-nodes">');
      group.forEach((k) => {
        const s = list[k];
        const learned = !!s.已学会;
        h.push('<div class="zks-node' + (learned ? ' on' : '') + '">' +
          '<div class="zks-n-top"><span class="zks-n-name">' + esc(s.名称 || k) + '</span>' +
          '<span class="zks-n-type">' + esc(s.类型 || '主动') + '</span></div>' +
          '<div class="zks-n-desc">' + esc(s.说明 || '') + '</div>' +
          '<div class="zks-n-meta">威力 ' + (Math.floor(Number(s.威力) || 0)) +
          '　消耗 ' + (Math.floor(Number(s.消耗) || 0)) +
          (s.前置 ? '　前置 ' + esc(s.前置) : '') + '</div>' +
          '<div class="zks-n-state">' + (learned ? '已学会' : '未学会') + '</div>' +
          '</div>');
      });
      h.push('</div></div>');
    });

    box.innerHTML = h.join('');
  }

  function renderChrome() {
    const beast = readBeast();
    const name = (beast && beast.物种 && beast.物种 !== '未定') ? beast.物种 : '召唤兽';
    $('#zks-title').textContent = name + ' 技能树';
    const s1 = $('#zks-sw-standard'), s2 = $('#zks-sw-twostep');
    if (s1) s1.classList.toggle('on', standardMode);
    if (s2) s2.classList.toggle('on', twoStep);
  }

  function render() { renderChrome(); renderTree(); }

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#zks-gen')) { e.preventDefault(); doGenerate(); return; }
    if (t.closest('#zks-sw-standard')) { standardMode = !standardMode; renderChrome(); return; }
    if (t.closest('#zks-sw-twostep')) { twoStep = !twoStep; renderChrome(); return; }
  });

  function boot() {
    render();
    try {
      const M = mvu();
      if (typeof eventOn === 'function' && M && M.events) {
        disposers.push(eventOn(M.events.VARIABLE_UPDATE_ENDED, () => render()));
        disposers.push(eventOn(M.events.VARIABLE_INITIALIZED, () => render()));
      }
    } catch (e) { console.warn('[技能树] 订阅失败', e); }
  }

  window.addEventListener('unload', () => {
    while (disposers.length) { try { disposers.pop()(); } catch (e) {} }
  });

  if (mvu()) boot(); else setTimeout(boot, 900);
})();
