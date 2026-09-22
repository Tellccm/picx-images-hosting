/* 江湾壹号 · 认知修改终端 —— 状态栏 + 双刻线（羞耻/欲望） + 全景小地图 + 常识控制台 */
const PIC_JSD = "https://cdn.jsdelivr.net/gh/Tellccm/picx-images-hosting@master/";
const PIC_RAW = "https://github.com/Tellccm/picx-images-hosting/raw/master/";
const avatars = {
  "沈若薇": "若薇.4clnjnwc7f.webp",
  "周岚": "周岚.b9o59san9.webp",
  "温以宁": "温以宁.3d5k6hthuj.webp",
  "user": ""
};

// 头像统一走 jsDelivr，失败回落到 GitHub raw；小圆按头部裁切
function avatarTag(who, cls) {
  const f = avatars[who];
  if (!f) return "";
  const enc = encodeURIComponent(f);
  return '<img class="' + cls + '" src="' + PIC_JSD + enc + '" data-fb="' + PIC_RAW + enc + '"'
    + ' style="object-position:50% 12%"'
    + ' onerror="this.onerror=null;if(this.dataset.fb)this.src=this.dataset.fb;" alt="">';
}

const PERSONS = ["沈若薇", "周岚", "温以宁"];
const MAIN = "沈若薇";

const mapRooms = {
  "2F": [
    { id: "201 周岚主卧", name: "201", desc: "周岚主卧" },
    { id: "202 温以宁套房", name: "202", desc: "温以宁套房" },
    { id: "203 奢华公卫", name: "203", desc: "奢华公卫" },
    { id: "204 书房露台", name: "204", desc: "书房露台" }
  ],
  "1F": [
    { id: "101 挑高大客厅", name: "101", desc: "挑高大客厅" },
    { id: "102 开放式餐厨", name: "102", desc: "开放式餐厨" },
    { id: "103 入户玄关", name: "103", desc: "入户玄关" },
    { id: "104 保姆杂物间", name: "104", desc: "保姆杂物间" }
  ]
};

const DEFAULT_SPACE = {
  "沈若薇": { 房间: "102 开放式餐厨", 动作: "低头收拾碗筷" },
  "周岚": { 房间: "101 挑高大客厅", 动作: "翘腿端着酒杯" },
  "温以宁": { 房间: "202 温以宁套房", 动作: "半掩着门听动静" },
  "user": { 房间: "104 保姆杂物间", 动作: "缩在暗间里" }
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/* ============ 取数 ============ */
function readStat(msgId) {
  try {
    return _.get(getVariables({ type: 'message', message_id: msgId }), 'stat_data', {}) || {};
  } catch (e) {
    try {
      return _.get(Mvu.getMvuData({ type: 'message', message_id: msgId }), 'stat_data', {}) || {};
    } catch (e2) {
      return {};
    }
  }
}

/* ============ 渲染：某人的两条刻线 ============ */
function bars(stat, who) {
  const base = who === MAIN ? stat[MAIN] : _.get(stat, '人物.' + who);
  const o = base && typeof base === 'object' ? base : {};
  const s = num(o.羞耻, 0), w = num(o.欲望, 0);

  function one(label, val, cls) {
    const v = Math.max(0, Math.min(100, val));
    return `<div class="jz-bar"><div class="jz-bar-top"><span class="jz-bar-n">${label}</span><span class="jz-bar-v">${v}</span></div><span class="jz-track"><span class="jz-fill jz-${cls}" style="width:${v}%"></span></span></div>`;
  }

  const heart = String(o.心声 == null ? '' : o.心声).trim();

  return `<div class="jz-card">
    <div class="jz-card-head">
      <span class="jz-face">${avatars[who] ? avatarTag(who, "") : `<b>${esc(who.slice(0, 1))}</b>`}</span>
      <span class="jz-name">${esc(who)}</span>
    </div>
    <div class="jz-bars">
      ${one('羞耻', s, 'shame')}
      ${one('欲望', w, 'want')}
    </div>
    ${heart ? `<div class="jz-heart">「${esc(heart)}」</div>` : ''}
  </div>`;
}

/* ============ 渲染：全景小地图 ============ */
function floorHtml(stat, floorKey) {
  const spaces = _.get(stat, '空间状态', {}) || {};
  const occ = {};
  Object.keys(spaces).forEach(function (who) {
    const info = spaces[who] || {};
    const r = info.房间 || (DEFAULT_SPACE[who] ? DEFAULT_SPACE[who].房间 : '');
    if (!r) return;
    if (!occ[r]) occ[r] = [];
    occ[r].push({ who: who, act: info.动作 || '' });
  });

  return mapRooms[floorKey].map(function (r) {
    const list = occ[r.id] || [];
    const chips = list.map(function (o) {
      const isUser = o.who === 'user';
      const av = avatars[o.who];
      return `<span class="jz-occ ${isUser ? 'jz-occ-user' : ''}" title="${esc(o.who)}：${esc(o.act)}">
        ${av ? avatarTag(o.who, "") : `<b>${isUser ? '我' : esc(o.who.slice(0, 1))}</b>`}
      </span>`;
    }).join('');

    const acts = list.map(function (o) {
      return `<span class="jz-act"><i>${esc(o.who === 'user' ? '你' : o.who)}</i>${esc(o.act)}</span>`;
    }).join('');

    return `<div class="jz-room ${list.length ? 'jz-room-on' : ''}">
      <div class="jz-room-top"><span class="jz-room-id">${r.name}</span><span class="jz-room-desc">${r.desc}</span></div>
      <div class="jz-room-occs">${chips || '<span class="jz-empty">—</span>'}</div>
      ${acts ? `<div class="jz-acts">${acts}</div>` : ''}
    </div>`;
  }).join('');
}

/* ============ 渲染：常识日志 ============ */
function logsHtml(stat) {
  const logs = _.get(stat, '常识修改系统.修改日志', {}) || {};
  let out = '';
  PERSONS.forEach(function (p) {
    const list = Array.isArray(logs[p]) ? logs[p] : [];
    if (!list.length) return;
    out += `<div class="jz-lgroup"><div class="jz-lwho">${esc(p)}</div>`;
    list.forEach(function (it) {
      const on = !!it.启用;
      out += `<div class="jz-litem ${on ? '' : 'jz-loff'}">
        <span class="jz-ltxt"><i>#${esc(it.id)}</i>${esc(it.内容)}</span>
        <span class="jz-lbtns">
          <button class="jz-b jz-b-on" data-cmd="${esc(on ? `[关闭常识 ${p}: ${it.id}]` : `[开启常识 ${p}: ${it.id}]`)}">${on ? '🟢 运行中' : '⚪ 已停用'}</button>
          <button class="jz-b jz-b-del" data-cmd="${esc(`[撤回常识 ${p}: ${it.id}]`)}" data-confirm="撤回 ${esc(p)} 的 #${esc(it.id)}？">🗑</button>
        </span>
      </div>`;
    });
    out += `</div>`;
  });
  return out;
}

/* ============ 渲染整个终端 ============ */
function render(stat) {
  const shame = num(_.get(stat, '常识修改系统.羞辱值', 0), 0);
  const count = num(_.get(stat, '常识修改系统.可用次数', 0), 0);
  const day = num(_.get(stat, '时间.第几天', 1), 1);
  const period = _.get(stat, '时间.时段', '傍晚') || '傍晚';
  const ready = count > 0;

  const logs = logsHtml(stat);

  return `<div class="jz">
    <div class="jz-head">
      <span class="jz-brand"><i>⚡</i>江湾壹号 · 认知修改终端</span>
      <span class="jz-clock">第 ${day} 天 · ${esc(period)}</span>
    </div>

    <div class="jz-shame ${ready ? 'jz-ready' : ''}">
      <div class="jz-shame-top">
        <span class="jz-shame-l">受辱充能</span>
        <span class="jz-shame-r">${shame} / 100${ready ? `<b class="jz-chip">✨ 可注入 ${count} 次</b>` : ''}</span>
      </div>
      <span class="jz-shame-track"><span class="jz-shame-fill" style="width:${shame}%"></span></span>
    </div>

    <div class="jz-sec-title">居所实况</div>
    <div class="jz-map">
      <div class="jz-floor-tag">2F 私密区</div>
      <div class="jz-grid">${floorHtml(stat, '2F')}</div>
      <div class="jz-floor-tag">1F 运作区</div>
      <div class="jz-grid">${floorHtml(stat, '1F')}</div>
    </div>

    <div class="jz-sec-title">两条刻线</div>
    <div class="jz-cards">${PERSONS.map(function (p) { return bars(stat, p); }).join('')}</div>

    <div class="jz-sec-title">常识注入</div>
    <div class="jz-console">
      <div class="jz-crow">
        <select class="jz-select" id="jz-target">
          <option value="沈若薇">沈若薇（保姆母亲）</option>
          <option value="周岚">周岚（周家千金）</option>
          <option value="温以宁">温以宁（对门太太）</option>
        </select>
        <input class="jz-input" id="jz-text" placeholder="写下你要她相信的那句话……" />
        <button class="jz-b jz-inject ${ready ? '' : 'jz-off'}" id="jz-go">注入</button>
      </div>
      <div class="jz-hint">${ready ? `消耗 1 次机会。一次只能对一个人注入一条。` : `充能未满 —— 还得再挨一些。`}</div>
    </div>

    ${logs ? `<div class="jz-sec-title">已写入的常识</div><div class="jz-logs">${logs}</div>` : ''}
  </div>`;
}

/* ============ 交互 ============ */
function sendText(txt) {
  const ta = $('#send_textarea');
  if (ta.length) {
    ta.val(txt);
    try { ta[0].dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    $('#send_but').trigger('click');
    return true;
  }
  return false;
}

$(document).on('click', '#jz-go', function () {
  const who = $('#jz-target').val();
  const txt = String($('#jz-text').val() || '').trim();
  if (!txt) { toastr && toastr.warning ? toastr.warning('先写下你要她相信的那句话') : alert('先写下你要她相信的那句话'); return; }
  if (sendText(`[常识修改 ${who}: ${txt}]`)) $('#jz-text').val('');
});

$(document).on('click', '.jz-b[data-cmd]', function () {
  const cmd = $(this).attr('data-cmd');
  const cfm = $(this).attr('data-confirm');
  if (cfm && !confirm(cfm)) return;
  sendText(cmd);
});

/* ============ 样式 ============ */
const JZ_CSS = `
.jz{box-sizing:border-box;width:100%;margin:14px 0 6px;padding:13px 15px 14px;border-radius:15px;
  background:linear-gradient(150deg,rgba(24,20,30,.94),rgba(12,10,16,.97));
  border:1px solid rgba(212,175,120,.28);
  box-shadow:0 10px 34px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);
  color:#f0e6ea;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Serif SC",sans-serif;font-size:12px;line-height:1.55;text-align:left}
.jz *{box-sizing:border-box}
.jz-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,.07)}
.jz-brand{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:12.5px;letter-spacing:.04em;color:#f6e9d8}
.jz-brand i{font-style:normal;color:#e0b877;text-shadow:0 0 9px rgba(224,184,119,.6)}
.jz-clock{font-size:11px;padding:2px 9px;border-radius:999px;background:rgba(224,184,119,.12);border:1px solid rgba(224,184,119,.3);color:#e8cf9f}

.jz-shame{margin:11px 0 4px;padding:8px 10px;border-radius:9px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06)}
.jz-ready{border-color:rgba(224,184,119,.5);box-shadow:0 0 14px rgba(224,184,119,.16) inset}
.jz-shame-top{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;margin-bottom:5px}
.jz-shame-l{color:#9d94a8;letter-spacing:.06em}
.jz-shame-r{color:#e0899c;font-weight:700;font-variant-numeric:tabular-nums}
.jz-chip{margin-left:7px;color:#e8cf9f;text-shadow:0 0 7px rgba(232,207,159,.5)}
.jz-shame-track{display:block;height:6px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
.jz-shame-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#a8556b,#e0899c,#e8cf9f);transition:width .45s ease}

.jz-sec-title{margin:12px 0 6px;font-size:10.5px;letter-spacing:.16em;color:#8d8497;font-weight:600}

.jz-map{padding:9px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.06)}
.jz-floor-tag{font-size:10px;color:#c9a86a;font-weight:600;margin:2px 0 5px;letter-spacing:.08em}
.jz-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px}
.jz-room{padding:6px 6px 5px;border-radius:7px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055);min-height:52px}
.jz-room-on{border-color:rgba(224,184,119,.38);background:rgba(224,184,119,.06)}
.jz-room-top{display:flex;align-items:baseline;gap:4px;margin-bottom:4px}
.jz-room-id{font-size:11.5px;font-weight:700;color:#f3ead9}
.jz-room-desc{font-size:8.5px;color:#6b6577;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jz-room-occs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:3px}
.jz-empty{font-size:9px;color:#4d4859}
.jz-occ{width:22px;height:22px;border-radius:50%;overflow:hidden;border:1.5px solid #d4af78;background:#16121c;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#f0e6ea}
.jz-occ-user{border-color:#7fb6c9}
.jz-occ img{width:100%;height:100%;object-fit:cover;display:block}
.jz-acts{display:flex;flex-direction:column;gap:1px}
.jz-act{font-size:8.5px;color:#8a8397;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jz-act i{font-style:normal;color:#c9a86a;margin-right:3px}

.jz-cards{display:flex;flex-direction:column;gap:8px}
.jz-card{padding:8px 10px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.055)}
.jz-card-head{display:flex;align-items:center;gap:7px;margin-bottom:6px}
.jz-face{width:26px;height:26px;border-radius:8px;overflow:hidden;border:1.2px solid rgba(212,175,120,.45);background:#16121c;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:0 0 auto}
.jz-face img{width:100%;height:100%;object-fit:cover;display:block}
.jz-name{font-size:12.5px;font-weight:700;color:#f6e9d8}
.jz-bars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.jz-bar{min-width:0}
.jz-bar-top{display:flex;justify-content:space-between;align-items:baseline;gap:4px}
.jz-bar-n{font-size:9.5px;color:#9d94a8;letter-spacing:.06em}
.jz-bar-v{font-size:10.5px;font-weight:700;color:#f0e6ea;font-variant-numeric:tabular-nums}
.jz-track{display:block;height:5px;margin-top:3px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
.jz-fill{display:block;height:100%;border-radius:999px;transition:width .5s cubic-bezier(.34,1.56,.64,1)}
.jz-fill.jz-shame{background:linear-gradient(90deg,#b85c6e,#e0899c)}
.jz-fill.jz-want{background:linear-gradient(90deg,#9d6fb0,#d98fb0)}
.jz-heart{margin-top:6px;padding:4px 9px;border-radius:6px;background:rgba(255,255,255,.035);border-left:2px solid #c9a86a;font-size:11px;font-style:italic;color:#e4d8c8;word-break:break-word}

.jz-console{padding:9px 10px;border-radius:9px;background:rgba(224,184,119,.05);border:1px dashed rgba(224,184,119,.32)}
.jz-crow{display:flex;gap:6px;flex-wrap:wrap}
.jz-select,.jz-input{background:#15111c;border:1px solid rgba(255,255,255,.14);color:#f0e6ea;border-radius:6px;padding:5px 8px;font-size:11.5px;outline:none}
.jz-select{flex:0 0 auto}
.jz-input{flex:1 1 140px;min-width:120px}
.jz-select:focus,.jz-input:focus{border-color:rgba(224,184,119,.55)}
.jz-b{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#f0e6ea;border-radius:6px;padding:4px 9px;font-size:10.5px;cursor:pointer;transition:all .18s ease}
.jz-b:hover{background:rgba(255,255,255,.14)}
.jz-inject{background:linear-gradient(135deg,#a8863f,#e0b877);color:#1a1210;font-weight:700;border:none}
.jz-inject.jz-off{opacity:.45;cursor:not-allowed;filter:grayscale(.7)}
.jz-hint{margin-top:6px;font-size:10px;color:#8d8497}

.jz-logs{display:flex;flex-direction:column;gap:6px}
.jz-lgroup{border-radius:8px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.05);padding:6px 8px}
.jz-lwho{font-size:10.5px;font-weight:700;color:#c9a86a;margin-bottom:4px;letter-spacing:.06em}
.jz-litem{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 0;border-top:1px solid rgba(255,255,255,.045)}
.jz-litem:first-of-type{border-top:none}
.jz-loff{opacity:.5}
.jz-loff .jz-ltxt{text-decoration:line-through}
.jz-ltxt{flex:1;min-width:0;font-size:11px;color:#e8dfe4;word-break:break-word}
.jz-ltxt i{font-style:normal;color:#c9a86a;margin-right:5px;font-size:10px}
.jz-lbtns{display:flex;gap:4px;flex:0 0 auto}
.jz-b-on{font-size:9.5px;padding:3px 7px}
.jz-b-del{padding:3px 6px;font-size:10px;background:transparent;border-color:rgba(255,255,255,.1)}

@media (max-width:560px){
  .jz-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .jz-bars{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
  .jz-room-desc{display:none}
}
`;

/* ============ 挂载 ============ */
const JZ_ID = 'jz-terminal-style';

function paint(msgId, force) {
  const el = retrieveDisplayedMessage(msgId);
  if (!el || el.length === 0) return;
  const stat = readStat(msgId);
  const sig = JSON.stringify([stat['常识修改系统'], stat['空间状态'], stat['时间'], stat[MAIN], stat['人物']]);
  const key = 'jzSig_' + msgId;
  if (!force && el.data(key) === sig && el.find('.jz').length > 0) return;
  el.find('.jz').remove();
  el.append(render(stat));
  el.data(key, sig);
}

function paintRecent(force) {
  let ids = [];
  try {
    ids = getChatMessages('0-{{lastMessageId}}', { role: 'assistant', hide_state: 'unhidden' }).map(function (m) { return m.message_id; });
  } catch (e) {
    const last = getLastMessageId();
    for (let i = Math.max(0, last - 4); i <= last; i++) ids.push(i);
  }
  const keep = {};
  ids.forEach(function (id) { keep[id] = 1; });
  $('.jz').each(function () {
    const f = Number($(this).closest('.mes').attr('mesid'));
    if (Number.isFinite(f) && !keep[f]) $(this).remove();
  });
  ids.forEach(function (id) { paint(id, force); });
}

function paintLast() {
  const id = getLastMessageId();
  if (id >= 0) paint(id, true);
}

$(() => {
  if (!$('#' + JZ_ID).length) $('head').append($('<style>').attr('id', JZ_ID).text(JZ_CSS));

  paintRecent(true);

  let tick = 0;
  window.setInterval(function () {
    tick += 1;
    try {
      if (tick % 10 === 0) paintRecent(false);
      else paintLast();
    } catch (e) { console.error('[状态栏] 刷新失败', e); }
  }, 2200);

  const onMsg = function (id) {
    const f = Number.isFinite(Number(id)) ? Number(id) : getLastMessageId();
    if (f >= 0) paint(f, true);
  };

  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onMsg);
  eventOn(tavern_events.MESSAGE_UPDATED, onMsg);
  eventOn(tavern_events.MESSAGE_SWIPED, onMsg);
  eventOn(tavern_events.MESSAGE_EDITED, onMsg);
  eventOn(tavern_events.MESSAGE_RECEIVED, () => setTimeout(paintLast, 120));
  eventOn(tavern_events.CHAT_CHANGED, () => { $('.jz').remove(); setTimeout(() => paintRecent(true), 260); });
  eventOn(tavern_events.MORE_MESSAGES_LOADED, () => setTimeout(() => paintRecent(true), 220));
  eventOn(tavern_events.MESSAGE_DELETED, () => setTimeout(() => paintRecent(true), 220));

  $(window).on('pagehide', function () {
    $('.jz').remove();
    $('#' + JZ_ID).remove();
  });

  console.info('[状态栏] 认知修改终端已挂载');
});
