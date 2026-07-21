/**
 * Meeting TTS Player — 渲染进程核心逻辑
 * 从 generate-player.cjs 适配为 Electron 渲染进程
 */

// === 调色板 ===
var PALETTE = ['#e94560', '#0f3460', '#533483', '#e23e57', '#1a508b', '#6a4c93', '#c73a52', '#2d6baa', '#8b5cf6', '#f06292'];

// === 状态 ===
var currentData = null;       // 归一化后的段落数组
var currentFileName = null;   // 文件名（用于标题和导出）
var speakers = [];            // 发言人列表
var speakerColor = {};        // 发言人 -> 颜色映射
var currentIdx = -1;          // 当前播放索引
var utterance = null;         // 当前 SpeechSynthesisUtterance
var speed = 2;                // 语速
var currentFilter = 'all';    // 当前筛选

// === DOM 引用 ===
var elMessages, elFilters, elPlayerBar, elEmptyState, elErrorToast;
var elPlayingName, elPlayingText, elHeaderTitle, elHeaderStats;
var elBtnOpen, elBtnExport, elSpeedSelect, elBtnPrev, elBtnStop, elBtnNext;
var elDropOverlay;

// === 工具函数 ===
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtTime(ms) {
  var t = parseInt(ms) / 1000;
  var m = Math.floor(t / 60);
  var s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// === 初始化 ===
function init() {
  // 缓存 DOM 引用
  elMessages = document.getElementById('messages');
  elFilters = document.getElementById('filters');
  elPlayerBar = document.getElementById('playerBar');
  elEmptyState = document.getElementById('emptyState');
  elErrorToast = document.getElementById('errorToast');
  elPlayingName = document.getElementById('playingName');
  elPlayingText = document.getElementById('playingText');
  elHeaderTitle = document.getElementById('headerTitle');
  elHeaderStats = document.getElementById('headerStats');
  elBtnOpen = document.getElementById('btnOpenFile');
  elBtnExport = document.getElementById('btnExport');
  elSpeedSelect = document.getElementById('speedSelect');
  elBtnPrev = document.getElementById('btnPrev');
  elBtnStop = document.getElementById('btnStop');
  elBtnNext = document.getElementById('btnNext');
  elDropOverlay = document.getElementById('dropOverlay');

  // 事件绑定
  elBtnOpen.addEventListener('click', openFile);
  elBtnExport.addEventListener('click', exportHTML);
  elSpeedSelect.addEventListener('change', function() { speed = parseFloat(elSpeedSelect.value); });
  elBtnPrev.addEventListener('click', playPrev);
  elBtnStop.addEventListener('click', stopPlay);
  elBtnNext.addEventListener('click', playNext);
  document.addEventListener('keydown', handleKeyboard);

  // 菜单事件
  if (window.electronAPI) {
    window.electronAPI.onMenuOpenFile(function() { openFile(); });
    window.electronAPI.onMenuExportHTML(function() { exportHTML(); });
    window.electronAPI.onMenuOpenFileRecent(function(filePath) { openFileByPath(filePath); });
  }

  // 拖放
  setupDragDrop();

  // 预热语音引擎
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); };
  }
}

// === 文件加载 ===
async function openFile() {
  if (!window.electronAPI) { showError('Electron API 不可用'); return; }
  var result = await window.electronAPI.openFile();
  if (!result.success) {
    if (result.error !== 'canceled') {
      showError(result.error);
    }
    return;
  }
  loadData(result.data, result.speakers, result.fileName);
}

async function openFileByPath(filePath) {
  if (!window.electronAPI) { showError('Electron API 不可用'); return; }
  var result = await window.electronAPI.openFileByPath(filePath);
  if (!result.success) {
    showError(result.error);
    return;
  }
  loadData(result.data, result.speakers, result.fileName);
}

function loadData(data, speakerList, fileName) {
  stopPlay();
  currentData = data;
  currentFileName = fileName;
  speakers = speakerList;

  // 分配颜色
  speakerColor = {};
  speakers.forEach(function(s, i) {
    speakerColor[s] = PALETTE[i % PALETTE.length];
  });

  // 重置状态
  currentFilter = 'all';

  // 渲染
  renderMessages();
  renderFilters();
  updateHeader();

  // 更新窗口标题
  document.title = fileName + ' - Meeting TTS Player';
  elHeaderTitle.textContent = fileName;

  // 隐藏空状态
  elEmptyState.classList.add('hidden');
  elBtnExport.disabled = false;

  // 通知主进程数据已加载（用于菜单状态）
  if (window.electronAPI) {
    window.electronAPI.notifyDataState(true);
  }

  // 滚动到顶部
  elMessages.scrollTop = 0;
}

// === 渲染消息列表 ===
function renderMessages() {
  var html = '';
  currentData.forEach(function(p) {
    var color = speakerColor[p.name];
    html += '<div class="msg" data-speaker="' + escHtml(p.name) + '" data-index="' + p.i + '" id="msg-' + p.i + '" onclick="playAt(' + p.i + ')">' +
      '<div class="avatar" style="background:' + color + '">' + escHtml(p.name[0] || '?') + '</div>' +
      '<div class="msg-body">' +
        '<div class="msg-header"><span class="msg-name">' + escHtml(p.name) + '</span><span class="msg-time">' + fmtTime(p.start) + '</span></div>' +
        '<div class="msg-text">' + escHtml(p.text) + '</div>' +
      '</div>' +
      '<div class="msg-index">#' + (p.i + 1) + '</div>' +
    '</div>';
  });
  elMessages.innerHTML = html;
}

// === 渲染筛选按钮 ===
function renderFilters() {
  var html = '<button class="active" data-speaker="all" onclick="filter(\'all\', this)">全部 (' + currentData.length + ')</button>';
  speakers.forEach(function(s) {
    var count = currentData.filter(function(p) { return p.name === s; }).length;
    html += '<button data-speaker="' + escHtml(s) + '" onclick="filter(\'' + escHtml(s) + '\', this)">' + escHtml(s) + ' (' + count + ')</button>';
  });
  elFilters.innerHTML = html;
}

// === 更新顶部统计 ===
function updateHeader() {
  elHeaderStats.textContent = '共 ' + currentData.length + ' 段对话 · ' + speakers.length + ' 位发言人';
}

// === 筛选 ===
function filter(speaker, btn) {
  currentFilter = speaker;
  var buttons = document.querySelectorAll('#filters button');
  for (var i = 0; i < buttons.length; i++) { buttons[i].classList.remove('active'); }
  if (btn) btn.classList.add('active');
  var msgs = document.querySelectorAll('.msg');
  for (var j = 0; j < msgs.length; j++) {
    var m = msgs[j];
    if (speaker === 'all' || m.getAttribute('data-speaker') === speaker) {
      m.classList.remove('filtered');
    } else {
      m.classList.add('filtered');
    }
  }
}

// === TTS 播放 ===
function playAt(idx) {
  stopPlay();
  if (!currentData || idx < 0 || idx >= currentData.length) return;

  currentIdx = idx;
  var d = currentData[idx];

  utterance = new SpeechSynthesisUtterance(d.text);
  utterance.lang = 'zh-CN';
  utterance.rate = speed;

  utterance.onstart = function() {
    updateUI(idx);
    elPlayerBar.classList.add('show');
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
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
  utterance = null;
  currentIdx = -1;
  updateUI(-1);
  elPlayerBar.classList.remove('show');
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
    if (currentData && currentData[idx]) {
      elPlayingName.textContent = currentData[idx].name;
      elPlayingText.textContent = currentData[idx].text;
    }
  }
}

// === 键盘快捷键 ===
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (currentIdx >= 0) { stopPlay(); }
    else { var v = getVisibleIndices(); if (v.length) playAt(v[0]); }
  }
  if (e.code === 'ArrowRight') { e.preventDefault(); playNext(); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); }
}

// === 导出 HTML ===
async function exportHTML() {
  if (!currentData) { showError('请先打开一个会议文件'); return; }
  if (!window.electronAPI) { showError('Electron API 不可用'); return; }

  var result = await window.electronAPI.exportHTML({
    records: currentData,
    speakers: speakers,
    fileName: currentFileName,
    speed: speed
  });

  if (result.success) {
    showNotification('已导出到: ' + result.savedPath);
  } else if (result.error !== 'canceled') {
    showError(result.error);
  }
}

// === 拖放 ===
function setupDragDrop() {
  var dragCounter = 0;

  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (dragCounter === 1) {
      elDropOverlay.classList.add('visible');
    }
  });

  document.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      elDropOverlay.classList.remove('visible');
    }
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    elDropOverlay.classList.remove('visible');

    var file = e.dataTransfer.files[0];
    if (file && file.path) {
      openFileByPath(file.path);
    }
  });
}

// === 错误与通知 ===
function showError(msg) {
  elErrorToast.textContent = msg;
  elErrorToast.classList.add('show');
  clearTimeout(elErrorToast._timeout);
  elErrorToast._timeout = setTimeout(function() {
    elErrorToast.classList.remove('show');
  }, 4000);
}

function showNotification(msg) {
  // 复用错误提示元素作为通知
  var toast = document.createElement('div');
  toast.className = 'notification-toast show';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { document.body.removeChild(toast); }, 300);
  }, 3000);
}

// === 启动 ===
init();
