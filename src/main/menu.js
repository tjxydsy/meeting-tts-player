const { Menu, app } = require('electron');

let mainWindow = null;
let recentFiles = [];
const MAX_RECENT = 10;

function buildMenu(win) {
  mainWindow = win;
  updateMenu();
}

function updateMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开 JSON...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu:open-file');
          },
        },
        {
          label: '导出为 HTML...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu:export-html');
          },
        },
        { type: 'separator' },
        ...buildRecentFilesMenu(),
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          },
        },
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reload();
          },
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Meeting TTS Player',
              message: 'Meeting TTS Player v' + app.getVersion(),
              detail: '将会议对话 JSON 转换为可朗读的播放器。\n使用浏览器内置 Web Speech API，无需联网。\n\n快捷键:\n  空格: 播放/停止\n  ← →: 上/下一段\n  Ctrl+O: 打开文件\n  Ctrl+S: 导出 HTML',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function buildRecentFilesMenu() {
  if (recentFiles.length === 0) {
    return [
      {
        label: '最近文件 (无)',
        enabled: false,
      },
    ];
  }
  return recentFiles.map((filePath, i) => ({
    label: `${i + 1}. ${filePath}`,
    click: () => {
      // Send the path to renderer to load
      if (mainWindow) mainWindow.webContents.send('menu:open-file-recent', filePath);
    },
  }));
}

function addRecentFile(filePath) {
  // 去重：移除已存在的相同路径
  recentFiles = recentFiles.filter(f => f !== filePath);
  // 添加到开头
  recentFiles.unshift(filePath);
  // 限制数量
  if (recentFiles.length > MAX_RECENT) {
    recentFiles = recentFiles.slice(0, MAX_RECENT);
  }
  // 更新菜单
  updateMenu();
}

module.exports = { buildMenu, addRecentFile };
