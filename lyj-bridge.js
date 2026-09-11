/* ============================================================================
 * lyj-bridge.js —— 《灵渊纪：守与放》前端页共用取数层
 *
 * 三个页面（卷首 cover / 状态面板 panel / 开局文书 charter）都通过它跟酒馆通信：
 *   读  getVariables({type:'message', message_id:getCurrentMessageId()}) → .stat_data
 *   写  Mvu.getMvuData / Mvu.replaceMvuData（拿不到 Mvu 时退回 getVariables+replaceVariables）
 *   切  SillyTavern.chat[0].swipe_id / .mes
 *   书  TavernHelper.getWorldbook / updateWorldbookWith / getCharWorldbookNames
 *
 * 页面跑在消息的 iframe 里，所以一切都从 window.top 取；取不到再退回本窗口。
 * 无依赖、无外部资源，可被 <script src> 直接引入。
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* ---------------- 作用域 ---------------- */
  function topWin() {
    try { if (window.top && window.top !== window) return window.top; } catch (e) { /* 跨域忽略 */ }
    return window;
  }
  function TH() {
    var t = topWin();
    try { if (t && t.TavernHelper) return t.TavernHelper; } catch (e) {}
    return global.TavernHelper || null;
  }
  function ST() {
    var t = topWin();
    try { if (t && t.SillyTavern) return t.SillyTavern; } catch (e) {}
    return global.SillyTavern || null;
  }
  function call(name) {
    var h = TH();
    if (h && typeof h[name] === 'function') return h[name].bind(h);
    var t = topWin();
    if (t && typeof t[name] === 'function') return t[name].bind(t);
    if (typeof global[name] === 'function') return global[name].bind(global);
    return null;
  }
  function ok() { return !!(TH() || ST()); }

  /* ---------------- unwrap：剥掉 MVU 的 [值, 说明] 包装 ---------------- */
  function unwrap(v) {
    var n = 0;
    while (n++ < 8 && Array.isArray(v) && v.length === 2 && typeof v[1] === 'string') v = v[0];
    return v;
  }
  function pick(obj, path) {
    var cur = unwrap(obj);
    var segs = String(path).split('.');
    for (var i = 0; i < segs.length; i++) {
      if (cur == null) return undefined;
      cur = unwrap(cur[segs[i]]);
    }
    return cur;
  }
  function num(v, d) {
    var x = unwrap(v);
    if (typeof x === 'number') return isFinite(x) ? x : (d == null ? 0 : d);
    if (typeof x === 'boolean') return x ? 1 : 0;
    if (x == null) return d == null ? 0 : d;
    // 宽容解析：取字符串里出现的**第一个**数字
    // 「37 / 95」→37 ｜「3 块」→3 ｜「1,240 金」→1240 ｜「无」→默认值
    var s = String(x).replace(/,/g, '');
    var m = s.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!m) return d == null ? 0 : d;
    var n = parseFloat(m[0]);
    return isFinite(n) ? n : (d == null ? 0 : d);
  }
  function str(v, d) {
    var x = unwrap(v);
    if (x == null) return d == null ? '' : d;
    if (typeof x === 'object') return d == null ? '' : d;
    return String(x).replace(/\s+/g, ' ').trim();
  }
  function bool(v, d) {
    var x = unwrap(v);
    if (x == null) return !!d;
    if (typeof x === 'boolean') return x;
    if (typeof x === 'number') return x !== 0;
    return !/^(false|0|no|否|关)$/i.test(String(x).trim());
  }

  /* ---------------- 当前消息 ---------------- */
  function currentMessageId() {
    var f = call('getCurrentMessageId');
    if (f) { try { var id = f(); if (id != null) return id; } catch (e) {} }
    var st = ST();
    try { if (st && st.chat && st.chat.length) return st.chat.length - 1; } catch (e) {}
    return 0;
  }

  /* ---------------- 读：MVU stat_data ---------------- */
  var lastRaw = null;
  function rawVars() {
    var gv = call('getVariables');
    if (!gv) return null;
    var cur = currentMessageId();
    var out = null;
    try { out = gv({ type: 'message', message_id: cur }); } catch (e) {}
    if (!out) { try { out = gv({ type: 'chat' }); } catch (e) {} }
    lastRaw = out || null;
    return lastRaw;
  }
  function statData() {
    var raw = rawVars();
    if (!raw) return {};
    var sd = unwrap(raw.stat_data);
    if (sd == null || typeof sd !== 'object') {
      sd = unwrap(raw);
      if (sd == null || typeof sd !== 'object' || Array.isArray(sd)) return {};
    }
    return sd;
  }
  function getOf(sd, path, dflt) {
    var v = pick(sd, path);
    return v === undefined || v === null ? dflt : v;
  }

  /* ---------------- 写：优先走 Mvu，退回 TavernHelper ---------------- */
  function waitGlobal(name, ms) {
    return new Promise(function (resolve) {
      var t = topWin();
      var deadline = Date.now() + (ms || 3000);
      (function tick() {
        var g = null;
        try { g = t && t[name]; } catch (e) {}
        if (!g) g = global[name];
        if (g) return resolve(g);
        if (Date.now() > deadline) return resolve(null);
        setTimeout(tick, 60);
      })();
    });
  }
  function setByPath(obj, path, value) {
    var segs = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < segs.length - 1; i++) {
      if (cur[segs[i]] == null || typeof cur[segs[i]] !== 'object') cur[segs[i]] = {};
      cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = value;
  }
  // 写单个字段：path 形如 '主角.属性.体魄'（不用带 stat_data 前缀）
  async function set(path, value) {
    var cur = currentMessageId();
    var Mvu = await waitGlobal('Mvu', 3000);
    if (Mvu && typeof Mvu.getMvuData === 'function' && typeof Mvu.replaceMvuData === 'function') {
      var d = Mvu.getMvuData({ type: 'message', message_id: cur });
      setByPath(d, 'stat_data.' + path, value);
      await Mvu.replaceMvuData(d, { type: 'message', message_id: cur });
      return true;
    }
    var gv = call('getVariables'), rv = call('replaceVariables');
    if (gv && rv) {
      var all = gv({ type: 'message', message_id: cur }) || {};
      setByPath(all, 'stat_data.' + path, value);
      await rv(all, { type: 'message', message_id: cur });
      return true;
    }
    return false;
  }

  /* ---------------- 开局切换（直接改 chat[0] 的 swipe_id） ---------------- */
  async function selectGreeting(swipeId) {
    var index = Number(swipeId);
    if (!Number.isInteger(index) || index < 0) throw new Error('开场编号无效');
    var st = ST();
    var chat = st && st.chat;
    if (chat && chat[0] && Array.isArray(chat[0].swipes) && chat[0].swipes.length) {
      if (index >= chat[0].swipes.length) throw new Error('所选开场不存在');
      chat[0].swipe_id = index;
      chat[0].mes = chat[0].swipes[index];
      if (typeof st.updateMessageBlock === 'function') { try { await st.updateMessageBlock(0, chat[0]); } catch (e) {} }
      else if (typeof st.reloadCurrentChat === 'function') { try { await st.reloadCurrentChat(); } catch (e) {} }
      return true;
    }
    // 退回 TavernHelper 通道
    var getMsgs = call('getChatMessages'), setMsg = call('setChatMessage');
    if (getMsgs && setMsg) {
      var messages = await getMsgs('0', { include_swipes: true });
      var first = messages && messages[0];
      if (!first || !Array.isArray(first.swipes) || first.swipes[index] == null) throw new Error('所选开场不存在');
      await setMsg(String(first.swipes[index]), 0, { swipe_id: index, refresh: 'display_and_render_current' });
      return true;
    }
    throw new Error('当前环境不支持切换开场（需在酒馆聊天中打开）');
  }

  /* ---------------- 发一条玩家消息 ---------------- */
  async function sendAsUser(text) {
    var create = call('createChatMessages');
    if (create) {
      try { await create([{ role: 'user', message: String(text) }], { position: 'end' }); return true; } catch (e) {}
    }
    var f = call('sendMessageAsUser') || call('sendMessage');
    if (f) { try { await f(String(text)); return true; } catch (e) {} }
    return false;
  }

  /* ---------------- 世界书开关（首页用） ---------------- */
  async function worldbookNames() {
    var t = topWin();
    try {
      var h = t && t.TavernHelper;
      if (h && typeof h.getCharWorldbookNames === 'function') {
        var names = h.getCharWorldbookNames('current');
        return names ? (names.primary || null) : null;
      }
    } catch (e) {}
    return null;
  }
  async function worldbookEntries(bookName) {
    var h = TH();
    if (!h || typeof h.getWorldbook !== 'function' || !bookName) return [];
    try {
      var list = await h.getWorldbook(bookName);
      return Array.isArray(list) ? list.map(function (e) {
        return { name: str(e && e.name), enabled: bool(e && e.enabled) };
      }) : [];
    } catch (e) { return []; }
  }
  async function setWorldbookEnabled(bookName, nameEnabledPairs) {
    var h = TH();
    if (!h || typeof h.updateWorldbookWith !== 'function' || !bookName) return false;
    var map = new Map((nameEnabledPairs || []).map(function (p) { return [p.name, !!p.enabled]; }));
    try {
      await h.updateWorldbookWith(bookName, function (entries) {
        return entries.map(function (e) {
          var v = map.get(e.name);
          return v === undefined ? e : Object.assign({}, e, { enabled: v });
        });
      });
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- 主角名 / 头像（可选） ---------------- */
  function userName() {
    var st = ST();
    try { if (st && st.name1) return String(st.name1); } catch (e) {}
    return '';
  }
  async function userAvatarPath() {
    var st = ST();
    if (!st || typeof st.substituteParams !== 'function') return '';
    try {
      var v = await st.substituteParams('{{userAvatarPath}}');
      v = String(v || '').trim();
      return (v && v !== '{{userAvatarPath}}') ? v : '';
    } catch (e) { return ''; }
  }

  /* ---------------- 刷新：消息变化就重渲染 ---------------- */
  function onRefresh(fn, opts) {
    var o = opts || {};
    var lastKey = '';
    function key() { return String(currentMessageId()) + '|' + JSON.stringify(statData()).length; }
    function run() {
      var k = key();
      if (k === lastKey) return;
      lastKey = k;
      try { fn(statData()); } catch (e) { console.warn('[LYJ] 刷新失败:', e); }
    }
    run();
    var tries = 0;
    var fast = setInterval(function () { run(); if (++tries >= 6) clearInterval(fast); }, 400);
    var slow = setInterval(run, 3000);
    setTimeout(function () { clearInterval(slow); }, 5 * 60 * 1000);
    try {
      var target = document.body;
      var mo = new MutationObserver(function () { if (o.throttle !== false) run(); });
      mo.observe(target, { childList: true, subtree: true });
    } catch (e) {}
    var evOn = call('eventOn');
    if (evOn) {
      ['MESSAGE_RECEIVED', 'MESSAGE_SENT', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'CHAT_CHANGED'].forEach(function (ev) {
        try { evOn(ev, run); } catch (e) {}
      });
    }
  }

  global.LYJ = {
    version: '0.1.0',
    ok: ok,
    topWin: topWin,
    TavernHelper: TH,
    SillyTavern: ST,
    call: call,
    unwrap: unwrap,
    pick: pick,
    num: num,
    str: str,
    bool: bool,
    currentMessageId: currentMessageId,
    statData: statData,
    get: getOf,
    set: set,
    selectGreeting: selectGreeting,
    sendAsUser: sendAsUser,
    worldbookNames: worldbookNames,
    worldbookEntries: worldbookEntries,
    setWorldbookEnabled: setWorldbookEnabled,
    userName: userName,
    userAvatarPath: userAvatarPath,
    onRefresh: onRefresh,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
