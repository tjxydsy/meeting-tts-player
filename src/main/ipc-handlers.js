const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { parseMeetingJSON } = require('./json-parser');
const { generateHTML } = require('../export/html-template');
const { addRecentFile } = require('./menu');

let mainWindow = null;

function registerIpcHandlers(win) {
  mainWindow = win;

  // === 打开文件（显示对话框） ===
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '打开会议 JSON 文件',
      filters: [
        { name: 'JSON 文件', extensions: ['json', 'txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'canceled' };
    }

    return loadFileData(result.filePaths[0]);
  });

  // === 通过路径打开文件（拖放、最近文件） ===
  ipcMain.handle('dialog:openFileByPath', async (_event, filePath) => {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: '无效的文件路径' };
    }
    return loadFileData(filePath);
  });

  // === 导出 HTML ===
  ipcMain.handle('export:html', async (_event, params) => {
    try {
      const { records, speakers, fileName } = params;
      const baseName = fileName ? path.basename(fileName, path.extname(fileName)) : 'meeting';
      const suggestedName = baseName + '.html';

      const result = await dialog.showSaveDialog(mainWindow, {
        title: '导出 HTML 播放器',
        defaultPath: suggestedName,
        filters: [
          { name: 'HTML 文件', extensions: ['html'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'canceled' };
      }

      const html = generateHTML({ records, speakers, baseName });
      fs.writeFileSync(result.filePath, html, 'utf8');

      const fileSizeKB = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
      console.log('✅ 已导出:', result.filePath);
      console.log('   文件大小:', fileSizeKB, 'KB');
      console.log('   对话段落:', records.length);
      console.log('   发言人:', speakers.join(', '));

      return { success: true, savedPath: result.filePath };
    } catch (e) {
      return { success: false, error: '导出失败: ' + e.message };
    }
  });

  // === 获取版本 ===
  ipcMain.handle('app:getVersion', () => {
    return { version: require('../../package.json').version };
  });

  // === 数据状态变化（用于菜单） ===
  ipcMain.on('app:data-state-changed', (_event, hasData) => {
    // 可用于动态启用/禁用菜单项（当前菜单不变，预留扩展）
    // hasData: boolean
  });
}

function loadFileData(filePath) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在: ' + filePath };
    }

    const raw = fs.readFileSync(filePath, 'utf8');

    if (!raw || raw.trim().length === 0) {
      return { success: false, error: '文件为空' };
    }

    const { records, speakers } = parseMeetingJSON(raw);

    if (!records || records.length === 0) {
      return { success: false, error: '文件中没有有效的对话数据' };
    }

    // 添加最近文件
    addRecentFile(filePath);

    return {
      success: true,
      data: records,
      speakers: speakers,
      fileName: path.basename(filePath),
      filePath: filePath,
      totalCount: records.length,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { registerIpcHandlers };
