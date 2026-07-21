/**
 * JSON 会议记录解析器 — 支持多种结构自动检测
 * 从 generate-player.cjs 移植
 */

function parseMeetingJSON(rawString) {
  let data;
  try {
    data = JSON.parse(rawString);
  } catch (e) {
    throw new Error('JSON 解析失败: ' + e.message);
  }

  // 自动检测 4 种 JSON 结构
  let paragraphList = null;

  if (data.conferences_queryConferencesTextsNew_response && data.conferences_queryConferencesTextsNew_response.paragraphList) {
    paragraphList = data.conferences_queryConferencesTextsNew_response.paragraphList;
  } else if (Array.isArray(data.paragraphList)) {
    paragraphList = data.paragraphList;
  } else if (data.data && Array.isArray(data.data.paragraphList)) {
    paragraphList = data.data.paragraphList;
  } else if (Array.isArray(data)) {
    paragraphList = data;
  }

  if (!paragraphList || paragraphList.length === 0) {
    throw new Error(
      '未找到有效的 paragraphList 数据。支持的 JSON 结构:\n' +
      '  1. { conferences_queryConferencesTextsNew_response: { paragraphList: [...] } }\n' +
      '  2. { paragraphList: [...] }\n' +
      '  3. { data: { paragraphList: [...] } }\n' +
      '  4. [...] (直接数组)'
    );
  }

  // 归一化记录
  const records = paragraphList.map((p, i) => ({
    i: i,
    name: p.name || '未知',
    text: p.paragraph || '',
    start: p.startTime || '0',
    end: p.endTime || '0',
  }));

  // 提取发言人
  const speakers = [...new Set(records.map(r => r.name))];

  return { records, speakers };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtTime(ms) {
  const t = parseInt(ms) / 1000;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}

module.exports = { parseMeetingJSON, escHtml, fmtTime };
