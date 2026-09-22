/* 江湾壹号 3601 · 顶奢全景建筑小地图与认知修改终端 (真实户型重构版 v5.14)

   整支脚本包在 IIFE 里。原因：浏览器中多个 <script> 的顶层 const/let 共享同一个
   全局词法环境，只要和别的脚本重名（本卡的 变量结构校验 / 变量校正 也声明了
   PERSONS、num、ROOMS 等），后加载的脚本就会整体抛 SyntaxError
   「Identifier 'xxx' has already been declared」而**完全不执行**——连事件绑定
   都不会注册，表现就是「按钮点了没反应」。包起来后本脚本的顶层名字不再外泄。 */
(function () {
const PIC_JSD = "https://cdn.jsdelivr.net/gh/Tellccm/picx-images-hosting@master/";
const PIC_RAW = "https://github.com/Tellccm/picx-images-hosting/raw/master/";
const AVATAR_VER = "?v=2";

const avatars = {
  "沈若薇": "若薇.avatar.webp",
  "周岚": "周岚.avatar.webp",
  "温以宁": "温以宁.avatar.webp",
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

/* 变量整块缺失时的兜底。对齐「其一」那一场的初始位置，
   与 initvar、变量结构校验里的 FALLBACK 保持同一套。 */
const DEFAULT_SPACE = {
  "沈若薇": { 房间: "102 开放式餐厨", 动作: "冷脸收拾残羹" },
  "周岚": { 房间: "201 周岚主卧", 动作: "在衣帽间挑今晚的裙子" },
  "温以宁": { 房间: "202 温以宁套房", 动作: "开着电视听主宅的动静" },
  "user": { 房间: "102 开放式餐厨", 动作: "淋着雨从后门溜进厨房" }
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

/* ============ 房间归一化与数据防死锁 ============ */
function normalizeRoomName(r) {
  if (!r) return '';
  const s = String(r).trim();
  // 「外出」优先判定：人不在 3601 屋内时（出门采购／去游泳馆／回自己家…）
  // 必须排在房间关键词前面，否则「出门办事」会被当成玄关一类的房间。
  if (/外出|出门|不在家|不在屋里|在外面|回自己家|去上班|上班|离宅/.test(s)) return '外出';
  if (s.includes('101') || s.includes('客厅') || s.includes('沙发') || s.includes('大厅')) return '101 挑高大客厅';
  if (s.includes('102') || s.includes('餐厨') || s.includes('厨房') || s.includes('餐厅') || s.includes('中岛') || s.includes('料理台')) return '102 开放式餐厨';
  if (s.includes('103') || s.includes('玄关') || s.includes('门厅') || s.includes('门口') || s.includes('鞋柜') || s.includes('入户')) return '103 入户玄关';
  if (s.includes('104') || s.includes('保姆') || s.includes('杂物') || s.includes('暗间') || s.includes('楼梯下') || s.includes('楼梯底')) return '104 保姆杂物间';
  if (s.includes('201') || s.includes('周岚') || s.includes('主卧') || s.includes('卧室') || s.includes('大床') || s.includes('衣帽间')) return '201 周岚主卧';
  if (s.includes('202') || s.includes('温以宁') || s.includes('对门') || s.includes('套房') || s.includes('隔壁') || s.includes('客卧')) return '202 温以宁套房';
  if (s.includes('203') || s.includes('公卫') || s.includes('卫生间') || s.includes('浴室') || s.includes('浴缸') || s.includes('洗手间') || s.includes('卫浴')) return '203 奢华公卫';
  if (s.includes('204') || s.includes('书房') || s.includes('露台') || s.includes('阳台') || s.includes('走廊') || s.includes('回廊')) return '204 书房露台';
  return s;
}

/* ============ 取数与多轮动态位置提取 ============ */
function readStat(msgId) {
  let res = null;
  try {
    const v = typeof getVariables === 'function' ? getVariables({ type: 'message', message_id: msgId }) : null;
    if (v) {
      if (v.stat_data) res = v.stat_data;
      else if (v.空间状态 || v.常识修改系统) res = v;
      else if (v.data && v.data.stat_data) res = v.data.stat_data;
    }
  } catch (e) {}

  if (!res) {
    try {
      const mv = typeof Mvu !== 'undefined' && Mvu.getMvuData ? Mvu.getMvuData({ type: 'message', message_id: msgId }) : null;
      if (mv) {
        if (mv.stat_data) res = mv.stat_data;
        else if (mv.空间状态) res = mv;
      }
    } catch (e2) {}
  }

  if (!res) {
    try {
      const chat = typeof getChatMessages === 'function' ? getChatMessages(msgId) : null;
      const msgObj = Array.isArray(chat) ? chat[0] : chat;
      if (msgObj) {
        if (msgObj.variables && msgObj.variables.stat_data) res = msgObj.variables.stat_data;
        else if (msgObj.extra && msgObj.extra.stat_data) res = msgObj.extra.stat_data;
      }
    } catch (e3) {}
  }

  return res || {};
}

/* 某楼读不到变量时，往**更早**的楼层找最近的一份，而不是直接掉到默认值。
   两个场合用得上：
     · MVU 的「自动清理变量」会把老楼的变量清掉（它自己只挂了个防抖 2 秒的清理任务）；
     · 删楼之后，部分楼层的变量可能还没重新落盘。
   不往回找的话，老面板会显示羞辱值 0、地图回到 1F，看着像"变量被清空了"。 */
function readStatNear(msgId, maxBack) {
  const stat = readStat(msgId);
  if (stat && stat['常识修改系统']) return stat;
  const id = Number(msgId);
  if (!Number.isFinite(id) || id <= 0) return stat || {};
  const back = Number.isFinite(maxBack) ? maxBack : 8;
  for (let i = id - 1; i >= 0 && i >= id - back; i--) {
    const s = readStat(i);
    if (s && s['常识修改系统']) return s;
  }
  return stat || {};
}

function extractLiveLocations(stat, msgId) {
  const locs = {};
  const spaces = _.get(stat, '空间状态', {}) || {};

  // 1. 先读取当前 stat 变量中的位置
  ['沈若薇', '周岚', '温以宁', 'user'].forEach(function(who) {
    const info = spaces[who];
    if (info && (info.房间 || info.地点 || info.位置)) {
      locs[who] = {
        room: normalizeRoomName(info.房间 || info.地点 || info.位置),
        act: info.动作 || ''
      };
    }
  });

  // 2.【已移除·重要】原先这里用一大段正则扫正文，猜「谁在哪间房」，猜中就直接覆盖
  //    上一步从「空间状态」读到的真实值。后果：变量说周岚在 201，正文里恰好出现「沙发」
  //    两个字，地图就把她挪到 101 —— 地图和变量打架。
  //
  //    卡内《空间流转与动态响应法则》明确要求：每轮回复必须在 JSONPatch 里更新「空间状态」
  //    中四个人的「房间」与「动作」，变量结构校验还会按 ROOMS 归一化非法房间名。
  //    **变量就是唯一事实源**，不需要也不允许从正文再猜一遍。
  //    只有在变量整块缺失时，才用下面的默认值兜底。
  // 3. 填补默认值
  ['沈若薇', '周岚', '温以宁', 'user'].forEach(function(who) {
    if (!locs[who] || !locs[who].room) {
      locs[who] = { room: DEFAULT_SPACE[who].房间, act: DEFAULT_SPACE[who].动作 };
    }
  });

  return locs;
}

/* ============ 渲染：真实户型小地图 (清爽建筑图纸版 · 无冗余词句) ============ */
function renderArchitecturalFloor(stat, floor, locs, curFloor) {
  locs = locs || extractLiveLocations(stat);
  const currentF = curFloor || activeFloor || '1F';
  const isCurrentActive = (floor === currentF);
  const occ = {};
  ['沈若薇', '周岚', '温以宁', 'user'].forEach(function(who) {
    const l = locs[who];
    if (l && l.room) {
      if (!occ[l.room]) occ[l.room] = [];
      occ[l.room].push({ who: who, act: l.act || '' });
    }
  });

  const getOccupants = function(roomId) {
    return occ[roomId] || [];
  };

  const renderAvatarsSVG = function(list, cx, cy) {
    if (!list || !list.length) return '';
    let out = '<g class="jz-svg-occupants" transform="translate(' + cx + ',' + cy + ')">';
    const n = list.length;
    const startX = -((n - 1) * 28) / 2;
    list.forEach(function(o, idx) {
      const isUser = o.who === 'user';
      const x = startX + idx * 28;
      const av = avatars[o.who];
      const strokeCol = isUser ? '#38bdf8' : (o.who === '沈若薇' ? '#fb7185' : (o.who === '周岚' ? '#f59e0b' : '#c084fc'));
      const pulseCol = isUser ? 'rgba(56,189,248,0.4)' : (o.who === '沈若薇' ? 'rgba(251,113,133,0.4)' : (o.who === '周岚' ? 'rgba(245,158,11,0.4)' : 'rgba(192,132,252,0.4)'));
      const clipId = 'cp-' + (isUser ? 'user' : (o.who === '沈若薇' ? 'srw' : (o.who === '周岚' ? 'zl' : 'wyn'))) + '-' + Math.floor(Math.random() * 100000);
      
      out += '<g class="jz-occupant-pin" transform="translate(' + x + ', 0)">';
      out += '<circle class="jz-sonar-ring" r="16" fill="none" stroke="' + pulseCol + '" stroke-width="2" />';
      out += '<circle r="12" fill="#140f1d" stroke="' + strokeCol + '" stroke-width="2" filter="drop-shadow(0 0 6px ' + strokeCol + ')" />';
      if (av) {
        out += '<clipPath id="' + clipId + '"><circle r="11"/></clipPath>';
        out += '<image href="' + PIC_JSD + encodeURIComponent(av) + AVATAR_VER + '" x="-11" y="-11" width="22" height="22" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + clipId + ')" />';
      } else {
        out += '<text text-anchor="middle" dy="4" font-size="10" font-weight="700" fill="' + strokeCol + '">' + (isUser ? '我' : esc(o.who.slice(0,1))) + '</text>';
      }
      out += '</g>';
    });
    out += '</g>';
    return out;
  };

  if (floor === '1F') {
    const occ101 = getOccupants('101 挑高大客厅');
    const occ102 = getOccupants('102 开放式餐厨');
    const occ103 = getOccupants('103 入户玄关');
    const occ104 = getOccupants('104 保姆杂物间');

    return '<div class="jz-floor-canvas' + (isCurrentActive ? ' jz-active-floor' : '') + '" data-floor="1F" style="display:' + (isCurrentActive ? 'block' : 'none') + '">'
      + '<div class="jz-floor-meta-bar">'
      + '<div class="jz-floor-badge"><span class="jz-floor-label">LEVEL 01</span><span class="jz-floor-sublabel">1F 挑高公共层</span></div>'
      + '<div class="jz-cad-scale"><span class="jz-scale-tick">0</span><span class="jz-scale-bar"></span><span class="jz-scale-tick">5m</span></div>'
      + '</div>'
      + '<div class="jz-svg-wrapper">'
      + '<svg class="jz-blueprint-svg" viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(212,175,120,0.06)" stroke-width="0.75"/></pattern>'
      + '</defs>'
      + '<rect width="760" height="380" fill="url(#cadGrid)" />'
      
      // 建筑外廓
      + '<rect x="30" y="30" width="700" height="320" rx="14" fill="#0d0914" stroke="rgba(212,175,120,0.4)" stroke-width="2.5" />'
      
      // 101 挑高大客厅 (78㎡)
      + '<g class="jz-svg-room ' + (occ101.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="340" y="170" width="375" height="165" rx="8" fill="' + (occ101.length ? 'rgba(212,175,120,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="rgba(212,175,120,0.25)" stroke-width="1.2" />'
      // 落地玻璃幕墙标志 (双蓝线)
      + '<line x1="500" y1="334" x2="705" y2="334" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="8 3" opacity="0.8" />'
      + '<line x1="500" y1="337" x2="705" y2="337" stroke="#38bdf8" stroke-width="1.5" opacity="0.6" />'
      // 家具：意大利真皮沙发与茶几
      + '<path d="M 440 220 C 440 200, 560 200, 600 230 L 590 250 C 560 230, 460 230, 440 250 Z" fill="rgba(212,175,120,0.08)" stroke="rgba(212,175,120,0.3)" stroke-width="1" />'
      + '<rect x="480" y="245" width="60" height="24" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(212,175,120,0.2)" stroke-width="1" />'
      + '<text x="355" y="194" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">101</text>'
      + '<text x="382" y="194" font-size="12" font-weight="700" fill="#edd9b7">挑高大客厅</text>'
      + '<text x="355" y="208" font-size="9" fill="#8f859a">78㎡</text>'
      + renderAvatarsSVG(occ101, 520, 275)
      + '</g>'

      // 102 开放式餐厨 (42㎡)
      + '<g class="jz-svg-room ' + (occ102.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="340" y="45" width="375" height="120" rx="8" fill="' + (occ102.length ? 'rgba(212,175,120,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="rgba(212,175,120,0.25)" stroke-width="1.2" />'
      // 奢石中岛台与餐桌
      + '<rect x="420" y="70" width="130" height="35" rx="3" fill="rgba(212,175,120,0.09)" stroke="rgba(212,175,120,0.3)" stroke-width="1" />'
      + '<rect x="580" y="65" width="115" height="45" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(212,175,120,0.2)" stroke-width="1" />'
      + '<circle cx="445" cy="115" r="4" fill="none" stroke="rgba(212,175,120,0.3)" />'
      + '<circle cx="485" cy="115" r="4" fill="none" stroke="rgba(212,175,120,0.3)" />'
      + '<circle cx="525" cy="115" r="4" fill="none" stroke="rgba(212,175,120,0.3)" />'
      + '<text x="355" y="68" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">102</text>'
      + '<text x="382" y="68" font-size="12" font-weight="700" fill="#edd9b7">开放式餐厨</text>'
      + '<text x="355" y="82" font-size="9" fill="#8f859a">42㎡</text>'
      + renderAvatarsSVG(occ102, 510, 130)
      + '</g>'

      // 103 入户玄关 (22㎡)
      + '<g class="jz-svg-room ' + (occ103.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="45" y="195" width="160" height="140" rx="8" fill="' + (occ103.length ? 'rgba(212,175,120,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="rgba(212,175,120,0.25)" stroke-width="1.2" />'
      // 装甲大门弧线 (90度开门弧)
      + '<path d="M 45 280 A 45 45 0 0 1 90 325" fill="none" stroke="#e0899c" stroke-width="1.2" stroke-dasharray="3 3" />'
      + '<line x1="45" y1="280" x2="45" y2="325" stroke="#e0899c" stroke-width="2.5" />'
      + '<rect x="65" y="210" width="50" height="16" rx="2" fill="rgba(212,175,120,0.08)" stroke="rgba(212,175,120,0.25)" stroke-width="0.8" />'
      + '<text x="58" y="218" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">103</text>'
      + '<text x="85" y="218" font-size="12" font-weight="700" fill="#edd9b7">入户玄关</text>'
      + '<text x="58" y="232" font-size="9" fill="#8f859a">22㎡</text>'
      + renderAvatarsSVG(occ103, 125, 275)
      + '</g>'

      // 104 保姆杂物间 (7.8㎡ - 楼梯下方暗角)
      + '<g class="jz-svg-room ' + (occ104.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="210" y="195" width="125" height="140" rx="8" fill="' + (occ104.length ? 'rgba(56,189,248,0.12)' : 'rgba(15,10,22,0.6)') + '" stroke="' + (occ104.length ? 'rgba(56,189,248,0.5)' : 'rgba(212,175,120,0.25)') + '" stroke-width="1.2" />'
      // 狭小下铺
      + '<rect x="220" y="210" width="45" height="85" rx="3" fill="rgba(56,189,248,0.06)" stroke="rgba(56,189,248,0.3)" stroke-width="1" />'
      + '<line x1="220" y1="230" x2="265" y2="230" stroke="rgba(56,189,248,0.3)" />'
      + '<path d="M 270 305 A 25 25 0 0 1 295 330" fill="none" stroke="rgba(212,175,120,0.5)" stroke-width="1" stroke-dasharray="2 2" />'
      + '<text x="220" y="215" font-size="12" font-weight="800" fill="#f5eedf" font-family="monospace">104</text>'
      + '<text x="245" y="215" font-size="11" font-weight="700" fill="#38bdf8">保姆杂物间</text>'
      + '<text x="220" y="228" font-size="9" fill="#7a7088">7.8㎡</text>'
      + renderAvatarsSVG(occ104, 280, 275)
      + '</g>'

      // 挑空双跑旋转楼梯 (连接 1F 至 2F)
      + '<g class="jz-svg-stairs" transform="translate(210, 45)">'
      + '<rect width="125" height="145" rx="6" fill="rgba(0,0,0,0.3)" stroke="rgba(212,175,120,0.3)" stroke-width="1" />'
      + '<line x1="10" y1="20" x2="115" y2="20" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="35" x2="115" y2="35" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="50" x2="115" y2="50" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="65" x2="115" y2="65" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="80" x2="115" y2="80" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="95" x2="115" y2="95" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="110" x2="115" y2="110" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="125" x2="115" y2="125" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="62" y1="130" x2="62" y2="25" stroke="#edd9b7" stroke-width="1.5" />'
      + '<polygon points="62,18 57,28 67,28" fill="#edd9b7" />'
      + '<text x="62" y="140" text-anchor="middle" font-size="8.5" fill="#edd9b7" font-weight="700">UP ↑ 至 2F</text>'
      + '</g>'

      // 指北针
      + '<g class="jz-compass" transform="translate(80, 85)">'
      + '<circle r="22" fill="none" stroke="rgba(212,175,120,0.3)" stroke-width="1" />'
      + '<line x1="0" y1="-26" x2="0" y2="26" stroke="rgba(212,175,120,0.2)" />'
      + '<line x1="-26" y1="0" x2="26" y2="0" stroke="rgba(212,175,120,0.2)" />'
      + '<polygon points="0,-20 5,0 0,-4" fill="#e0899c" />'
      + '<polygon points="0,-20 -5,0 0,-4" fill="#d4af78" />'
      + '<text x="0" y="-12" text-anchor="middle" font-size="8" font-weight="800" fill="#faeedd">N</text>'
      + '</g>'

      + '</svg>'
      + '</div>'
      + '</div>';
  } else {
    // 2F
    const occ201 = getOccupants('201 周岚主卧');
    const occ202 = getOccupants('202 温以宁套房');
    const occ203 = getOccupants('203 奢华公卫');
    const occ204 = getOccupants('204 书房露台');

    return '<div class="jz-floor-canvas' + (isCurrentActive ? ' jz-active-floor' : '') + '" data-floor="2F" style="display:' + (isCurrentActive ? 'block' : 'none') + '">'
      + '<div class="jz-floor-meta-bar">'
      + '<div class="jz-floor-badge"><span class="jz-floor-label">LEVEL 02</span><span class="jz-floor-sublabel">2F 私密寝息区</span></div>'
      + '<div class="jz-cad-scale"><span class="jz-scale-tick">0</span><span class="jz-scale-bar"></span><span class="jz-scale-tick">5m</span></div>'
      + '</div>'
      + '<div class="jz-svg-wrapper">'
      + '<svg class="jz-blueprint-svg" viewBox="0 0 760 380" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="760" height="380" fill="url(#cadGrid)" />'
      + '<rect x="30" y="30" width="700" height="320" rx="14" fill="#0d0914" stroke="rgba(212,175,120,0.4)" stroke-width="2.5" />'

      // 201 周岚主卧 (68㎡ 独立套房)
      + '<g class="jz-svg-room ' + (occ201.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="340" y="45" width="375" height="290" rx="8" fill="' + (occ201.length ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="' + (occ201.length ? '#f59e0b' : 'rgba(212,175,120,0.25)') + '" stroke-width="1.2" />'
      // 步入式衣帽间隔断
      + '<rect x="355" y="65" width="110" height="95" rx="4" fill="rgba(212,175,120,0.06)" stroke="rgba(212,175,120,0.25)" stroke-width="1" stroke-dasharray="4 2" />'
      + '<text x="365" y="80" font-size="8" fill="#c9a86a">衣帽间</text>'
      // 豪华双人大床
      + '<rect x="520" y="90" width="140" height="110" rx="5" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.35)" stroke-width="1.2" />'
      + '<rect x="535" y="98" width="50" height="25" rx="3" fill="rgba(255,255,255,0.05)" />'
      + '<rect x="595" y="98" width="50" height="25" rx="3" fill="rgba(255,255,255,0.05)" />'
      + '<text x="355" y="185" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">201</text>'
      + '<text x="382" y="185" font-size="12" font-weight="700" fill="#f59e0b">周岚主卧</text>'
      + '<text x="355" y="199" font-size="9" fill="#8f859a">68㎡</text>'
      + renderAvatarsSVG(occ201, 560, 240)
      + '</g>'

      // 204 书房露台 (38㎡)
      + '<g class="jz-svg-room ' + (occ204.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="45" y="45" width="160" height="145" rx="8" fill="' + (occ204.length ? 'rgba(212,175,120,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="rgba(212,175,120,0.25)" stroke-width="1.2" />'
      + '<line x1="45" y1="48" x2="45" y2="185" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 2" />'
      + '<rect x="65" y="65" width="70" height="30" rx="3" fill="rgba(212,175,120,0.08)" stroke="rgba(212,175,120,0.3)" />'
      + '<text x="58" y="68" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">204</text>'
      + '<text x="85" y="68" font-size="12" font-weight="700" fill="#edd9b7">书房露台</text>'
      + '<text x="58" y="82" font-size="9" fill="#8f859a">38㎡</text>'
      + renderAvatarsSVG(occ204, 125, 125)
      + '</g>'

      // 202 温以宁套房 (48㎡)
      + '<g class="jz-svg-room ' + (occ202.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="45" y="195" width="160" height="140" rx="8" fill="' + (occ202.length ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="' + (occ202.length ? '#c084fc' : 'rgba(212,175,120,0.25)') + '" stroke-width="1.2" />'
      + '<path d="M 205 280 A 35 35 0 0 0 170 315" fill="none" stroke="#c084fc" stroke-width="1.2" stroke-dasharray="3 3" />'
      + '<rect x="60" y="240" width="85" height="80" rx="4" fill="rgba(192,132,252,0.08)" stroke="rgba(192,132,252,0.3)" />'
      + '<text x="58" y="218" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">202</text>'
      + '<text x="85" y="218" font-size="12" font-weight="700" fill="#c084fc">温以宁套房</text>'
      + '<text x="58" y="232" font-size="9" fill="#8f859a">48㎡</text>'
      + renderAvatarsSVG(occ202, 125, 275)
      + '</g>'

      // 203 奢华公卫 (26㎡)
      + '<g class="jz-svg-room ' + (occ203.length ? 'jz-svg-active' : '') + '">'
      + '<rect x="210" y="195" width="125" height="140" rx="8" fill="' + (occ203.length ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.015)') + '" stroke="rgba(56,189,248,0.35)" stroke-width="1.2" />'
      // 下沉双人圆形按摩浴缸
      + '<circle cx="272" cy="265" r="32" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-width="1.5" />'
      + '<circle cx="272" cy="265" r="24" fill="none" stroke="rgba(56,189,248,0.4)" stroke-dasharray="3 2" />'
      + '<text x="220" y="218" font-size="13" font-weight="800" fill="#f5eedf" font-family="monospace">203</text>'
      + '<text x="248" y="218" font-size="12" font-weight="700" fill="#38bdf8">奢华公卫</text>'
      + '<text x="220" y="232" font-size="9" fill="#8f859a">26㎡</text>'
      + renderAvatarsSVG(occ203, 272, 265)
      + '</g>'

      // 挑空回廊与下楼梯
      + '<g class="jz-svg-stairs" transform="translate(210, 45)">'
      + '<rect width="125" height="145" rx="6" fill="rgba(0,0,0,0.3)" stroke="rgba(212,175,120,0.3)" stroke-width="1" />'
      + '<line x1="10" y1="20" x2="115" y2="20" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="35" x2="115" y2="35" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="50" x2="115" y2="50" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="65" x2="115" y2="65" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="80" x2="115" y2="80" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="95" x2="115" y2="95" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="10" y1="110" x2="115" y2="110" stroke="rgba(212,175,120,0.3)" stroke-width="1"/>'
      + '<line x1="62" y1="25" x2="62" y2="130" stroke="#edd9b7" stroke-width="1.5" />'
      + '<polygon points="62,135 57,125 67,125" fill="#edd9b7" />'
      + '<text x="62" y="18" text-anchor="middle" font-size="8.5" fill="#edd9b7" font-weight="700">DN ↓ 下至 1F</text>'
      + '</g>'

      + '</svg>'
      + '</div>'
      + '</div>';
  }
}

/* ============ 渲染：人物双刻线 ============ */
function bars(stat, who, locs) {
  const base = who === MAIN ? stat[MAIN] : _.get(stat, '人物.' + who);
  const o = base && typeof base === 'object' ? base : {};
  const s = num(o.羞耻, 0), w = num(o.欲望, 0);
  const loc = locs && locs[who] ? locs[who] : null;
  const roomName = loc && loc.room ? loc.room : '';

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
    + '<div class="jz-name-row">'
    + '<span class="jz-name">' + esc(who) + '</span>'
    + (roomName ? '<span class="jz-loc-chip">' + esc(roomName) + '</span>' : '')
    + '</div>'
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
        + '<button class="jz-btn jz-switch' + (on ? ' jz-switch-on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" onclick="return (window.__jzCmd||globalThis.__jzCmd||function(){return false})(this,event)" data-cmd="' + esc(on ? ('[关闭常识 ' + p + ': ' + it.id + ']') : ('[开启常识 ' + p + ': ' + it.id + ']')) + '" title="' + (on ? '现在是生效中 — 拨一下关掉：认知立刻恢复原样并破防' : '现在是挂起 — 拨一下开启：她又把这当成天经地义') + '">'
        + '<span class="jz-sw-track"><span class="jz-sw-knob"></span></span>'
        + '<span class="jz-sw-txt">' + (on ? '生效中' : '已挂起') + '</span>'
        + '</button>'
        + '<button class="jz-btn jz-btn-trash" onclick="return (window.__jzCmd||globalThis.__jzCmd||function(){return false})(this,event)" data-cmd="' + esc('[撤回常识 ' + p + ': ' + it.id + ']') + '" data-confirm="确定彻底撤回 ' + esc(p) + ' 的 #' + esc(it.id) + ' 吗？">✕</button>'
        + '</div>'
        + '</div>';
    });
    out += '</div>';
  });
  return { html: out, count: count };
}

/* 羞辱值锁定开关。拨开之后变量层就不再拦涨幅与回落，数由玩家说了算
   —— 数据本身分不出「模型写错」和「玩家故意改」，所以只能给一个明确的开关。 */
function lockSwitch(locked) {
  return '<button class="jz-btn jz-switch' + (locked ? ' jz-switch-on' : '') + '" role="switch" aria-checked="' + (locked ? 'true' : 'false') + '"'
    + ' onclick="return (window.__jzCmd||globalThis.__jzCmd||function(){return false})(this,event)"'
    + ' data-cmd="' + (locked ? '[放开羞辱值]' : '[锁定羞辱值]') + '"'
    + ' title="' + (locked
        ? '变量层正在看守羞辱值：单轮最多 +70、只涨不落。想自己改数就拨开'
        : '已放开：羞辱值由你说了算，变量层不再拦涨幅与回落。拨一下重新锁上') + '">'
    + '<span class="jz-sw-track"><span class="jz-sw-knob"></span></span>'
    + '<span class="jz-sw-txt">' + (locked ? '看守中' : '已放开') + '</span>'
    + '</button>';
}

/* ============ 渲染整个终端 ============ */
function render(stat, locs, msgId) {
  locs = locs || extractLiveLocations(stat);
  const shame = num(_.get(stat, '常识修改系统.羞辱值', 0), 0);
  const count = num(_.get(stat, '常识修改系统.可用次数', 0), 0);
  /* 羞辱值锁定：默认锁着（变量层看守）。玩家要自己改数，在面板上拨开。 */
  const locked = _.get(stat, '常识修改系统.羞辱值锁定', true) !== false;
  /* 上一轮变量层动过什么（脚本写的）。给玩家也看一眼，别只有模型知道。 */
  const fixNote = String(_.get(stat, '常识修改系统.矫正记录', '') || '').trim();
  const day = num(_.get(stat, '时间.第几天', 1), 1);
  const period = _.get(stat, '时间.时段', '傍晚') || '傍晚';
  const ready = count > 0;
  const logsData = logsHtml(stat);
  // 默认停在{{user}}所在的那一层。否则像温以宁开局那样「你在 2F 走廊」，
  // 地图一打开看到的却是 1F，上面根本没有自己。手动点过页签后就不再自动跳。
  const userRoom = (locs && locs.user && locs.user.room)
    ? String(locs.user.room)
    : String(_.get(stat, '空间状态.user.房间', '') || '');
  const userFloor = userRoom.indexOf('2') === 0 ? '2F' : '1F';
  const curFloor = userPickedFloor ? (activeFloor || '1F') : userFloor;

  // 不在屋里的人（房间 = 外出）不会出现在地图上，这里单独列出来提示，
  // 免得玩家以为「人不见了」。
  const outsideList = ['沈若薇', '周岚', '温以宁', 'user'].filter(function (w) {
    return locs && locs[w] && String(locs[w].room) === '外出';
  }).map(function (w) { return w === 'user' ? '你' : w; });
  // 同批人，但带上"去哪了"——地图区自己要能把人交代全（不然图上只剩两个人，
  // 看着像人丢了）。外面那条灰字标题太容易漏看。
  const outsideDetail = ['沈若薇', '周岚', '温以宁', 'user'].filter(function (w) {
    return locs && locs[w] && String(locs[w].room) === '外出';
  }).map(function (w) {
    return { name: w === 'user' ? '你' : w, act: String((locs[w] && locs[w].act) || '').slice(0, 16) };
  });

  return '<div class="jz jz-theme-luxury" data-active-floor="' + curFloor + '">'
    + '<div class="jz-header">'
    + '<div class="jz-brand-group">'
    + '<div class="jz-emblem"><i class="jz-icon-bolt"></i></div>'
    + '<div class="jz-title-meta">'
    + '<div class="jz-main-brand">江湾壹号 3601 <span class="jz-brand-sub">认知修改终端</span></div>'
    + '<div class="jz-brand-tagline">JIANGWAN NO.1 · PENTHOUSE ARCHITECTURAL BLUEPRINT</div>'
    + '</div>'
    + '</div>'
    + '<div class="jz-header-right">'
    + '<div class="jz-clock-badge">'
    + '<span class="jz-clock-day">DAY ' + day + '</span>'
    + '<span class="jz-clock-sep">·</span>'
    + '<span class="jz-clock-period">' + esc(period) + '</span>'
    + '</div>'
    + (msgId === undefined || msgId === null || !Number.isFinite(Number(msgId)) ? ''
        : '<span class="jz-floor-no" title="这块面板属于第 ' + Number(msgId) + ' 楼">#' + Number(msgId) + '</span>')
    + '<button class="jz-collapse-btn" title="折叠/展开终端面板"><span>▾</span></button>'
    + '</div>'
    + '</div>'

    + '<div class="jz-panel-body"' + (collapsed ? ' style="display:none"' : '') + '>'
    /* 受辱充能 */
    + '<div class="jz-shame-gauge ' + (ready ? 'jz-gauge-ready' : '') + '">'
    + '<div class="jz-gauge-info">'
    + '<div class="jz-gauge-label-group">'
    + '<span class="jz-gauge-dot"></span>'
    + '<span class="jz-gauge-title">受辱屈辱共振池</span>'
    + '<span class="jz-gauge-hint">满100自动溢出转化</span>'
    + '</div>'
    + '<div class="jz-gauge-val-group">'
    + lockSwitch(locked)
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
    /* 变量层上一轮动过什么。脚本每轮重写，没动过就是空串，不占位置。 */
    + (fixNote
        ? '<div class="jz-fixline"><span class="jz-fix-tag">变量层</span><span class="jz-fix-txt">' + esc(fixNote) + '</span></div>'
        : '')

    /* 真实建筑户型全景雷达地图 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar">'
    + '<div class="jz-sec-title-group">'
    + '<span class="jz-sec-text">3601 顶层复式建筑户型地图</span>'
    + '<span class="jz-sec-sub">真实 CAD 空间雷达 · 动态声纳驻留监测' + (outsideList.length ? ' · <b>外出：' + outsideList.join('、') + '</b>' : '') + '</span>'
    + '</div>'
    + '<div class="jz-floor-switcher">'
    + '<button type="button" class="jz-tab-btn' + (curFloor === '1F' ? ' jz-tab-active' : '') + '" data-floor="1F" onclick="(window.__jzSwitchFloor||globalThis.__jzSwitchFloor||function(){})(\'1F\',this)">1F 挑高公共层' + (userFloor === '1F' ? '<span class="jz-tab-you">你在</span>' : '') + '</button>'
    + '<button type="button" class="jz-tab-btn' + (curFloor === '2F' ? ' jz-tab-active' : '') + '" data-floor="2F" onclick="(window.__jzSwitchFloor||globalThis.__jzSwitchFloor||function(){})(\'2F\',this)">2F 私密寝息区' + (userFloor === '2F' ? '<span class="jz-tab-you">你在</span>' : '') + '</button>'
    + '</div>'
    + '</div>'
    + '<div class="jz-map-container">'
    + renderArchitecturalFloor(stat, '1F', locs, curFloor)
    + renderArchitecturalFloor(stat, '2F', locs, curFloor)
    + '</div>'
    + (outsideDetail.length
        ? '<div class="jz-outside-strip">'
          + '<span class="jz-outside-tag">外出</span>'
          + outsideDetail.map(function (o) {
              return '<span class="jz-outside-chip"><b>' + esc(o.name) + '</b>' + (o.act ? ' · ' + esc(o.act) : '') + '</span>';
            }).join('')
          + '</div>'
        : '')
    + '</div>'

    /* 双刻线 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar"><span class="jz-sec-text">心身双刻线</span><span class="jz-sec-sub">心理羞耻防线 × 肉体感官欲念</span></div>'
    + '<div class="jz-cards-grid">'
    + PERSONS.map(function (p) { return bars(stat, p, locs); }).join('')
    + '</div>'
    + '</div>'

    /* 常识注入控制台 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar"><span class="jz-sec-text">绝对认知写入</span><span class="jz-sec-sub">' + (ready ? '消耗1次可用次数 · 单体单条注入' : '充能蓄积中') + '</span></div>'
    + '<div class="jz-console-box ' + (ready ? 'jz-console-ready' : 'jz-console-locked') + '">'
    + '<div class="jz-console-form">'
    + '<div class="jz-field-target">'
    + '<select class="jz-luxury-select" id="jz-target">'
    + '<option value="沈若薇"' + (draftTarget === '沈若薇' ? ' selected' : '') + '>沈若薇</option>'
    + '<option value="周岚"' + (draftTarget === '周岚' ? ' selected' : '') + '>周岚</option>'
    + '<option value="温以宁"' + (draftTarget === '温以宁' ? ' selected' : '') + '>温以宁</option>'
    + '</select>'
    + '</div>'
    + '<div class="jz-field-input">'
    + '<input class="jz-luxury-input" id="jz-text" value="' + esc(draftText) + '" placeholder="键入令其视作天经地义的绝对常识……" autocomplete="off" />'
    + '</div>'
    + '<button class="jz-btn jz-btn-inject ' + (ready ? '' : 'jz-btn-disabled') + '" id="jz-go" onclick="return (window.__jzGo||globalThis.__jzGo||function(){return false})(this,event)">'
    + '<span>⚡ 注入常识</span>'
    + '</button>'
    + '</div>'
    + '<div class="jz-console-footer">'
    + '<span class="jz-footer-tip">' + (ready ? '✔ 能量充足：点一下立刻写进变量——旁观者自动合理化，受体将视作天地常理（不发消息，下一轮正文自己跟上）。' : '⚠ 屈辱充能尚未饱和（需 ≥ 100 自动结算）：还需在豪宅中承受更多践踏戏弄。') + '</span>'
    + '</div>'
    + '</div>'
    + '</div>'

    /* 已改写的绝对认知：**永远显示**。
       以前整段被 logsData.count > 0 包着——没写过常识时连标题带按钮一起消失，
       玩家会以为"根本没有开关按钮"。没有条目时给空状态与说明，位置感就有了。 */
    + '<div class="jz-section-wrap">'
    + '<div class="jz-section-bar"><span class="jz-sec-text">已改写的绝对认知</span><span class="jz-sec-sub">点一下即刻生效 · 不发送消息</span></div>'
    + '<div class="jz-logs-container">'
    + (logsData.count > 0 ? logsData.html
       : '<div class="jz-logs-empty">暂未写入任何常识。<br>受辱充能满 <b>100</b> 会自动结算成 <b>1 次</b>注入机会；写下第一条之后，这里就会出现「点此关闭／点此开启」和「✕ 撤回」两个按钮。</div>')
    + '</div>'
    + '</div>'

    + '</div>'
    + '</div>';
}

/* ============ 楼层切换与交互逻辑 ============ */
let activeFloor = '1F';
/* 用户是否手动点过页签。没点过时，地图自动停在{{user}}所在的那一层。 */
let userPickedFloor = false;

/* 面板折叠状态：存在模块级变量里，重绘后也不会自己弹开 */
let collapsed = false;
let lastCollapseAt = 0;

/* 输入草稿与输入法状态：面板重绘时会重建 input 节点，
   所以草稿必须存在 DOM 之外，重绘时再回填，否则打了一半的话会丢。 */
let draftText = '';
let draftTarget = '沈若薇';
let composing = false;
function isTyping() {
  if (composing) return true;
  const $i = $('#jz-text');
  return $i.length > 0 && ($i.is(':focus') || document.activeElement === $i[0]);
}

/* 面板必须挂在「消息块 .mes」上，而不是正文 .mes_text 里面：
   酒馆每次更新正文都会重写 .mes_text 的内容，挂在里面就会一直被冲掉
   （表现就是一闪一闪）。retrieveDisplayedMessage 返回哪个节点因版本而异，
   这里统一往上找到最近的 .mes，找不到就退回原节点。 */
function hostOf(el) {
  if (!el || !el.length) return el;
  if (el.hasClass && el.hasClass('mes')) return el;
  const $mes = el.closest ? el.closest('.mes') : null;
  return ($mes && $mes.length) ? $mes : el;
}

/* 折叠按钮：状态存在模块级变量里，并且做 80ms 去抖。
   原来两处绑定（渲染后直绑 + document 委托）都会 toggle 一次，且状态不持久——
   任何一次重绘都会把面板建回展开态，看起来就是「折叠起来又弹开」。 */
function applyCollapse(btn) {
  const $btn = btn ? $(btn) : $('.jz-collapse-btn');
  let $root = $btn.closest ? $btn.closest('.jz') : null;
  if (!$root || !$root.length) $root = $(document);
  const $body = $root.find('.jz-panel-body');
  if (collapsed) { $body.stop(true, true).hide(); } else { $body.stop(true, true).show(); }
  $root.find('.jz-collapse-btn').each(function () { $(this).toggleClass('jz-is-collapsed', collapsed); });
}
function toggleCollapse(btn) {
  const now = Date.now();
  if (now - lastCollapseAt < 80) return false;   // 去抖：两处绑定串一发也只算一次
  lastCollapseAt = now;
  collapsed = !collapsed;
  applyCollapse(btn);
  return false;
}

function switchFloor(targetFloor, triggerEl) {
  const f = (String(targetFloor) === '2F') ? '2F' : '1F';
  activeFloor = f;
  userPickedFloor = true;   // 手动选过之后就不再自动跟随{{user}}

  const $el = triggerEl ? $(triggerEl) : $('.jz-tab-btn[data-floor="' + f + '"]');
  const $wrap = $el.closest('.jz-section-wrap');
  const $scope = ($wrap && $wrap.length) ? $wrap : $(document);

  // 1. 切换按钮高亮样式
  $scope.find('.jz-tab-btn').removeClass('jz-tab-active');
  $scope.find('.jz-tab-btn[data-floor="' + f + '"]').addClass('jz-tab-active');

  // 2. 切换楼层画布显示（类名与样式双保障）
  $scope.find('.jz-floor-canvas').each(function () {
    const floorId = $(this).attr('data-floor');
    if (floorId === f) {
      $(this).addClass('jz-active-floor').css('display', 'block');
    } else {
      $(this).removeClass('jz-active-floor').css('display', 'none');
    }
  });

  // 3. 将当前楼层记录在根元素上，供后续定时刷新读取，避免刷新后跳回 1F
  const $root = $el.closest('.jz');
  if ($root.length) {
    $root.attr('data-active-floor', f);
    $root.attr('data-user-floor', f);   // 只有真点过页签才写这个
  }

  return false;
}

// 全局暴露供 inline 或不同 frame 访问
if (typeof window !== 'undefined') {
  window.__jzSwitchFloor = switchFloor;
  window.__jzSetFloor = switchFloor;
}
if (typeof globalThis !== 'undefined') {
  globalThis.__jzSwitchFloor = switchFloor;
  globalThis.__jzSetFloor = switchFloor;
}
try {
  if (typeof window !== 'undefined' && window.top && window.top !== window) {
    window.top.__jzSwitchFloor = switchFloor;
    window.top.__jzSetFloor = switchFloor;
  }
} catch (e) {}

/* ============ 交互事件 ============ */
/* 把一段文字塞进聊天输入框并点发送。**当前没有任何地方调用它**：
   按钮全部直接写变量；写不进去时也不再替你发消息（见 execCmd 的 fallback）。
   留着是为了需要时能手动调用。 */
function sendText(txt) {
  const ta = $('#send_textarea');
  if (!ta.length) return false;
  ta.val(txt);
  try { ta[0].dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
  const $send = $('#send_but');
  if (!$send.length) return false;
  $send.trigger('click');
  return true;
}

/* ============ 直接改变量：不经过模型、不发消息 ============
   开关常识、撤回常识、注入常识，本来都是**变量层**的操作。
   以前把它们写进聊天输入框再点发送 —— 点一下就得发一条用户消息、跑一整轮生成，
   面板才跟着变；模型那一轮要是没更新变量，点多少下都白点。
   现在直接调 MVU 的写入口改 stat_data，本机立刻生效：
     · 「点此关闭」→ 该条 启用=false，她当场恢复原样；
     · 「点此开启」→ 她又把这当成天经地义；
     · 「✕」→ 从日志里删掉；
     · 「注入常识」→ 立刻进列表，并扣掉 1 次可用次数。
   模型下一轮从变量里读到的是已经改过的状态，正文自然跟上，不需要谁去通知它。
   只有在写入接口不可用（MVU 还没就绪之类）时，才退回老的「发一条指令消息」路径，
   保证按钮永远不会点不动。 */
/* 与 变量结构校验.js 的 ruleSchema、变量校正.js 的 correct() 必须逐字一致 */
const JZ_RULE_ON = '生效中';
const JZ_RULE_OFF = '已关闭·内容不再成立';

const JZ_CMD_RE = /^\[(常识修改|关闭常识|开启常识|撤回常识)\s*([^:\]：]+)\s*[:：]\s*([^\]]+)\]$/;

/* 变量存在楼层上，以「最后一条带变量的楼层」为准——模型下一轮就是拿它当基准。
   面板可能挂在更早的楼层上，所以不能闭着眼睛写最后一条。 */
function liveMsgId() {
  let last = -1;
  try { last = Number(getLastMessageId()); } catch (e) { return -1; }
  if (!Number.isFinite(last) || last < 0) return -1;
  for (let i = last; i >= 0 && i > last - 8; i--) {
    const st = readStat(i);
    if (st && st['常识修改系统']) return i;
  }
  return last;
}

function commitStat(data, opt) {
  try {
    if (typeof Mvu !== 'undefined' && Mvu.replaceMvuData) { Mvu.replaceMvuData(data, opt); return true; }
  } catch (e) { console.error('[状态栏] MVU 写入失败', e); }
  try { if (typeof replaceVariables === 'function') { replaceVariables(data, opt); return true; } } catch (e2) {}
  try { if (typeof updateVariablesWith === 'function') { updateVariablesWith(function () { return data; }, opt); return true; } } catch (e3) {}
  return false;
}

/* mutate(stat) 返回 true 才真的写回；返回 false 表示「没什么可改的」。
   返回值里的 stage 用来区分「业务上不该改」和「根本写不进去」。 */
function writeStat(mutate) {
  const msgId = liveMsgId();
  if (msgId < 0) return { ok: false, stage: 'read', why: '还没读到任何聊天楼层' };
  const opt = { type: 'message', message_id: msgId };
  let data = null;
  try { if (typeof Mvu !== 'undefined' && Mvu.getMvuData) data = Mvu.getMvuData(opt); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') {
    try { data = (typeof getVariables === 'function' ? getVariables(opt) : null) || {}; } catch (e2) { data = {}; }
  }
  let stat = _.get(data, 'stat_data');
  if (!stat || typeof stat !== 'object') { stat = {}; _.set(data, 'stat_data', stat); }
  if (mutate(stat) !== true) return { ok: false, stage: 'mutate' };
  if (!commitStat(data, opt)) return { ok: false, stage: 'commit', why: '找不到变量写入接口（MVU 未就绪）' };
  return { ok: true, message_id: msgId };
}

/* 写完立刻重画。MVU 落盘偶尔慢半拍，所以再补一次。 */
function refreshNow() {
  try { paintRecent(false); } catch (e) {}
  setTimeout(function () { try { paintRecent(false); } catch (e) {} }, 200);
}

/* 羞辱值锁定：不针对某个人，单独一条指令 */
const JZ_LOCK_RE = /^\[(锁定羞辱值|放开羞辱值)\]$/;

function applyLockLocal(want) {
  let r = { ok: false, why: '什么都没改' };
  const w = writeStat(function (stat) {
    let sys = stat['常识修改系统'];
    if (!sys || typeof sys !== 'object') { sys = {}; stat['常识修改系统'] = sys; }
    /* 缺省即锁着：字段不存在而玩家点「锁定」，不算改动 */
    if ((sys['羞辱值锁定'] !== false) === want) {
      r = { ok: true, noop: true, msg: '羞辱值' + (want ? '本来就是锁着的' : '本来就放开了') };
      return false;
    }
    sys['羞辱值锁定'] = want;
    r = {
      ok: true,
      msg: want
        ? '羞辱值已重新锁定：变量层继续看守（单轮最多 +70、只涨不落）'
        : '羞辱值已放开：变量层不再拦涨幅与回落，数由你说了算'
    };
    return true;
  });
  if (w.ok) return { ok: true, msg: r.msg, changed: true };
  if (w.stage === 'mutate') return r;
  return { ok: false, why: w.why || '变量写入失败', fallback: true };
}

function applyCmdLocal(cmd) {
  const raw = String(cmd || '').trim();
  const lk = JZ_LOCK_RE.exec(raw);
  if (lk) return applyLockLocal(lk[1] === '锁定羞辱值');

  const m = JZ_CMD_RE.exec(raw);
  if (!m) return { ok: false, why: '指令格式不认识：' + cmd };
  const op = m[1], who = m[2].trim(), arg = m[3].trim();
  if (PERSONS.indexOf(who) < 0) return { ok: false, why: '不认识这个受体：' + who };
  let r = { ok: false, why: '什么都没改' };

  const w = writeStat(function (stat) {
    let sys = stat['常识修改系统'];
    if (!sys || typeof sys !== 'object') { sys = {}; stat['常识修改系统'] = sys; }
    let logs = sys['修改日志'];
    if (!logs || typeof logs !== 'object') { logs = {}; sys['修改日志'] = logs; }
    let arr = logs[who];
    if (!Array.isArray(arr)) { arr = []; logs[who] = arr; }

    if (op === '常识修改') {
      if (arr.some(function (it) { return it && String(it.内容) === arg; })) {
        r = { ok: false, why: '「' + arg + '」已经在 ' + who + ' 的列表里了' };
        return false;
      }
      const left = Math.floor(Number(sys['可用次数']) || 0);
      if (left < 1) {
        r = { ok: false, why: '可用次数是 0：先把她的羞辱值推到 100 攒够一次注入' };
        return false;
      }
      let maxId = 0;
      arr.forEach(function (it) { const n = Number(it && it.id); if (Number.isFinite(n) && n > maxId) maxId = n; });
      arr.push({ id: maxId + 1, 内容: arg, 启用: true, 状态: '生效中' });
      sys['可用次数'] = left - 1;
      r = { ok: true, msg: '已给 ' + who + ' 写入 #' + (maxId + 1) + '「' + arg + '」· 可用次数 ' + left + ' → ' + (left - 1) };
      return true;
    }

    const id = Number(String(arg).replace(/[^\d]/g, ''));
    const idx = arr.findIndex(function (it) { return it && Number(it.id) === id; });
    if (idx < 0) { r = { ok: false, why: '找不到 ' + who + ' 的 #' + id }; return false; }

    if (op === '关闭常识') {
      if (arr[idx].启用 === false) { r = { ok: true, noop: true, msg: who + ' #' + id + ' 本来就是挂起的' }; return false; }
      arr[idx].启用 = false;
      arr[idx].状态 = JZ_RULE_OFF;
      r = { ok: true, msg: '已关闭 ' + who + ' #' + id + '：她这一刻恢复原样' };
      return true;
    }
    if (op === '开启常识') {
      if (arr[idx].启用 === true) { r = { ok: true, noop: true, msg: who + ' #' + id + ' 本来就是生效的' }; return false; }
      arr[idx].启用 = true;
      arr[idx].状态 = JZ_RULE_ON;
      r = { ok: true, msg: '已重新开启 ' + who + ' #' + id + '：她又把这当成天经地义' };
      return true;
    }
    arr.splice(idx, 1);
    r = { ok: true, msg: '已彻底撤回 ' + who + ' #' + id };
    return true;
  });

  if (w.ok) return { ok: true, msg: r.msg, changed: true };
  if (w.stage === 'mutate') return r;                       // 业务判断拦下的（或本来就无需改动）
  return { ok: false, why: w.why || '变量写入失败', fallback: true };
}

function hint(text, level) {
  if (typeof toastr !== 'undefined' && toastr[level || 'warning']) { toastr[level || 'warning'](text); return; }
  if (level === 'info') { console.info('[状态栏] ' + text); return; }
  alert(text);
}

function execCmd(cmd) {
  const st = jzCmdState();
  const now = Date.now();
  /* 兜底去重：同一条指令 900ms 内只认第一次（多路绑定的去重主要靠 claimClick 的
     事件标记，这里是万一有第二份脚本副本时的保险）。 */
  if (st.key === cmd && now - st.at < 900) return { ok: true, dup: true };
  st.key = cmd; st.at = now;

  const res = applyCmdLocal(cmd);
  if (res.ok) {
    /* 不弹浮窗。这一行本身会立刻换文案、加删除线，比浮窗更快更清楚；
       连点几下的时候浮窗只会糊住屏幕。要核对细节就看控制台。 */
    console.info('[状态栏] ' + (res.msg || cmd));
    if (res.changed) refreshNow();
    return res;
  }
  if (res.fallback) {
    /* 【不许替你发消息】以前这里会 sendText(cmd)：把指令当成一条用户消息发进聊天框。
       后果是——玩家只是拨了一下开关，聊天里却凭空多出一条消息，还当场触发一轮生成。
       现在只给一个看得见的警告，并把这行指令留在控制台（想手打随时能复制）。
       本机写入不可用通常是 MVU 还没就绪：刷新页面重试即可。 */
    console.warn('[状态栏] 本机写入不可用，这一步没有执行，也没有替你发消息：' + cmd);
    hint('本机写入暂时不可用（' + (res.why || 'MVU 未就绪') + '）——这一步已取消，没有发送任何消息。刷新页面后重试。', 'warning');
    st.key = ''; st.at = 0;
    return res;
  }
  st.key = ''; st.at = 0;   // 没成功就不算一次，允许立刻重试
  hint(res.why || '没能执行', 'warning');
  return res;
}

/* 同一次物理点击会同时命中三路绑定：内联 onclick、渲染后直绑、document 委托。
   【坑】内联 onclick 拿到的是**原生事件**，而 jQuery 的两路拿到的是 **jQuery.Event**
   ——它包着原生事件，但不是同一个对象。只在一个对象上打标记，另一路照样会跑第二遍。
   （「注入成功却弹出『请先写下你要她相信的那句话』」就是这么来的：第二遍读输入框时，
     里面已经被第一遍清空了。）
   所以：两边都打标记，并从 ev.originalEvent 上认领。 */
function claimClick(ev) {
  if (!ev) return true;
  const native = ev.originalEvent || ev;
  if (ev.__jzHandled || native.__jzHandled) return false;
  try { ev.__jzHandled = true; } catch (e) {}
  try { native.__jzHandled = true; } catch (e2) {}
  return true;
}

/* ============ 常识按钮（关闭/开启/撤回）的统一入口 ============
   点一下却「没反应」，历史上只有三条链路可能断：
     ① 整支脚本没跑起来（顶层标识符撞名 → SyntaxError，见文件头注释）；
     ② $(document).on('click', ...) 委托收不到事件；
     ③ sendText 找不到 #send_textarea / #send_but，指令压根没发出去。
   ② ③ 以前全赌在「委托一定有效」上。页签按钮当年就是被这个坑死的，
   后来改成「渲染后直绑 + 暴露全局 + 内联 onclick」三路兜底才好；
   这三个按钮漏掉了同样的处理，所以补齐：三条路都指向 runCmd。
   去重状态挂在 window 上而不是模块里 —— 脚本万一被注入两次，
   各份的模块变量各算各的，同一次点击就会被发成多条指令。 */
function jzCmdState() {
  try {
    if (typeof window !== 'undefined') {
      if (!window.__jzCmdState) window.__jzCmdState = { key: '', at: 0 };
      return window.__jzCmdState;
    }
  } catch (e) {}
  if (!globalThis.__jzCmdState) globalThis.__jzCmdState = { key: '', at: 0 };
  return globalThis.__jzCmdState;
}

function runCmd(btn, ev) {
  if (!claimClick(ev)) return false;
  if (ev) {
    if (ev.preventDefault) ev.preventDefault();
    if (ev.stopPropagation) ev.stopPropagation();
  }
  let $b = null;
  try { $b = $(btn); } catch (e) { $b = null; }
  if (!$b || !$b.length) return false;
  const cmd = String($b.attr('data-cmd') || '');
  if (!cmd) return false;

  const cfm = $b.attr('data-confirm');
  if (cfm && !confirm(cfm)) { const st = jzCmdState(); st.key = ''; st.at = 0; return false; }

  execCmd(cmd);
  return false;
}

/* 注入按钮：受体来自下拉框，内容来自输入框，指令现拼。 */
function submitInject(btn, ev) {
  if (!claimClick(ev)) return false;
  if (ev) {
    if (ev.preventDefault) ev.preventDefault();
    if (ev.stopPropagation) ev.stopPropagation();
  }
  let $b = null;
  try { $b = $(btn); } catch (e) { $b = null; }
  const $box = ($b && $b.closest) ? $b.closest('.jz-console-box') : null;
  const $sel = ($box && $box.length) ? $box.find('#jz-target') : $();
  const $txt = ($box && $box.length) ? $box.find('#jz-text') : $();
  const who = String(($sel && $sel.length ? $sel.val() : '') || draftTarget || '沈若薇');
  const txt = String(($txt && $txt.length ? $txt.val() : '') || '').trim();
  if (!txt) {
    /* 输入框是空的，但刚刚才成功注入过——那多半是同一次点击的第二路，
       框是我们自己清空的，不是玩家没写。这种情况别弹警告。 */
    const st0 = jzCmdState();
    if (Date.now() - (st0.injectAt || 0) < 1500) return false;
    hint('请先写下你要她相信的那句话', 'warning');
    return false;
  }

  const res = execCmd('[常识修改 ' + who + ': ' + txt + ']');
  /* 只有真的写进去了才清空输入框：被拦下（次数不够、内容重复）时留着，
     让他改两个字再点，不用重打一遍。 */
  if (res && res.ok && !res.dup && !res.sent) {
    try { jzCmdState().injectAt = Date.now(); } catch (e0) {}
    try { if ($txt && $txt.length) $txt.val(''); } catch (e) {}
    try { $('#jz-text').val(''); } catch (e2) {}
    draftText = '';
  }
  return false;
}

try {
  if (typeof window !== 'undefined') { window.__jzCmd = runCmd; window.__jzGo = submitInject; }
  if (typeof globalThis !== 'undefined') { globalThis.__jzCmd = runCmd; globalThis.__jzGo = submitInject; }
  if (typeof window !== 'undefined' && window.top && window.top !== window) {
    window.top.__jzCmd = runCmd; window.top.__jzGo = submitInject;
  }
} catch (e) {}

/* ============ 输入法（IME）保护 ============
   面板会在变量变化时重绘。若此刻你正在输入框里用拼音打字，
   节点一被替换，浏览器与操作系统的 IME 组合会话立刻被终止——
   候选词窗被掐断、未敲定的拼音丢失、输入框失焦。 */
$(document).on('compositionstart', '#jz-text', function () { composing = true; });
$(document).on('compositionend', '#jz-text', function () {
  composing = false;
  draftText = String($(this).val() || '');
});
$(document).on('input', '#jz-text', function () { draftText = String($(this).val() || ''); });
$(document).on('change', '#jz-target', function () { draftTarget = String($(this).val() || '沈若薇'); });

/* 注入按钮的 document 委托。渲染后直绑、内联 onclick 也都指向同一个 submitInject，
   靠 claimClick 的事件标记去重，一次点击只会写一条。 */
$(document).on('click', '#jz-go', function (e) { return submitInject(this, e); });

$(document).on('click', '.jz-collapse-btn', function (e) {
  if (e && e.preventDefault) e.preventDefault();
  return toggleCollapse(this);
});

$(document).on('click', '.jz-tab-btn', function (e) {
  if (e && e.preventDefault) e.preventDefault();
  if (e && e.stopPropagation) e.stopPropagation();
  const floor = $(this).attr('data-floor') || $(this).data('floor') || '1F';
  switchFloor(floor, this);
  return false;
});

try {
  if (typeof window !== 'undefined' && window.top && window.top.document && window.top.document !== document) {
    $(window.top.document).on('click', '.jz-tab-btn', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      const floor = $(this).attr('data-floor') || $(this).data('floor') || '1F';
      switchFloor(floor, this);
      return false;
    });
  }
} catch (e) {}

$(document).on('click', '.jz-btn[data-cmd]', function (e) { return runCmd(this, e); });

/* 万一本脚本的 document 与面板所在文档不是同一个，上面这条委托永远收不到事件。
   在面板所在文档（window.top）里再挂一条同样的委托；两条都指向 runCmd，
   由 window 上的去重状态保证一次点击只发一条指令。 */
try {
  if (typeof window !== 'undefined' && window.top && window.top.document && window.top.document !== document) {
    $(window.top.document).on('click', '.jz-btn[data-cmd]', function (e) { return runCmd(this, e); });
  }
} catch (e) {}

/* ============ 顶奢建筑图纸 CSS ============ */
const JZ_CSS = `
.jz{box-sizing:border-box;width:100%;margin:16px 0 8px;padding:0;border-radius:18px;
  background:linear-gradient(165deg,rgba(20,15,28,0.97) 0%,rgba(12,9,17,0.98) 60%,rgba(7,5,10,0.99) 100%);
  border:1px solid rgba(212,175,120,0.32);
  box-shadow:0 14px 44px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04) inset,0 0 30px rgba(212,175,120,0.08);
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
.jz-brand-tagline{font-size:8.5px;letter-spacing:0.16em;color:#8f859b;margin-top:1px;font-family:monospace}
.jz-header-right{display:flex;align-items:center;gap:8px}
.jz-clock-badge{font-size:11px;padding:3px 10px;border-radius:999px;background:rgba(212,175,120,0.1);border:1px solid rgba(212,175,120,0.28);color:#edd9b1;font-weight:600;letter-spacing:0.04em;display:flex;align-items:center;gap:4px}
.jz-clock-sep{opacity:0.5}
/* 这块面板属于第几楼。删楼之后楼层 id 会整体前移，没有它就没法判断面板有没有跟对楼。 */
.jz-floor-no{font-size:9px;font-family:monospace;letter-spacing:0.02em;color:#6f6779;padding:1px 5px;border-radius:999px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)}
.jz-collapse-btn{background:transparent;border:none;color:#a89fb3;cursor:pointer;padding:4px;font-size:13px;transition:transform .2s}
.jz-collapse-btn.jz-is-collapsed{transform:rotate(-90deg)}

.jz-panel-body{padding:14px 18px 16px}

/* 充能池 */
.jz-shame-gauge{margin-bottom:14px;padding:10px 14px;border-radius:12px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);position:relative}
.jz-gauge-ready{border-color:rgba(212,175,120,0.5);background:radial-gradient(ellipse at top left,rgba(212,175,120,0.12),rgba(0,0,0,0.4));box-shadow:0 0 16px rgba(212,175,120,0.12) inset}
.jz-gauge-info{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.jz-gauge-label-group{display:flex;align-items:center;gap:6px}
.jz-gauge-dot{width:6px;height:6px;border-radius:50%;background:#e0899c;box-shadow:0 0 8px #e0899c}
.jz-gauge-val-group .jz-switch{padding:2px 8px 2px 3px}
.jz-gauge-val-group .jz-switch .jz-sw-txt{font-size:9.5px}
.jz-fixline{display:flex;align-items:flex-start;gap:6px;margin-top:6px;padding:5px 8px;border-radius:7px;
  background:rgba(212,175,120,0.07);border:1px solid rgba(212,175,120,0.18)}
.jz-fix-tag{flex:none;font-size:8.5px;letter-spacing:0.1em;color:#d4af78;border:1px solid rgba(212,175,120,0.3);
  border-radius:4px;padding:1px 5px;font-family:monospace}
.jz-fix-txt{font-size:9.5px;color:#b8aec2;line-height:1.55}

.jz-gauge-title{font-size:11.5px;font-weight:600;color:#e8dee5;letter-spacing:0.05em}
.jz-gauge-hint{font-size:9.5px;color:#8e859a;margin-left:4px}
.jz-gauge-val-group{display:flex;align-items:baseline;gap:4px}
.jz-gauge-num{font-size:15px;font-weight:800;color:#e591a5;font-variant-numeric:tabular-nums}
.jz-gauge-max{font-size:11px;color:#8f859a}
.jz-ready-pill{margin-left:8px;font-size:10.5px;padding:2px 8px;border-radius:999px;background:linear-gradient(135deg,#c4974f,#edd4a6);color:#1b120c;font-weight:700;box-shadow:0 0 10px rgba(237,212,166,0.5)}
.jz-track-container{width:100%}
.jz-gauge-track{height:7px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;position:relative}
.jz-gauge-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#9c465d 0%,#e0899c 50%,#eecfa2 100%);box-shadow:0 0 10px rgba(224,137,156,0.6);transition:width .5s cubic-bezier(0.2,0.8,0.2,1)}

/* 区域头与切楼按钮 */
.jz-section-wrap{margin-bottom:16px}
.jz-section-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.06)}
.jz-sec-title-group{display:flex;flex-direction:column;gap:1px}
.jz-sec-text{font-size:11.5px;font-weight:700;letter-spacing:0.1em;color:#e8ddcf;text-transform:uppercase}
.jz-sec-sub{font-size:9.5px;color:#8f859b}
.jz-floor-switcher{display:flex;gap:4px;background:rgba(0,0,0,0.3);padding:2px;border-radius:7px;border:1px solid rgba(212,175,120,0.2)}
.jz-tab-btn{background:transparent;border:none;color:#9d93aa;font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;cursor:pointer;transition:all .15s;user-select:none;-webkit-user-select:none}
.jz-tab-btn:hover{color:#faeedd;background:rgba(212,175,120,0.12)}
.jz-tab-btn.jz-tab-active{background:linear-gradient(135deg,#c4974f,#edd4a6)!important;color:#1b120c!important;font-weight:700!important;box-shadow:0 0 8px rgba(212,175,120,0.3)!important}

/* 真实建筑户型图主体 */
.jz-outside-strip{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;padding:6px 8px;
  border-radius:8px;background:rgba(0,0,0,0.22);border:1px dashed rgba(212,175,120,0.22)}
.jz-outside-tag{font-size:8.5px;letter-spacing:0.14em;color:#8f859b;font-family:monospace;
  border:1px solid rgba(255,255,255,0.10);border-radius:4px;padding:1px 5px}
.jz-outside-chip{font-size:9.5px;color:#bdb3c7;background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.07);border-radius:999px;padding:2px 8px}
.jz-outside-chip b{color:#edd9b7;font-weight:600}

.jz-map-container{position:relative;background:rgba(8,6,12,0.6);border-radius:12px;border:1px solid rgba(212,175,120,0.22);padding:10px;overflow:hidden}
.jz-tab-you{display:inline-block;margin-left:4px;padding:0 4px;border-radius:3px;
  background:rgba(56,189,248,0.22);color:#7dd3fc;font-size:8px;font-weight:700;
  letter-spacing:0.04em;vertical-align:1px}
.jz-floor-canvas{display:none!important}
.jz-floor-canvas.jz-active-floor{display:block!important}
.jz-floor-meta-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:0 4px}
.jz-floor-badge{display:flex;align-items:center;gap:6px}
.jz-floor-label{font-size:10px;font-weight:800;color:#18121d;background:linear-gradient(135deg,#e3c18b,#cda365);padding:1px 6px;border-radius:4px;font-family:monospace}
.jz-floor-sublabel{font-size:9.5px;color:#9b92a6}
.jz-cad-scale{display:flex;align-items:center;gap:4px;font-size:8px;color:#8f859b;font-family:monospace}
.jz-scale-bar{width:36px;height:3px;background:rgba(212,175,120,0.6);position:relative;border-left:1px solid #d4af78;border-right:1px solid #d4af78}

.jz-svg-wrapper{position:relative;width:100%;border-radius:8px;overflow:hidden;background:#09060e;box-shadow:0 0 20px rgba(0,0,0,0.5) inset}
.jz-blueprint-svg{width:100%;height:auto;display:block}
.jz-svg-room{transition:all .25s ease;cursor:pointer}
.jz-svg-room:hover rect{stroke:rgba(212,175,120,0.65)!important;filter:drop-shadow(0 0 6px rgba(212,175,120,0.25))}
.jz-svg-active rect{stroke-width:1.8!important}

/* 声纳雷达波与定位销 */
@keyframes jz-sonar-anim{
  0%{r:12px;opacity:0.9;stroke-width:2px}
  100%{r:28px;opacity:0;stroke-width:0.5px}
}
.jz-sonar-ring{animation:jz-sonar-anim 2s infinite cubic-bezier(0.1,0.7,0.3,1);transform-origin:center}
.jz-occupant-pin{transition:transform .3s ease}

/* 浮动动作小标贴 */
.jz-floating-action-box{position:absolute;display:flex;flex-direction:column;gap:3px;pointer-events:none;transform:translate(0,-50%);z-index:4}
.jz-pill-action{display:inline-flex;align-items:center;gap:4px;font-size:8.5px;padding:2px 7px;border-radius:999px;background:rgba(12,9,17,0.85);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.12);box-shadow:0 2px 8px rgba(0,0,0,0.6);white-space:nowrap}
.jz-pill-name{font-weight:700}
.jz-act-user{border-color:rgba(56,189,248,0.5);color:#7dd3fc}
.jz-act-shen{border-color:rgba(251,113,133,0.5);color:#fda4af}
.jz-act-zhou{border-color:rgba(245,158,11,0.5);color:#fde68a}
.jz-act-wen{border-color:rgba(192,132,252,0.5);color:#e9d5ff}
.jz-pill-desc{color:#d1c8d8;font-size:8px;max-width:110px;overflow:hidden;text-overflow:ellipsis}

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
/* 滑动式开关：轨道 + 滑块 + 状态小字。状态只由变量里的「启用」决定，
   点一下走的是同一条指令（[关闭常识 X: N] / [开启常识 X: N]）。 */
.jz-switch{display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 4px;border-radius:999px;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);cursor:pointer;
  transition:border-color .18s,background .18s}
.jz-switch:hover{border-color:rgba(212,175,120,0.45);background:rgba(212,175,120,0.07)}
.jz-sw-track{position:relative;display:block;width:26px;height:14px;border-radius:999px;
  background:rgba(255,255,255,0.15);box-shadow:0 0 0 1px rgba(0,0,0,0.25) inset;
  transition:background .24s cubic-bezier(.2,.8,.2,1)}
.jz-sw-knob{position:absolute;top:1px;left:1px;width:12px;height:12px;border-radius:50%;
  background:#cdc5d4;box-shadow:0 1px 3px rgba(0,0,0,0.55);
  transition:transform .24s cubic-bezier(.2,.8,.2,1),background .24s}
.jz-sw-txt{font-size:9.5px;letter-spacing:0.02em;color:#a299af;transition:color .24s}
.jz-switch-on{background:rgba(34,197,94,0.10);border-color:rgba(34,197,94,0.32)}
.jz-switch-on .jz-sw-track{background:rgba(34,197,94,0.5)}
.jz-switch-on .jz-sw-knob{transform:translateX(12px);background:#eafff2}
.jz-switch-on .jz-sw-txt{color:#7ee2a8}
.jz-logs-empty{padding:9px 11px;border-radius:8px;font-size:10.5px;line-height:1.7;color:#9b92a6;
  background:rgba(0,0,0,0.22);border:1px dashed rgba(212,175,120,0.22)}
.jz-logs-empty b{color:#edd9b7}
.jz-btn-trash{padding:2px 6px;font-size:9.5px;background:transparent;color:#7e758a;border:1px solid rgba(255,255,255,0.08)}
.jz-btn-trash:hover{color:#f43f5e;border-color:rgba(244,63,94,0.3)}
.jz-loc-chip{margin-left:8px;font-size:11px;padding:2px 7px;border-radius:4px;background:rgba(212,175,120,0.12);color:#edd9b7;border:1px solid rgba(212,175,120,0.3);font-family:monospace;white-space:nowrap}

@media (max-width:680px){
  .jz-cards-grid{grid-template-columns:repeat(1,minmax(0,1fr))}
  .jz-floating-action-box{display:none}
}
`;

/* ============ 挂载流程 ============ */
const JZ_ID = 'jz-terminal-style-v3';

function paint(msgId, force) {
  const el = retrieveDisplayedMessage(msgId);
  if (!el || el.length === 0) return;
  const stat = readStatNear(msgId);
  const locs = extractLiveLocations(stat, msgId);
  const sig = JSON.stringify([stat['常识修改系统'], locs, stat['时间'], stat[MAIN], stat['人物']]);
  const key = 'jzSig_' + msgId;
  /* 【闪烁 + 输入法被打断的总根源】缓存命中判定必须看**宿主 $host** 上的 .jz。
     el 是 retrieveDisplayedMessage 返回的节点，而面板挂在它的 .mes 上，
     所以 el.find(".jz") 恒为 0 —— 这个 return 永远命中不了，于是：
       · 每 2.2 秒的定时器都强制全量销毁重建面板 → 一直闪；
       · 正在打字的 <input> 每 2.2 秒被销毁一次 → 浏览器与系统的 IME 组合会话被强行终止，
         候选词窗被掐断、未敲定的拼音丢失、输入框失焦。
     现在签名与判定统一挂在 $host 上。 */
  const $host = hostOf(el);
  if (!$host || $host.length === 0) return;
  if (!force && $host.data(key) === sig && $host.find('.jz').length > 0) return;

  /* 正在用输入法打字 / 输入框聚焦时不要重绘（force 例外）：
     节点一被替换，IME 组合会话就被浏览器强行终止。 */
  if (!force && isTyping()) return;

  // 读取已选楼层，避免定时轮询重新渲染时被重置回 1F
  // 只有「用户真点过页签」才恢复；没点过就继续自动跟随{{user}}所在楼层
  const prevFloor = el.find('.jz').attr('data-user-floor');
  if (prevFloor) { userPickedFloor = true; activeFloor = prevFloor; }

  /* 关键顺序：**先把新面板渲染好，旧的原封不动**，最后一步才替换。
     原来是「先 remove 再 render」——render 只要抛一次错，面板就没了，
     要等下一个 tick 才回来，看着就是「闪一下不见了又回来」。 */
  const $old = $host.find('.jz').add(el.find('.jz'));
  let $rendered;
  try {
    $rendered = $(render(stat, locs, msgId));
  } catch (err) {
    console.error('[状态栏] 渲染失败 —— 保留旧面板不动', err);
    return;
  }

  // 关键：直接在 DOM 节点上绑定点击切换楼层，杜绝跨 iframe 或委托失效
  $rendered.find('.jz-tab-btn').on('click', function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const f = $(this).attr('data-floor') || '1F';
    switchFloor(f, this);
    return false;
  });

  $rendered.find('.jz-collapse-btn').on('click', function (e) {
    if (e && e.preventDefault) e.preventDefault();
    return toggleCollapse(this);
  });

  $rendered.find('#jz-go').on('click', function (e) { return submitInject(this, e); });

  /* 常识开关 / 撤回按钮：除了 document 委托，这里再直绑一次。
     委托依赖「脚本的 document 就是面板所在的 document」，这个前提不总是成立
     （页签按钮当年正是这么坏掉的）。 */
  $rendered.find('.jz-btn[data-cmd]').on('click', function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    return runCmd(this, e);
  });

  // 一次 DOM 操作完成替换：同一任务内，不存在没有面板的中间态
  if ($old.length) {
    $old.first().replaceWith($rendered);
    if ($old.length > 1) $old.slice(1).remove();
  } else {
    $host.append($rendered);
  }
  $host.data(key, sig);
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
  /* 【不再按 id 列表清理】面板是楼层的子节点：楼层真没了，面板自然跟着没，不用我们删。
     以前按「是否在这次查询结果里」来清理——可 getChatMessages 的 hide_state:'unhidden'
     只返回未隐藏的楼层，酒馆重绘或流式输出时经常临时把楼层标成 hidden，
     那一瞬间它就从列表里消失 → 面板被误删 → 等下一轮才补回来 = 肉眼可见的"突然消失"。
     现在只清「宿主 .mes 已经不在 DOM 里」的孤儿面板。 */
  $('.jz').each(function () {
    if ($(this).closest('.mes').length === 0) $(this).remove();
  });
  ids.forEach(function (id) { paint(id, force); });
}

/* ============ 面板看门狗 ============
   面板为什么会「突然消失」？因为它的宿主楼层会被酒馆重绘（换 innerHTML），
   我们的节点跟着被删；而我们自己的重画要等事件或下一个 tick（最多 2.2 秒）。
   MutationObserver 的回调时机是「DOM 已改完、浏览器还没绘制」——
   在这里把面板补回去，玩家看不到任何空档。 */
function ensurePanels() {
  let ids = [];
  try {
    ids = getChatMessages('0-{{lastMessageId}}', { role: 'assistant', hide_state: 'unhidden' }).map(function (m) { return m.message_id; });
  } catch (e) { return; }
  ids.forEach(function (id) {
    const el = retrieveDisplayedMessage(id);
    if (!el || el.length === 0) return;
    const $host = hostOf(el);
    if ($host.find('.jz').length === 0) paint(id, true);   // 缺了才补
  });
}
function installWatchdog() {
  if (typeof MutationObserver === 'undefined') return;
  const root = document.getElementById('chat') || document.body;
  if (!root) return;
  let scheduled = false;
  const obs = new MutationObserver(function (records) {
    let lost = false;
    for (let i = 0; i < records.length && !lost; i++) {
      const rm = records[i].removedNodes || [];
      for (let j = 0; j < rm.length; j++) {
        const n = rm[j];
        if (!n || n.nodeType !== 1) continue;
        if (n.classList && n.classList.contains('jz')) { lost = true; break; }
        if (n.querySelector && n.querySelector('.jz')) { lost = true; break; }
      }
    }
    if (!lost || scheduled) return;   // 只有「我们的面板被拿掉」才补，平时零开销
    scheduled = true;
    setTimeout(function () { scheduled = false; try { ensurePanels(); } catch (e) {} }, 0);
  });
  obs.observe(root, { childList: true, subtree: true });
}

function paintLast() {
  const id = getLastMessageId();
  // 【不要传 force=true】这里每 2.2 秒被定时器调一次。传 true 会把整个面板删掉重建，
  // 于是「楼层切到 2F」「折叠起来」「注入框里打的字」全被冲掉。
  // 传 false 时 paint() 会比对变量签名，变了才重绘——刷新照旧，交互不再被打断。
  if (id >= 0) paint(id);
  // 开场白（第 0 楼）也要跟着变量走：点了开局卡片之后位置变了，不能只刷最后一条。
  // paint() 有签名比对，变量没变就秒退，不费性能；那一楼没显示时也会自己 return。
  if (id !== 0) paint(0);
}

$(() => {
  if (!$('#' + JZ_ID).length) $('head').append($('<style>').attr('id', JZ_ID).text(JZ_CSS));

  paintRecent(true);
  installWatchdog();   // 面板被外力拿掉时，立刻在同一帧补回去

  // 刚进卡时变量可能还没初始化完（MVU 的 [initvar] 稍后才落盘），这里补几次
  // 早期重画，让首屏地图不用干等满一轮 2.2 秒。paint 有签名比对，没变就秒退。
  [1200, 2600, 4200].forEach(function (d) {
    setTimeout(function () { paintRecent(false); }, d);
  });

  let tick = 0;
  window.setInterval(function () {
    tick += 1;
    try {
      if (isTyping()) return;      // 正在打字就别动 DOM，免得打断输入法
      if (tick % 10 === 0) paintRecent(false);
      else paintLast();
    } catch (e) { console.error('[状态栏] 刷新失败', e); }
  }, 2200);

  /* 【流式狂闪的直接来源】酒馆生成时每个 token 都会触发 MESSAGE_UPDATED，
     传 force=true 等于一段话里把面板推倒重建几十次。这里改成不强制：
     只有变量真的结算变动了才重绘。需要强制的场合另用 onMsgForce。 */
  const onMsg = function (id) {
    const f = Number.isFinite(Number(id)) ? Number(id) : getLastMessageId();
    if (f >= 0) paint(f, false);
  };
  const onMsgForce = function (id) {
    const f = Number.isFinite(Number(id)) ? Number(id) : getLastMessageId();
    if (f >= 0) paint(f, true);
  };

  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onMsgForce);
  eventOn(tavern_events.MESSAGE_UPDATED, onMsg);
  // 滑动瞬间变量还是旧的（开局同步 ~320ms 后才写入「空间状态」），所以滑动时
  // 先按当前值渲染一次，再补两次延迟刷新把新位置追回来。
  eventOn(tavern_events.MESSAGE_SWIPED, function (id) {
    onMsg(id);
    setTimeout(function () { paintRecent(false); }, 420);
    setTimeout(function () { paintRecent(false); }, 900);
  });
  eventOn(tavern_events.MESSAGE_EDITED, onMsgForce);
  eventOn(tavern_events.MESSAGE_RECEIVED, () => setTimeout(paintLast, 120));
  // 删与画放在同一个任务里：原来是「先删、260ms 后再画」，那 260ms 就是肉眼可见的空档
  eventOn(tavern_events.CHAT_CHANGED, () => setTimeout(() => {
    $('.jz').remove();
    paintRecent(true);
  }, 260));
  eventOn(tavern_events.MORE_MESSAGES_LOADED, () => setTimeout(() => paintRecent(true), 220));
  /* 删楼必须**整块清掉再重建**，不能只"重画自己"：
     删除会让后面所有楼层的 id 整体前移，逐楼重画时很容易有面板挂在"已经不是它自己"
     的节点上，或者干脆没被碰上——表现就是「删了一轮，状态栏还停在删除前的数」。
     酒馆重排楼层是异步的，所以补第二次。 */
  const afterDelete = function () {
    try { $('.jz').remove(); } catch (e) {}
    try { paintRecent(true); } catch (e2) { console.error('[状态栏] 删楼后重建失败', e2); }
  };
  eventOn(tavern_events.MESSAGE_DELETED, function () {
    setTimeout(afterDelete, 120);
    setTimeout(afterDelete, 620);
  });

  $(window).on('pagehide', function () {
    $('.jz').remove();
    $('#' + JZ_ID).remove();
  });

  console.info('[状态栏] 江湾壹号 3601 真实建筑户型重构版 v5.14 已挂载（羞辱值锁定开关 + 变量层回报可见）');
});

/* 只给本地冒烟测试取值；运行时没有任何地方依赖它 */
if (typeof globalThis !== 'undefined') {
  globalThis.__jzRender = render;
  globalThis.__jzExtractLiveLocations = extractLiveLocations;
  // 给 开局同步 之类的脚本用：写完变量后喊一声，地图立刻重画
  globalThis.__jzRefresh = function () { try { paintRecent(false); } catch (e) {} };
  globalThis.__jzReadStatNear = readStatNear;
  globalThis.__jzPaintRecent = function (force) { try { paintRecent(!!force); } catch (e) {} };
}
})();
