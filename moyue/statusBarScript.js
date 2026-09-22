(function(){
  const z = window.z || top.z;
  const _ = window._ || top._;
  const $ = window.$ || top.$;

  const STAGES = ['阶段1·温情日常', '阶段2·口舌与足', '阶段3·完整交合', '阶段4·无所顾忌'];
  const PERIODS = ['清晨', '上午', '下午', '傍晚', '夜里', '深夜'];
  const NAMES = ['周岚', '温以宁'];
  const STYLE_ID = 'myz-sb-style-v2';

  const STAGE_RULES = [
    { 名: '阶段1 · 温情日常与亲昵越线', 概要: '亲吻、拥抱、抚摸、夜里同床；口舌与足需阶段2，完整交合需阶段3。' },
    { 名: '阶段2 · 口舌与足', 概要: '用嘴、用脚替他弄出来；阶段1一切照旧；完整交合仍需阶段3。' },
    { 名: '阶段3 · 完整交合', 概要: '完整交合，不挑时辰与场合；只差当着别人的面。' },
    { 名: '阶段4 · 无所顾忌', 概要: '不再遮掩、不再找借口，白天人前也照做。' }
  ];

  const ACTION_HINTS = [
    '往周岚那边走',
    '往温以宁那边走',
    '记住她们说过的话',
    '也可以什么都不做，只向妈妈开口要'
  ];

  function clamp(val, min, max, def) {
    if (val == null || val === '') return def;
    const n = Number(val);
    return Number.isFinite(n) ? _.clamp(n, min, max) : def;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getPeriodIcon(period) {
    switch (period) {
      case '清晨': return '🌅';
      case '上午': return '☀️';
      case '下午': return '🌤️';
      case '傍晚': return '🌆';
      case '夜里': return '🌙';
      case '深夜': return '🌌';
      default: return '🕰️';
    }
  }

  function getShameDesc(val) {
    if (val >= 80) return '羞极难堪 · 掩面无措';
    if (val >= 55) return '紧咬下唇 · 别开视线';
    if (val >= 30) return '心虚脸红 · 欲盖弥彰';
    return '信以为真 · 寻常照拂';
  }

  function getDesireDesc(val) {
    if (val >= 80) return '骨酥体软 · 难抑渴求';
    if (val >= 55) return '盼君近身 · 呼吸紊乱';
    if (val >= 30) return '暗生温热 · 心跳微乱';
    return '深闺未醒 · 隐隐空落';
  }

  function getSubmersionDesc(val) {
    if (val >= 65) return '无所顾忌 · 沉沦不悔';
    if (val >= 55) return '直白索取 · 难掩痴迷';
    if (val >= 40) return '防线漏空 · 逾矩入骨';
    return '理智犹存 · 母职借口';
  }

  function getRelationDesc(name, sub) {
    if (sub <= 0) {
      return name === '周岚' ? '六年交情，界线没动过' : name === '温以宁' ? '对门的客气邻居' : '这条线还没被越过';
    }
    if (sub < 21) return '还都是老样子';
    if (sub < 41) return '自己会再来串门';
    if (sub < 61) return '主动找借口上门';
    if (sub < 81) return '不再费心解释';
    return '自己主动索求';
  }

  const renderCache = new Map();

  function getMsgVars(msgId) {
    try {
      return _.get(getVariables({ type: 'message', message_id: msgId }), 'stat_data', {});
    } catch (e) {
      return {};
    }
  }

  // 某一楼没有变量时补的开局值（与卡里 [initvar] 一致：其一 · 周五傍晚）
  function fallbackInitial() {
    return {
      沈若薇: { 羞耻: 40, 欲望: 62, 沉溺: 5 },
      人物: { 周岚: { 羞耻: 25, 欲望: 45, 沉溺: 0 }, 温以宁: { 羞耻: 45, 欲望: 58, 沉溺: 0 } },
      时间: { 第几天: 1, 时段: '傍晚' }
    };
  }

  function ensureVars(msgId, isLast) {
    let vars = getMsgVars(msgId);
    if (!vars || !vars.沈若薇 || typeof vars.沈若薇.羞耻 !== 'number') {
      vars = fallbackInitial();
      if (isLast) {
        try {
          updateVariablesWith(n => _.set(n, 'stat_data', vars), { type: 'message', message_id: msgId });
        } catch(e) {}
      }
    }
    return vars;
  }

  function renderGauge(label, value, type) {
    const val = clamp(value, 0, 100, 0);
    let desc = '';
    let colorClass = '';
    if (type === 'shame') {
      desc = getShameDesc(val);
      colorClass = 'myz-gauge-shame';
    } else if (type === 'desire') {
      desc = getDesireDesc(val);
      colorClass = 'myz-gauge-desire';
    } else {
      desc = getSubmersionDesc(val);
      colorClass = 'myz-gauge-sub';
    }

    return `
      <div class="myz-g ${colorClass}">
        <div class="myz-g-header">
          <span class="myz-g-label">${label}</span>
          <span class="myz-g-desc">${desc}</span>
          <span class="myz-g-num">${val}</span>
        </div>
        <div class="myz-g-track">
          <div class="myz-g-bar" style="width:${val}%"></div>
        </div>
      </div>
    `;
  }

      function renderOtherWomen(data) {
    const chars = _.get(data, '人物', {}) || {};
    const entries = Object.entries(chars);
    if (!entries.length) return '';

    return `
      <div class="myz-sec">
        <div class="myz-sec-title">
          <span>她与身边人 · 关系推移</span>
        </div>
        <div class="myz-women-list">
          ${entries.map(([name, obj]) => {
            const shame = clamp(obj?.羞耻, 0, 100, 0);
            const desire = clamp(obj?.欲望, 0, 100, 0);
            const sub = clamp(obj?.沉溺, 0, 100, 0);
            const relation = getRelationDesc(name, sub);
            const isZhou = name === '周岚';
            const role = isZhou ? '闺蜜 · 34岁' : '邻居 · 32岁';
            const colorTheme = isZhou ? 'zhou' : 'wen';

            return `
              <div class="myz-woman-card myz-theme-${colorTheme}">
                <div class="myz-wm-head">
                  <span class="myz-wm-name">${esc(name)}</span>
                  <span class="myz-wm-role">${role}</span>
                  <span class="myz-wm-state">${esc(relation)}</span>
                </div>
                <div class="myz-wm-gauges">
                  <div class="myz-wm-g">
                    <span>羞耻 ${shame}</span>
                    <div class="myz-wm-bar"><div class="fill shame" style="width:${shame}%"></div></div>
                  </div>
                  <div class="myz-wm-g">
                    <span>欲望 ${desire}</span>
                    <div class="myz-wm-bar"><div class="fill desire" style="width:${desire}%"></div></div>
                  </div>
                  <div class="myz-wm-g">
                    <span>沉溺 ${sub}</span>
                    <div class="myz-wm-bar"><div class="fill sub" style="width:${sub}%"></div></div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderStageInfo(depth) {
    const item = STAGE_RULES[_.clamp(depth, 1, 4) - 1];
    if (!item) return '';
    return `
      <div class="myz-sec myz-stage-rule-box">
        <div class="myz-sec-title"><span>${esc(item.名)}</span></div>
        <div class="myz-stage-rule-text">${esc(item.概要)}</div>
      </div>
    `;
  }

  function buildHtml(floor, data, isLast) {
    const day = clamp(_.get(data, '时间.第几天', 1), 1, 999, 1);
    const period = String(_.get(data, '时间.时段', '傍晚'));
    const pIcon = getPeriodIcon(period);

    const shame = clamp(_.get(data, '沈若薇.羞耻', 0), 0, 100, 0);
    const desire = clamp(_.get(data, '沈若薇.欲望', 0), 0, 100, 0);
    const sub = clamp(_.get(data, '沈若薇.沉溺', 0), 0, 100, 0);

    // 阶段由「沉溺」推出来（40／55／65 三道线，与 getSubmersionDesc 一致）。
    // 本卡没有独立的阶段变量：原先那套外部数据模型的深度／阶段读取已全部移除。
    const depth = sub >= 65 ? 4 : sub >= 55 ? 3 : sub >= 40 ? 2 : 1;
    const stageName = STAGES[depth - 1];

    return `
      <div class="myz-sb" data-floor="${floor}">
        <!-- 状态栏顶栏 -->
        <div class="myz-sb-topbar">
          <div class="myz-sb-badges">
            <span class="myz-badge myz-badge-day">第 ${day} 天</span>
            <span class="myz-badge myz-badge-time">${pIcon} ${esc(period)}</span>
            <span class="myz-badge myz-badge-stage">${esc(stageName)}</span>
          </div>

          <div class="myz-stage-stepper">
            ${[1, 2, 3, 4].map(s => {
              const active = s <= depth;
              const current = s === depth;
              return `<span class="myz-step-dot ${active ? 'active' : ''} ${current ? 'current' : ''}" title="阶段 ${s}">L${s}</span>`;
            }).join('')}
          </div>

          <button type="button" class="myz-btn-collapse" title="折叠/展开详细面板">
            <span class="myz-collapse-label">收起面板</span>
          </button>
        </div>

        <!-- 沈若薇核心刻度条 -->
        <div class="myz-core-gauges">
          ${renderGauge('羞耻', shame, 'shame')}
          ${renderGauge('欲望', desire, 'desire')}
          ${renderGauge('沉溺', sub, 'submersion')}
        </div>

        <!-- 详细内容区域 -->
        <div class="myz-detail-body">
          <div class="myz-col">
            ${renderOtherWomen(data)}
          </div>

          <div class="myz-col">
            ${renderStageInfo(depth)}
          </div>
        </div>

        <!-- 行动罗盘底部提示 -->
        <div class="myz-sb-footer">
          <span class="myz-compass-icon">🧭 行动罗盘:</span>
          <div class="myz-hints-wrap">
            ${ACTION_HINTS.map(h => `<span class="myz-hint-chip">${esc(h)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function getAssistantFloor() {
    let id = typeof getLastMessageId === 'function' ? getLastMessageId() : null;
    if (id == null) return null;
    for (let i = 0; i < 8 && id >= 0; i++) {
      const msg = typeof getChatMessages === 'function' ? getChatMessages(id)[0] : null;
      if (msg && msg.role === 'assistant' && !msg.is_hidden) return msg.message_id;
      id--;
    }
    return null;
  }

  function renderFloor(floor, data, isLast, force = false) {
    if (typeof retrieveDisplayedMessage !== 'function') return;
    const $msg = retrieveDisplayedMessage(floor);
    if (!$msg || !$msg.length) return;

    const cacheKey = JSON.stringify([data, isLast]);
    if (!force && renderCache.get(floor) === cacheKey && $msg.find('.myz-sb').length > 0) return;

    $msg.find('.myz-sb').remove();
    const $sb = $(buildHtml(floor, data, isLast));

    // 折叠展开事件
    $sb.find('.myz-btn-collapse').on('click', function(e) {
      e.stopPropagation();
      const $parent = $(this).closest('.myz-sb');
      $parent.toggleClass('is-collapsed');
      const collapsed = $parent.hasClass('is-collapsed');
      $(this).find('.myz-collapse-label').text(collapsed ? '展开面板' : '收起面板');
    });

    $msg.append($sb);
    renderCache.set(floor, cacheKey);
  }

  function refreshAll(force = false) {
    if (typeof getChatMessages !== 'function') return;
    let msgs = [];
    try {
      msgs = getChatMessages('0-{{lastMessageId}}', { role: 'assistant', hide_state: 'unhidden' });
    } catch (e) {
      return;
    }
    if (!msgs || !msgs.length) return;

    const validFloors = new Set(msgs.map(m => m.message_id));
    $('.myz-sb').each(function() {
      const f = Number($(this).attr('data-floor'));
      if (Number.isFinite(f) && !validFloors.has(f)) {
        $(this).remove();
        renderCache.delete(f);
      }
    });

    const lastId = msgs[msgs.length - 1].message_id;
    msgs.forEach(m => {
      const isLast = m.message_id === lastId;
      renderFloor(m.message_id, ensureVars(m.message_id, isLast), isLast, force);
    });
  }

  function refreshLast() {
    const lastId = getAssistantFloor();
    if (lastId != null) {
      renderFloor(lastId, ensureVars(lastId, true), true);
    }
  }

  const STYLES = `

    .myz-sb {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      margin: 12px 0 6px;
      padding: 12px 14px 10px;
      border-radius: 16px;
      border: 1px solid rgba(168, 85, 247, 0.22);
      background:
        radial-gradient(ellipse 65% 50% at 90% 0%, rgba(168, 85, 247, 0.08), transparent 70%),
        radial-gradient(ellipse 50% 50% at 10% 100%, rgba(244, 63, 94, 0.07), transparent 70%),
        linear-gradient(168deg, rgba(20, 16, 26, 0.94) 0%, rgba(13, 10, 18, 0.98) 100%);
      box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      color: #ede5f2;
      font-size: 12px;
      line-height: 1.5;
      text-align: left;
      font-family: system-ui, -apple-system, sans-serif;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .myz-sb * { box-sizing: border-box; }

    /* 顶栏 */
    .myz-sb-topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .myz-sb-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .myz-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    .myz-badge-day {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-weight: 700;
      color: #fff;
    }
    .myz-badge-time {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.28);
      color: #fcd34d;
    }
    .myz-badge-stage {
      background: rgba(168, 85, 247, 0.18);
      border: 1px solid rgba(168, 85, 247, 0.38);
      color: #e9d5ff;
      font-weight: 600;
    }

    /* 阶段点点 */
    .myz-stage-stepper {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
    }
    .myz-step-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 20px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .myz-step-dot.active {
      background: rgba(168, 85, 247, 0.25);
      border-color: rgba(168, 85, 247, 0.45);
      color: #d8b4fe;
    }
    .myz-step-dot.current {
      background: linear-gradient(135deg, #a855f7, #ec4899);
      border-color: #f472b6;
      color: #fff;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
    }

    .myz-btn-collapse {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 2px 8px;
      color: rgba(255, 255, 255, 0.65);
      font-size: 10.5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .myz-btn-collapse:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    /* 核心刻度条 */
    .myz-core-gauges {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .myz-g { min-width: 0; }
    .myz-g-header {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 4px;
    }
    .myz-g-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      opacity: 0.9;
    }
    .myz-g-desc {
      font-size: 10px;
      opacity: 0.6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .myz-g-num {
      margin-left: auto;
      font-size: 13px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .myz-g-track {
      height: 5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }
    .myz-g-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .myz-gauge-shame .myz-g-label { color: #fb7185; }
    .myz-gauge-shame .myz-g-num { color: #fda4af; }
    .myz-gauge-shame .myz-g-bar { background: linear-gradient(90deg, #f43f5e, #fb7185); }

    .myz-gauge-desire .myz-g-label { color: #fbbf24; }
    .myz-gauge-desire .myz-g-num { color: #fde68a; }
    .myz-gauge-desire .myz-g-bar { background: linear-gradient(90deg, #f59e0b, #fb923c); }

    .myz-gauge-sub .myz-g-label { color: #c084fc; }
    .myz-gauge-sub .myz-g-num { color: #e9d5ff; }
    .myz-gauge-sub .myz-g-bar { background: linear-gradient(90deg, #9333ea, #c084fc); }

    /* 折叠状态 */
    .myz-sb.is-collapsed .myz-detail-body,
    .myz-sb.is-collapsed .myz-sb-footer {
      display: none;
    }

    /* 详细内容网格 */
    .myz-detail-body {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      gap: 12px 16px;
      margin-top: 10px;
    }
    .myz-col { min-width: 0; }

    .myz-sec + .myz-sec { margin-top: 10px; }
    .myz-sec-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }

    /* 她与身边人 */
    .myz-women-list { display: grid; gap: 6px; }
    .myz-woman-card {
      padding: 6px 9px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .myz-theme-zhou { border-left: 2px solid #82a8d8; }
    .myz-theme-wen { border-left: 2px solid #6eb79c; }
    .myz-wm-head {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 4px;
    }
    .myz-wm-name { font-weight: 700; font-size: 11.5px; color: #fff; }
    .myz-wm-role { font-size: 9.5px; color: rgba(255, 255, 255, 0.45); }
    .myz-wm-state {
      margin-left: auto;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.65);
    }
    .myz-wm-gauges {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    .myz-wm-g {
      font-size: 9.5px;
      color: rgba(255, 255, 255, 0.6);
    }
    .myz-wm-bar {
      height: 3px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      margin-top: 2px;
    }
    .myz-wm-bar .fill { height: 100%; border-radius: 2px; }
    .myz-wm-bar .fill.shame { background: #fb7185; }
    .myz-wm-bar .fill.desire { background: #fbbf24; }
    .myz-wm-bar .fill.sub { background: #c084fc; }

    /* 阶段法则卡 */
    .myz-stage-rule-box {
      padding: 7px 9px;
      border-radius: 8px;
      background: rgba(168, 85, 247, 0.06);
      border: 1px solid rgba(168, 85, 247, 0.16);
    }
    .myz-stage-rule-text {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.5;
    }

    /* 底部罗盘 */
    .myz-sb-footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .myz-compass-icon {
      font-size: 10.5px;
      color: rgba(212, 175, 55, 0.85);
      font-weight: 600;
    }
    .myz-hints-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .myz-hint-chip {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.55);
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      transition: all 0.2s;
    }
    .myz-hint-chip:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 580px) {
      .myz-detail-body { grid-template-columns: minmax(0, 1fr); }
      .myz-core-gauges { grid-template-columns: minmax(0, 1fr); gap: 6px; }
      .myz-sb-topbar { gap: 6px; }
      .myz-badge { font-size: 10px; padding: 2px 7px; }
    }
  `;

  function init() {
    if (!$(`#${STYLE_ID}`).length) {
      $('head').append($('<style>').attr('id', STYLE_ID).text(STYLES));
    }
    refreshAll(true);

    let counter = 0;
    const timer = window.setInterval(() => {
      counter++;
      try {
        if (counter % 12 === 0) refreshAll();
        else refreshLast();
      } catch(e) {}
    }, 2000);

    const onEvent = msgId => {
      if (!Number.isFinite(msgId)) return;
      const isLast = msgId === getAssistantFloor();
      renderFloor(msgId, ensureVars(msgId, isLast), isLast, true);
    };

    if (window.eventOn && window.tavern_events) {
      eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onEvent);
      eventOn(tavern_events.MESSAGE_UPDATED, onEvent);
      eventOn(tavern_events.MESSAGE_SWIPED, onEvent);
      eventOn(tavern_events.MESSAGE_EDITED, onEvent);
      eventOn(tavern_events.CHAT_CHANGED, () => { renderCache.clear(); refreshAll(true); });
      eventOn(tavern_events.MORE_MESSAGES_LOADED, () => refreshAll(true));
      eventOn(tavern_events.MESSAGE_DELETED, () => refreshAll(true));
      eventOn(tavern_events.MESSAGE_RECEIVED, () => refreshLast());
    }

    $(window).on('pagehide', () => {
      window.clearInterval(timer);
      $('.myz-sb').remove();
      $(`#${STYLE_ID}`).remove();
    });
  }

  if (window.errorCatched) {
    $(errorCatched(init));
  } else {
    $(init);
  }
})();
