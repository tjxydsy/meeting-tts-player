/**
 * 独立 HTML 播放器模板生成
 * 从 generate-player.cjs 移植 — 生成可在浏览器中独立使用的 HTML 文件
 */

const { escHtml, fmtTime } = require('../main/json-parser');

const PALETTE = ['#e94560', '#0f3460', '#533483', '#e23e57', '#1a508b', '#6a4c93', '#c73a52', '#2d6baa', '#8b5cf6', '#f06292'];

function generateHTML({ records, speakers, baseName }) {
  // 发言人颜色映射
  const speakerColor = {};
  speakers.forEach((s, i) => { speakerColor[s] = PALETTE[i % PALETTE.length]; });

  // 消息列表
  let messagesHTML = '';
  records.forEach((p) => {
    const color = speakerColor[p.name];
    messagesHTML += `
<div class="msg" data-speaker="${escHtml(p.name)}" data-index="${p.i}" id="msg-${p.i}" onclick="playAt(${p.i})">
  <div class="avatar" style="background:${color}">${escHtml(p.name[0] || '?')}</div>
  <div class="msg-body">
    <div class="msg-header"><span class="msg-name">${escHtml(p.name)}</span><span class="msg-time">${fmtTime(p.start)}</span></div>
    <div class="msg-text">${escHtml(p.text)}</div>
  </div>
  <div class="msg-index">#${p.i + 1}</div>
</div>`;
  });

  // 筛选按钮
  let filterButtons = `<button class="active" data-speaker="all" onclick="filter('all', this)">全部 (${records.length})</button>`;
  speakers.forEach(s => {
    const count = records.filter(p => p.name === s).length;
    filterButtons += `<button data-speaker="${escHtml(s)}" onclick="filter('${escHtml(s)}', this)">${escHtml(s)} (${count})</button>`;
  });

  // 语音数据
  const speechData = records.map(p => ({ i: p.i, name: p.name, text: p.text }));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(baseName)} 会议对话</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif; background: #1a1a2e; color: #e0e0e0; min-height: 100vh; }
.header { position: sticky; top: 0; z-index: 100; background: #16213e; padding: 16px 24px; border-bottom: 1px solid #0f3460; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.header h1 { font-size: 1.3em; color: #e94560; }
.header .info { font-size: 0.85em; color: #888; }
.speaker-filters { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 24px; background: #16213e80; border-bottom: 1px solid #0f346040; position: sticky; top: 68px; z-index: 99; }
.speaker-filters button { padding: 4px 14px; border: 1px solid #0f3460; border-radius: 20px; cursor: pointer; font-size: 0.8em; background: transparent; color: #aaa; transition: all 0.2s; }
.speaker-filters button:hover { border-color: #e94560; color: #e94560; }
.speaker-filters button.active { background: #e94560; border-color: #e94560; color: #fff; }
.container { max-width: 900px; margin: 0 auto; padding: 20px 24px 100px; }
.msg { display: flex; gap: 12px; padding: 12px 16px; margin: 4px 0; border-radius: 10px; cursor: pointer; transition: all 0.15s; border-left: 3px solid transparent; align-items: flex-start; }
.msg:hover { background: #16213e60; }
.msg.playing { background: #0f346040; border-left-color: #e94560; box-shadow: 0 0 20px #e9456020; }
.msg.filtered { display: none; }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em; flex-shrink: 0; color: #fff; }
.msg-body { flex: 1; min-width: 0; }
.msg-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.msg-name { font-weight: 600; font-size: 0.95em; }
.msg-time { font-size: 0.75em; color: #666; }
.msg-text { line-height: 1.7; color: #ccc; font-size: 0.95em; word-break: break-word; }
.msg-index { font-size: 0.7em; color: #555; flex-shrink: 0; margin-top: 2px; min-width: 24px; text-align: right; }
.player-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #16213e; border-top: 1px solid #0f3460; padding: 12px 24px; display: flex; align-items: center; gap: 16px; z-index: 200; transform: translateY(100%); transition: transform 0.3s; }
.player-bar.show { transform: translateY(0); }
.player-bar .playing-info { flex: 1; min-width: 0; }
.player-bar .playing-name { font-weight: 600; color: #e94560; font-size: 0.9em; }
.player-bar .playing-text { color: #aaa; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player-bar button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9em; transition: all 0.2s; }
.btn-stop { background: #e94560; color: #fff; }
.btn-stop:hover { background: #c73a52; }
.btn-prev, .btn-next { background: #0f3460; color: #ccc; }
.btn-prev:hover, .btn-next:hover { background: #1a4a80; }
.speed-select { background: #0f3460; color: #ccc; border: 1px solid #1a4a80; padding: 6px 10px; border-radius: 6px; font-size: 0.85em; cursor: pointer; }
</style>
</head>
<body>
<div class="header">
<h1>📋 ${escHtml(baseName)} 会议记录</h1>
<span class="info">共 ${records.length} 段对话 · ${speakers.length} 位发言人</span>
</div>
<div class="speaker-filters" id="filters">${filterButtons}</div>
<div class="container" id="messages">${messagesHTML}</div>
<div class="player-bar" id="playerBar">
<div class="playing-info"><div class="playing-name" id="playingName"></div><div class="playing-text" id="playingText"></div></div>
<select class="speed-select" id="speedSelect">
<option value="0.5">0.5x</option>
<option value="0.75">0.75x</option>
<option value="1">1x</option>
<option value="1.25">1.25x</option>
<option value="1.5">1.5x</option>
<option value="2" selected>2x</option>
</select>
<button class="btn-prev" onclick="playPrev()" title="上一段 (←)">◀</button>
<button class="btn-stop" onclick="stopPlay()">⏹ 停止</button>
<button class="btn-next" onclick="playNext()" title="下一段 (→)">▶</button>
</div>
<script>
var SPEECH_DATA = ${JSON.stringify(speechData)};

var currentIdx = -1;
var utterance = null;
var speed = 2;
var currentFilter = 'all';

document.getElementById('speedSelect').onchange = function() { speed = parseFloat(this.value); };

function filter(speaker, btn) {
  currentFilter = speaker;
  var buttons = document.querySelectorAll('#filters button');
  for (var i = 0; i < buttons.length; i++) { buttons[i].classList.remove('active'); }
  if (btn) btn.classList.add('active');
  var msgs = document.querySelectorAll('.msg');
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    if (speaker === 'all' || m.getAttribute('data-speaker') === speaker) {
      m.classList.remove('filtered');
    } else {
      m.classList.add('filtered');
    }
  }
}

function playAt(idx) {
  stopPlay();
  currentIdx = idx;
  var d = SPEECH_DATA[idx];
  utterance = new SpeechSynthesisUtterance(d.text);
  utterance.lang = 'zh-CN';
  utterance.rate = speed;
  utterance.onstart = function() {
    updateUI(idx);
    document.getElementById('playerBar').classList.add('show');
  };
  utterance.onend = function() {
    stopPlay();
  };
  utterance.onerror = function(e) {
    if (e.error !== 'interrupted') {
      stopPlay();
    }
  };
  speechSynthesis.speak(utterance);
}

function getVisibleIndices() {
  var result = [];
  var msgs = document.querySelectorAll('.msg:not(.filtered)');
  for (var i = 0; i < msgs.length; i++) {
    result.push(parseInt(msgs[i].getAttribute('data-index')));
  }
  return result;
}

function stopPlay() {
  speechSynthesis.cancel();
  utterance = null;
  currentIdx = -1;
  updateUI(-1);
  document.getElementById('playerBar').classList.remove('show');
}

function playNext() {
  var filtered = getVisibleIndices();
  if (filtered.length === 0) return;
  var pos = currentIdx >= 0 ? filtered.indexOf(currentIdx) : -1;
  if (pos >= 0 && pos < filtered.length - 1) {
    playAt(filtered[pos + 1]);
  } else {
    playAt(filtered[0]);
  }
}

function playPrev() {
  var filtered = getVisibleIndices();
  if (filtered.length === 0) return;
  var pos = currentIdx >= 0 ? filtered.indexOf(currentIdx) : -1;
  if (pos > 0) {
    playAt(filtered[pos - 1]);
  } else {
    playAt(filtered[filtered.length - 1]);
  }
}

function updateUI(idx) {
  var playing = document.querySelectorAll('.msg.playing');
  for (var i = 0; i < playing.length; i++) { playing[i].classList.remove('playing'); }
  if (idx >= 0) {
    var el = document.getElementById('msg-' + idx);
    if (el) { el.classList.add('playing'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    document.getElementById('playingName').textContent = SPEECH_DATA[idx].name;
    document.getElementById('playingText').textContent = SPEECH_DATA[idx].text;
  }
}

document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); if (currentIdx >= 0) { stopPlay(); } else { var v = getVisibleIndices(); if (v.length) playAt(v[0]); } }
  if (e.code === 'ArrowRight') { e.preventDefault(); playNext(); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); }
});
</script>
</body>
</html>`;
}

module.exports = { generateHTML };
