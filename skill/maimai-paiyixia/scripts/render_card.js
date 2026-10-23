#!/usr/bin/env node
/**
 * 麦麦拍一下 · 发现卡渲染器
 *
 * 用法：
 *   node render_card.js card.json > maimai-card.html
 *   cat card.json | node render_card.js > maimai-card.html
 *
 * 输入 JSON 字段：
 * {
 *   "scene":     "活动" | "同款" | "优惠" | 任意短标签,
 *   "headline":  "一句人话回应最关心的问题",
 *   "seen":      ["我看到了什么 · 条目1", "条目2"],
 *   "relation":  ["和你有什么关系 · 条目1", "条目2"],
 *   "steps":     ["接下来怎么做 · 第一步", "第二步"],
 *   "queryTime": "2026-10-23 14:35",          // 必填，发现卡时间戳
 *   "caveats":   ["可选 · 待确认/免责条目"]
 * }
 *
 * 设计原则：查不清的字段允许为空数组，卡片显示"暂未查到"，
 * 但 queryTime 缺失时拒绝渲染——没有时间戳的发现卡会变成误导人的旧截图。
 */

'use strict';

const fs = require('fs');

function readInput() {
  const arg = process.argv[2];
  if (arg) return fs.readFileSync(arg, 'utf8');
  return fs.readFileSync(0, 'utf8'); // stdin
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function list(items, emptyText, ordered) {
  if (!items || items.length === 0) {
    return '<p class="empty">' + esc(emptyText) + '</p>';
  }
  const tag = ordered ? 'ol' : 'ul';
  return (
    '<' + tag + '>' +
    items.map((t) => '<li>' + esc(t) + '</li>').join('') +
    '</' + tag + '>'
  );
}

const SCENE_META = {
  '活动': { icon: '🎟️', label: '拍海报 · 发现玩法', color: '#da291c' },
  '同款': { icon: '🍟', label: '拍餐品 · 发现同款', color: '#ffbc0d' },
  '优惠': { icon: '🎫', label: '拍优惠 · 发现关系', color: '#2779bd' },
};

function render(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('输入必须是 JSON 对象');
  }
  if (!data.queryTime) {
    throw new Error('缺少 queryTime（查询时间戳）。没有时间戳的发现卡会误导转发者，拒绝渲染。');
  }
  if (!data.headline) {
    throw new Error('缺少 headline（一句人话的结论）。发现卡必须先回答用户最关心的问题。');
  }
  const meta = SCENE_META[data.scene] || { icon: '🍔', label: '麦麦发现卡', color: '#da291c' };
  const caveats = (data.caveats && data.caveats.length)
    ? '<div class="caveats">' + data.caveats.map((c) => '<p>⚠️ ' + esc(c) + '</p>').join('') + '</div>'
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>麦麦发现卡 · ${esc(data.scene || '')}</title>
<style>
  :root { --mcd-red: ${meta.color}; --ink: #2b2320; --paper: #fffdf8; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: #f4efe6; color: var(--ink);
    display: flex; justify-content: center; padding: 24px 12px;
  }
  .card {
    width: 100%; max-width: 420px; background: var(--paper);
    border-radius: 20px; overflow: hidden;
    box-shadow: 0 12px 32px rgba(43, 35, 32, .18);
  }
  .card-head {
    background: var(--mcd-red); color: #fff; padding: 18px 22px 16px;
  }
  .card-head .tag {
    display: inline-block; font-size: 12px; letter-spacing: 1px;
    background: rgba(255,255,255,.18); border-radius: 999px;
    padding: 3px 12px; margin-bottom: 10px;
  }
  .card-head h1 { font-size: 19px; line-height: 1.45; font-weight: 700; }
  .card-body { padding: 20px 22px 8px; }
  section { margin-bottom: 18px; }
  h2 {
    font-size: 13px; color: var(--mcd-red); letter-spacing: 2px;
    margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
  }
  h2::after { content: ""; flex: 1; height: 1px; background: rgba(0,0,0,.08); }
  ul, ol { padding-left: 1.3em; }
  li { font-size: 14.5px; line-height: 1.7; margin-bottom: 4px; }
  ol li::marker { color: var(--mcd-red); font-weight: 700; }
  .empty { font-size: 14px; color: #a89f94; font-style: italic; }
  .caveats { background: #fff6e0; border-radius: 10px; padding: 10px 14px; margin: 0 22px 14px; }
  .caveats p { font-size: 12.5px; color: #8a6d1a; line-height: 1.6; }
  .card-foot {
    border-top: 1px dashed rgba(0,0,0,.15);
    padding: 12px 22px 18px; font-size: 11.5px; color: #a89f94; line-height: 1.6;
  }
  .brand { text-align: center; margin-top: 6px; font-size: 12px; color: var(--ink); letter-spacing: 2px; }
</style>
</head>
<body>
  <div class="card">
    <div class="card-head">
      <span class="tag">${meta.icon} 麦麦发现卡 · ${esc(meta.label)}</span>
      <h1>${esc(data.headline)}</h1>
    </div>
    <div class="card-body">
      <section>
        <h2>👀 我看到了什么</h2>
        ${list(data.seen, '图中信息暂未识别，欢迎补充描述。', false)}
      </section>
      <section>
        <h2>🤝 和你有什么关系</h2>
        ${list(data.relation, '官方渠道暂未查到相关信息，以下方提示为准。', false)}
      </section>
      <section>
        <h2>👉 接下来怎么做</h2>
        ${list(data.steps, '暂无可执行的下一步，建议打开麦当劳 App 核对。', true)}
      </section>
    </div>
    ${caveats}
    <div class="card-foot">
      查询时间：${esc(data.queryTime)}<br>
      本卡由「麦麦拍一下」基于麦当劳官方 MCP 数据生成，信息以麦当劳官方实时结果为准；转发前请注意时效。
      <div class="brand">🍔 麦麦拍一下 · 把看到的变成看得懂的</div>
    </div>
  </div>
</body>
</html>
`;
}

try {
  const raw = readInput();
  const data = JSON.parse(raw);
  process.stdout.write(render(data));
} catch (err) {
  process.stderr.write('渲染失败：' + err.message + '\n');
  process.exit(1);
}
