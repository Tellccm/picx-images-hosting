/* 江湾壹号 3601 · 顶奢认知修改终端 —— 状态栏与全景小地图 (重构美化版 v2.5) */
const PIC_JSD = "https://cdn.jsdelivr.net/gh/Tellccm/picx-images-hosting@master/";
const PIC_RAW = "https://github.com/Tellccm/picx-images-hosting/raw/master/";
/* 换头像时把这个数字 +1。
   jsDelivr 给图片发的是 Cache-Control: max-age=604800（7 天），同名覆盖后
   CDN 边缘是新的、但浏览器会直接吃自己缓存里的旧图，只有换 URL 才立刻生效。 */
const AVATAR_VER = "?v=2";
const avatars = {
  "沈若薇": "若薇.4clnjnwc7f.webp",
  "周岚": "周岚.b9o59san9.webp",
  "温以宁": "温以宁.3d5k6hthuj.webp",
  "user": ""
};

function avatarTag(who, cls) {
  const f = avatars[who];
  if (!f) return "";
  const enc = encodeURIComponent(f);
  return '<img class="' + cls + '" src="' + PIC_JSD + enc + AVATAR_VER + '" data-fb="' + PIC_RAW + enc + AVATAR_VER + '"'
    + ' style="object-position:50% 12%"'
    + ' onerror="this.onerror=null;if(this.dataset.fb)this.src=this.dataset.fb;" alt="">';
}

const PERSONS = ["沈若薇", "周岚", "温以宁"];
const MAIN = "沈若薇";

const mapRooms = {
  "2F": [
    { id: "201 周岚主卧", name: "201", desc: "周岚主卧", tag: "禁区" },
    { id: "202 温以宁套房", name: "202", desc: "温以宁套房", tag: "对门" },
    { id: "203 奢华公卫", name: "203", desc: "奢华公卫", tag: "水汽" },
    { id: "204 书房露台", name: "204", desc: "书房露台", tag: "藏酒" }
  ],
  "1F": [
    { id: "101 挑高大客厅", name: "101", desc: "挑高大客厅", tag: "王座" },
    { id: "102 开放式餐厨", name: "102", desc: "开放式餐厨", tag: "残羹" },
    { id: "103 入户玄关", name: "103", desc: "入户玄关", tag: "落尘" },
    { id: "104 保姆杂物间", name: "104", desc: "保姆暗间", tag: "寄居" }
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

function getAxisStage(type, val) {
  const v = num(val, 0);
  if (type === 'shame') {
    if (v >= 80) return { t: '羞耻濒界', c: 'jz-pill-danger' };
    if (v >= 55) return { t: '别扭顺从', c: 'jz-pill-warn' };
    if (v >= 30) return { t: '心防动摇', c: 'jz-pill-gold' };
    return { t: '自认正当', c: 'jz-pill-mute' };
  } else {
    if (v >= 80) return { t: '彻底苏醒', c: 'jz-pill-purple' };
    if (v >= 55) return { t: '本能渴求', c: 'jz-pill-violet' };
    if (v >= 30) return { t: '生理初动', c: 'jz-pill-gold' };
    return { t: '沉寂休眠', c: 'jz-pill-mute' };
  }
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

/* ============ 渲染：人物双刻线 ============ */
function bars(stat, who) {
  const base = who === MAIN ? stat[MAIN] : _.get(stat, '人物.' + who);
  const o = base && typeof base === 'object' ? base : {};
  const s = num(o.羞耻, 0), w = num(o.欲望, 0);

  const shameStage = getAxisStage('shame', s);
  const wantStage = getAxisStage('want', w);

  function one(label, val, cls, stage) {
    const v = Math.max(0, Math.min(100, val));
    return '<div class="jz-bar">'
      + '<div class="jz-bar-top">'
      + '<div class="jz-bar-left">'
      + '<span class="jz-bar-n">' + label + '</span>'
      + '<span class="jz-bar-stage ' + stage.c + '">' + stage.t + '</span>'
      + '</div>'
      + '<span class="jz-bar-v">' + v + '<small>%</small></span>'
      + '</div>'
      + '<div class="jz-track-wrap">'
      + '<span class="jz-track"><span class="jz-fill jz-' + cls + '" style="width:' + v + '%"></span></span>'
      + '<div class="jz-track-ticks"><i></i><i></i><i></i></div>'
      + '</div>'
      + '</div>';
  }

  const heart = String(o.心声 == null ? '' : o.心声).trim();

  return '<div class="jz-card">'
    + '<div class="jz-card-head">'
    + '<div class="jz-card-id">'
    + '<div class="jz-face-ring">'
    + (avatars[who] ? avatarTag(who, "jz-face-img") : '<b class="jz-face-char">' + esc(who.slice(0, 1)) + '</b>')
    + '</div>'
    + '<div class="jz-card-meta">'
    + '<div class="jz-name-row"><span class="jz-name">' + esc(who) + '</span></div>'
    + '<span class="jz-sub-label">' + (who === '沈若薇' ? '34岁 · 熟妇清丽' : who === '周岚' ? '34岁 · 傲慢毒舌' : '32岁 · 恶质阔太') + '</span>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="jz-bars">'
    + one('羞耻心防', s, 'shame', shameStage)
    + one('身体欲念', w, 'want', wantStage)
    + '</div>'
    + (heart ? '<div class="jz-heart"><span class="jz-heart-quote">“</span><span class="jz-heart-txt">' + esc(heart) + '</span></div>' : '')
    + '</div>';
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
    const isOccupied = list.length > 0;
    
    const chips = list.map(function (o) {
      const isUser = o.who === 'user';
      const av = avatars[o.who];
      return '<span class="jz-occ ' + (isUser ? 'jz-occ-user' : '') + '" title="' + esc(o.who) + '：' + esc(o.act) + '">'
        + (av ? avatarTag(o.who, "jz-occ-img") : '<b>' + (isUser ? '我' : esc(o.who.slice(0, 1))) + '</b>')
        + '</span>';
    }).join('');

    const acts = list.map(function (o) {
      const isUser = o.who === 'user';
      return '<div class="jz-act-line">'
        + '<span class="jz-act-who ' + (isUser ? 'jz-who-user' : '') + '">' + esc(isUser ? '你' : o.who) + '</span>'
        + '<span class="jz-act-body">' + esc(o.act) + '</span>'
        + '</div>';
    }).join('');

    return '<div class="jz-room ' + (isOccupied ? 'jz-room-active' : '') + '">'
      + '<div class="jz-room-top">'
      + '<div class="jz-room-title-block">'
      + '<span class="jz-room-code">' + r.name + '</span>'
      + '<span class="jz-room-name">' + r.desc + '</span>'
      + '</div>'
      + '<span class="jz-room-tag">' + r.tag + '</span>'
      + '</div>'
      + '<div class="jz-room-occs">' + (chips || '<span class="jz-empty-label">空置</span>') + '</div>'
      + (acts ? '<div class="jz-room-acts-panel">' + acts + '</div>' : '')
      + '</div>';
  }).join('');
}

/* ============ 渲染：常识修改日志 ============ */
function logsHtml(stat) {
  const logs = _.get(stat, '常识修改系统.修改日志', {}) || {};
  let out = '';
  let count = 0;
  PERSONS.forEach(function (p) {
    const list = Array.isArray(logs[p]) ? logs[p] : [];
    if (!list.length) return;
    count += list.length;
    out += '<div class="jz-lgroup">'
      + '<div class="jz-lwho-title"><span>' + esc(p) + '</span><small>生效规则</small></div>';
    list.forEach(function (it) {
      const on = !!it.启用;
      out += '<div class="jz-litem ' + (on ? 'jz-lon' : 'jz-loff') + '">'
        + '<div class="jz-ltxt-block">'
        + '<span class="jz-lseq">#' + esc(it.id) + '</span>'
        + '<span class="jz-ltxt">' + esc(it.内容) + '</span>'
        + '</div>'
        + '<div class="jz-lbtns">'
        + '<button class="jz-btn jz-btn-toggle ' + (on ? 'jz-toggle-active' : '') + '" data-cmd="' + esc(on ? ('[关闭常识 ' + p + ': ' + it.id + ']') : ('[开启常识 ' + p + ': ' + it.id + ']')) + '" title="' + (on ? '点击关闭：认知瞬间恢复原样并产生极致破防' : '点击开启：重新沦陷为绝对认知') + '">'
        + (on ? '⚡ 生效中' : '⚪ 挂起')
        + '</button>'
        + '<button class="jz-btn jz-btn-trash" data-cmd="' + esc('[撤回常识 ' + p + ': ' + it.id + ']') + '" data-confirm="确定彻底撤回 ' + esc(p) + ' 的 #' + esc(it.id) + ' 吗？">✕</button>'
        + '</div>'
        + '</div>';
    });
    out += '</div>';
  });
  return { html: out, count: count };
}

/* ============ 渲染整个终端 ============ */
function render(stat) {
  const shame = num(_.get(stat, '常识修改系统.羞辱值', 0), 0);
  const count = num(_.get(stat, '常识修改系统.可用次数', 0), 0);
  const day = num(_.get(stat, '时间.第几天', 1), 1);
  const period = _.get(stat, '时间.时段', '傍晚') || '傍晚';
  const ready = count > 0;

  const logsData = logsHtml(stat);

  return '<div class="jz jz-theme-luxury">'
    + '<div class="jz-header">'
    + '<div class="jz-brand-group">'
    + '<div class="jz-emblem"><i class="jz-icon-bolt"></i></div>'
    + '<div class="jz-title-meta">'
    + '<div class="jz-main-brand">江湾壹号 3601 <span class="jz-brand-sub">认知修改终端</span></div>'
    + '<div class="jz-brand-tagline">JIANGWAN NO.1 · PENTHOUSE SYSTEM</div>'
    + '</div>'
    + '</div>'
    + '<div class="jz-header-right">'
    + '<div class="jz-clock-badge">'
    + '<span class="jz-clock-day">DAY ' + day + '</span>'
    + '<span class="jz-clock-sep">·</span>'
    + '<span class="jz-clock-period">' + esc(period) + '</span>'
    + '</div>'
    + '<button class="jz-collapse-btn" title="折叠/展开终端面板"><span>▾</span></button>'
    + '</div>'
    + '</div>'

    + '<div class="jz-panel-body">'
    /* 受辱充能 */
    + '<div class="jz-shame-gauge ' + (ready ? 'jz-gauge-ready' : '') + '">'
    + '<div class="jz-gauge-info">'
    + '<div class="jz-gauge-label-group">'
    + '<span class="jz-gauge-dot"></span>'
    + '<span class="jz-gauge-title">受辱屈辱共振池</span>'
    + '<span class="jz-gauge-hint">满100自动溢出转化</span>'
    + '</div>'
    + '<div class="jz-gauge-val-group">'
    + '<span class="jz-gauge-num">' + shame + '</span><span class="jz-gauge-max">/100</span>'
    + (ready ? '<span class="jz-ready-pill">✨ 可注入 ' + count + ' 次</span>' : '')
    + '</div>'
    + '</div>'
    + '<div class="jz-track-container">'
    + '<div class="jz-gauge-track">'
    + '<div class="jz-gauge-fill" style="width:' + Math.min(100, shame) + '%"></div>'
    + '</div>'
    + '</div>'
    + '</div>'

    /* 居所实况 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar"><span class="jz-sec-text">3601 全景居所实况</span><span class="jz-sec-sub">8 大区域实时空间雷达</span></div>'
    + '<div class="jz-floorplan">'
    + '<div class="jz-floor-block">'
    + '<div class="jz-floor-header"><span class="jz-floor-num">2F</span><span class="jz-floor-desc">私密与寝息区 · 实木地暖隔音</span></div>'
    + '<div class="jz-floor-grid">' + floorHtml(stat, '2F') + '</div>'
    + '</div>'
    + '<div class="jz-floor-block">'
    + '<div class="jz-floor-header"><span class="jz-floor-num">1F</span><span class="jz-floor-desc">运作与公共区 · 挑高七米大理石</span></div>'
    + '<div class="jz-floor-grid">' + floorHtml(stat, '1F') + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'

    /* 双刻线 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar"><span class="jz-sec-text">心身双刻线</span><span class="jz-sec-sub">心理羞耻防线 × 肉体感官欲念</span></div>'
    + '<div class="jz-cards-grid">'
    + PERSONS.map(function (p) { return bars(stat, p); }).join('')
    + '</div>'
    + '</div>'

    /* 常识注入控制台 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar"><span class="jz-sec-text">绝对认知写入</span><span class="jz-sec-sub">' + (ready ? '消耗1次可用次数 · 单体单条注入' : '充能蓄积中') + '</span></div>'
    + '<div class="jz-console-box ' + (ready ? 'jz-console-ready' : 'jz-console-locked') + '">'
    + '<div class="jz-console-form">'
    + '<div class="jz-field-target">'
    + '<select class="jz-luxury-select" id="jz-target">'
    + '<option value="沈若薇">沈若薇</option>'
    + '<option value="周岚">周岚</option>'
    + '<option value="温以宁">温以宁</option>'
    + '</select>'
    + '</div>'
    + '<div class="jz-field-input">'
    + '<input class="jz-luxury-input" id="jz-text" placeholder="键入令其视作天经地义的绝对常识……" />'
    + '</div>'
    + '<button class="jz-btn jz-btn-inject ' + (ready ? '' : 'jz-btn-disabled') + '" id="jz-go">'
    + '<span>⚡ 注入常识</span>'
    + '</button>'
    + '</div>'
    + '<div class="jz-console-footer">'
    + '<span class="jz-footer-tip">' + (ready ? '✔ 能量充足：写入后旁观者自动合理化，受体将视作天地常理毫无保留执行。' : '⚠ 屈辱充能尚未饱和（需 ≥ 100 自动结算）：还需在豪宅中承受更多践踏戏弄。') + '</span>'
    + '</div>'
    + '</div>'
    + '</div>'

    /* 已生效常识列表 */
    + (logsData.count > 0 ? (
      '<div class="jz-section-wrap">'
      + '<div class="jz-section-bar"><span class="jz-sec-text">已改写的绝对认知</span><span class="jz-sec-sub">支持随时开关与永久撤回</span></div>'
      + '<div class="jz-logs-container">' + logsData.html + '</div>'
      + '</div>'
    ) : '')

    + '</div>' // end .jz-panel-body
    + '</div>';
}

/* ============ 交互事件 ============ */
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
  if (!txt) {
    if (typeof toastr !== 'undefined' && toastr.warning) toastr.warning('请先写下你要她相信的那句话');
    else alert('请先写下你要她相信的那句话');
    return;
  }
  if (sendText('[常识修改 ' + who + ': ' + txt + ']')) {
    $('#jz-text').val('');
  }
});

$(document).on('click', '.jz-collapse-btn', function () {
  const panel = $(this).closest('.jz').find('.jz-panel-body');
  panel.slideToggle(220);
  $(this).toggleClass('jz-is-collapsed');
});

$(document).on('click', '.jz-btn[data-cmd]', function () {
  const cmd = $(this).attr('data-cmd');
  const cfm = $(this).attr('data-confirm');
  if (cfm && !confirm(cfm)) return;
  sendText(cmd);
});

/* ============ 极致顶奢 CSS 样式表 ============ */
const JZ_CSS = `
.jz{box-sizing:border-box;width:100%;margin:16px 0 8px;padding:0;border-radius:18px;
  background:linear-gradient(165deg,rgba(22,17,30,0.96) 0%,rgba(13,10,18,0.98) 60%,rgba(8,6,12,0.99) 100%);
  border:1px solid rgba(212,175,120,0.32);
  box-shadow:0 12px 40px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.04) inset,0 0 24px rgba(212,175,120,0.08);
  color:#f4ecf0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Serif SC","Segoe UI",sans-serif;
  font-size:12px;line-height:1.55;text-align:left;overflow:hidden;position:relative}
.jz *{box-sizing:border-box}
.jz::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(212,175,120,0.8),rgba(235,205,155,1),rgba(212,175,120,0.8),transparent);z-index:2}

.jz-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(212,175,120,0.16)}
.jz-brand-group{display:flex;align-items:center;gap:10px}
.jz-emblem{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,rgba(212,175,120,0.25),rgba(140,105,50,0.35));border:1px solid rgba(212,175,120,0.45);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(212,175,120,0.25)}
.jz-icon-bolt{display:inline-block;width:12px;height:12px;background:currentColor;clip-path:polygon(60% 0%, 15% 55%, 45% 55%, 35% 100%, 85% 42%, 55% 42%);color:#f3d79e}
.jz-title-meta{display:flex;flex-direction:column}
.jz-main-brand{font-weight:700;font-size:13px;letter-spacing:0.04em;color:#faeedd}
.jz-brand-sub{font-size:11px;font-weight:500;color:#c9a86a;margin-left:4px}
.jz-brand-tagline{font-size:8.5px;letter-spacing:0.18em;color:#8f859b;margin-top:1px;font-family:"Cinzel",sans-serif}
.jz-header-right{display:flex;align-items:center;gap:8px}
.jz-clock-badge{font-size:11px;padding:3px 10px;border-radius:999px;background:rgba(212,175,120,0.1);border:1px solid rgba(212,175,120,0.28);color:#edd9b1;font-weight:600;letter-spacing:0.04em;display:flex;align-items:center;gap:4px}
.jz-clock-sep{opacity:0.5}
.jz-collapse-btn{background:transparent;border:none;color:#a89fb3;cursor:pointer;padding:4px;font-size:13px;transition:transform .2s}
.jz-collapse-btn.jz-is-collapsed{transform:rotate(-90deg)}

.jz-panel-body{padding:14px 18px 16px}

/* 充能池 */
.jz-shame-gauge{margin-bottom:14px;padding:10px 14px;border-radius:12px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);position:relative}
.jz-gauge-ready{border-color:rgba(212,175,120,0.5);background:radial-gradient(ellipse at top left,rgba(212,175,120,0.12),rgba(0,0,0,0.4));box-shadow:0 0 16px rgba(212,175,120,0.12) inset}
.jz-gauge-info{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.jz-gauge-label-group{display:flex;align-items:center;gap:6px}
.jz-gauge-dot{width:6px;height:6px;border-radius:50%;background:#e0899c;box-shadow:0 0 8px #e0899c}
.jz-gauge-title{font-size:11.5px;font-weight:600;color:#e8dee5;letter-spacing:0.05em}
.jz-gauge-hint{font-size:9.5px;color:#8e859a;margin-left:4px}
.jz-gauge-val-group{display:flex;align-items:baseline;gap:4px}
.jz-gauge-num{font-size:15px;font-weight:800;color:#e591a5;font-variant-numeric:tabular-nums}
.jz-gauge-max{font-size:11px;color:#8f859a}
.jz-ready-pill{margin-left:8px;font-size:10.5px;padding:2px 8px;border-radius:999px;background:linear-gradient(135deg,#c4974f,#edd4a6);color:#1b120c;font-weight:700;box-shadow:0 0 10px rgba(237,212,166,0.5)}
.jz-track-container{width:100%}
.jz-gauge-track{height:7px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;position:relative}
.jz-gauge-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#9c465d 0%,#e0899c 50%,#eecfa2 100%);box-shadow:0 0 10px rgba(224,137,156,0.6);transition:width .5s cubic-bezier(0.2,0.8,0.2,1)}

/* 区域分界头 */
.jz-section-wrap{margin-bottom:14px}
.jz-section-bar{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;padding-bottom:3px;border-bottom:1px solid rgba(255,255,255,0.05)}
.jz-sec-text{font-size:11px;font-weight:700;letter-spacing:0.12em;color:#dfd5e5;text-transform:uppercase}
.jz-sec-sub{font-size:9.5px;color:#897f95}

/* 豪宅小地图 */
.jz-floorplan{display:flex;flex-direction:column;gap:9px}
.jz-floor-block{background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.05);border-radius:11px;padding:8px 10px}
.jz-floor-header{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.jz-floor-num{font-size:10px;font-weight:800;color:#18121d;background:linear-gradient(135deg,#e3c18b,#cda365);padding:1px 6px;border-radius:4px;letter-spacing:0.04em}
.jz-floor-desc{font-size:9.5px;color:#9b92a6}
.jz-floor-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.jz-room{padding:7px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);min-height:58px;display:flex;flex-direction:column;justify-content:space-between;transition:all .2s ease}
.jz-room-active{border-color:rgba(212,175,120,0.45);background:linear-gradient(135deg,rgba(212,175,120,0.08),rgba(0,0,0,0.2));box-shadow:0 0 12px rgba(212,175,120,0.08) inset}
.jz-room-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px}
.jz-room-title-block{display:flex;flex-direction:column}
.jz-room-code{font-size:11px;font-weight:700;color:#edd9b7;font-family:monospace}
.jz-room-name{font-size:9px;color:#b1a8bd;line-height:1.2;margin-top:1px}
.jz-room-tag{font-size:8px;color:#8f859a;border:1px solid rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px}
.jz-room-occs{display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin:3px 0}
.jz-empty-label{font-size:8.5px;color:#554e60}
.jz-occ{width:22px;height:22px;border-radius:50%;overflow:hidden;border:1.5px solid #d4af78;background:#15101c;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 6px rgba(212,175,120,0.3)}
.jz-occ-user{border-color:#38bdf8;box-shadow:0 0 6px rgba(56,189,248,0.4)}
.jz-occ-img{width:100%;height:100%;object-fit:cover;display:block}
.jz-room-acts-panel{display:flex;flex-direction:column;gap:1px;margin-top:3px;border-top:1px dashed rgba(255,255,255,0.06);padding-top:3px}
.jz-act-line{font-size:8.5px;color:#9a92a5;display:flex;align-items:baseline;gap:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jz-act-who{color:#c9a86a;font-weight:600}
.jz-who-user{color:#38bdf8}
.jz-act-body{color:#bbb2c4}

/* 人物双刻线卡片 */
.jz-cards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.jz-card{padding:10px;border-radius:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:8px}
.jz-card-head{display:flex;align-items:center;justify-content:space-between}
.jz-card-id{display:flex;align-items:center;gap:8px}
.jz-face-ring{width:34px;height:34px;border-radius:10px;overflow:hidden;border:1.5px solid rgba(212,175,120,0.5);background:#181320;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.jz-face-img{width:100%;height:100%;object-fit:cover;display:block}
.jz-face-char{font-size:14px;color:#edd9b7}
.jz-card-meta{display:flex;flex-direction:column}
.jz-name-row{display:flex;align-items:center;gap:5px}
.jz-name{font-size:12.5px;font-weight:700;color:#f7eedd}
.jz-sub-label{font-size:9px;color:#8b8296;margin-top:1px}

.jz-bars{display:flex;flex-direction:column;gap:6px}
.jz-bar{display:flex;flex-direction:column;gap:2px}
.jz-bar-top{display:flex;justify-content:space-between;align-items:center}
.jz-bar-left{display:flex;align-items:center;gap:5px}
.jz-bar-n{font-size:9.5px;color:#a299af;font-weight:500}
.jz-bar-stage{font-size:8px;padding:0 4px;border-radius:2px;font-weight:600}
.jz-pill-danger{background:rgba(244,63,94,0.18);color:#fb7185;border:1px solid rgba(244,63,94,0.3)}
.jz-pill-warn{background:rgba(251,113,133,0.14);color:#fda4af}
.jz-pill-gold{background:rgba(212,175,120,0.14);color:#e2c48e}
.jz-pill-purple{background:rgba(192,132,252,0.2);color:#d8b4fe;border:1px solid rgba(192,132,252,0.35)}
.jz-pill-violet{background:rgba(192,132,252,0.12);color:#e9d5ff}
.jz-pill-mute{background:rgba(255,255,255,0.05);color:#7e768a}

.jz-bar-v{font-size:11px;font-weight:700;color:#f1ebf5;font-variant-numeric:tabular-nums}
.jz-bar-v small{font-size:8.5px;color:#8f859a;margin-left:1px}
.jz-track-wrap{position:relative}
.jz-track{display:block;height:5px;border-radius:999px;background:rgba(255,255,255,0.07);overflow:hidden}
.jz-fill{display:block;height:100%;border-radius:999px;transition:width .5s cubic-bezier(0.2,0.8,0.2,1)}
.jz-fill.jz-shame{background:linear-gradient(90deg,#9c435a,#e0899c)}
.jz-fill.jz-want{background:linear-gradient(90deg,#7a4896,#c084fc)}
.jz-track-ticks{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;justify-content:space-between;padding:0 30% 0 30%;pointer-events:none;opacity:0.25}
.jz-track-ticks i{width:1px;height:100%;background:#fff}

.jz-heart{margin-top:2px;padding:5px 8px;border-radius:7px;background:rgba(212,175,120,0.04);border-left:2px solid #c9a86a;font-size:10px;color:#e8ddcf;display:flex;align-items:flex-start;gap:4px}
.jz-heart-quote{color:#c9a86a;font-weight:800;font-size:13px;line-height:1;margin-top:-2px}
.jz-heart-txt{font-style:italic;line-height:1.4}

/* 常识注入控制台 */
.jz-console-box{padding:10px 12px;border-radius:12px;background:rgba(212,175,120,0.04);border:1px dashed rgba(212,175,120,0.3)}
.jz-console-ready{background:linear-gradient(135deg,rgba(212,175,120,0.08),rgba(20,16,26,0.3));border-color:rgba(212,175,120,0.55)}
.jz-console-form{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.jz-luxury-select{background:#15111d;border:1px solid rgba(212,175,120,0.3);color:#f4ebdd;border-radius:7px;padding:6px 10px;font-size:11px;outline:none}
.jz-luxury-input{flex:1 1 180px;background:#15111d;border:1px solid rgba(255,255,255,0.12);color:#f4ecf0;border-radius:7px;padding:6px 10px;font-size:11px;outline:none;transition:border-color .2s}
.jz-luxury-input:focus{border-color:rgba(212,175,120,0.6)}
.jz-btn{border-radius:7px;font-size:11px;padding:6px 12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .18s;border:none}
.jz-btn-inject{background:linear-gradient(135deg,#c4974f,#edd4a6);color:#1b120c;font-weight:700;box-shadow:0 0 12px rgba(212,175,120,0.3)}
.jz-btn-inject:hover{filter:brightness(1.08)}
.jz-btn-disabled{opacity:0.45;cursor:not-allowed;filter:grayscale(0.6)}
.jz-console-footer{margin-top:6px}
.jz-footer-tip{font-size:9.5px;color:#8e859a}

/* 日志条目 */
.jz-logs-container{display:flex;flex-direction:column;gap:6px}
.jz-lgroup{background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.05);border-radius:9px;padding:6px 10px}
.jz-lwho-title{font-size:10px;font-weight:700;color:#d4af78;margin-bottom:4px;display:flex;align-items:center;gap:6px}
.jz-lwho-title small{font-size:8.5px;color:#82798f;font-weight:400}
.jz-litem{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid rgba(255,255,255,0.04)}
.jz-litem:first-of-type{border-top:none}
.jz-loff{opacity:0.5}
.jz-loff .jz-ltxt{text-decoration:line-through}
.jz-ltxt-block{display:flex;align-items:baseline;gap:5px;flex:1;min-width:0}
.jz-lseq{font-size:9.5px;color:#c9a86a;font-weight:700;font-family:monospace}
.jz-ltxt{font-size:11px;color:#ede5eb;word-break:break-word}
.jz-lbtns{display:flex;gap:4px;flex-shrink:0}
.jz-btn-toggle{font-size:9.5px;padding:2px 7px;background:rgba(255,255,255,0.06);color:#ccc3d6;border:1px solid rgba(255,255,255,0.1)}
.jz-toggle-active{background:rgba(34,197,94,0.15);color:#4ade80;border-color:rgba(34,197,94,0.35)}
.jz-btn-trash{padding:2px 6px;font-size:9.5px;background:transparent;color:#7e758a;border:1px solid rgba(255,255,255,0.08)}
.jz-btn-trash:hover{color:#f43f5e;border-color:rgba(244,63,94,0.3)}

@media (max-width:680px){
  .jz-cards-grid{grid-template-columns:repeat(1,minmax(0,1fr))}
  .jz-floor-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
`;

/* ============ 挂载流程 ============ */
const JZ_ID = 'jz-terminal-style-v2';

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

  console.info('[状态栏] 江湾壹号 3601 重构顶奢版认知修改终端已挂载');
});
