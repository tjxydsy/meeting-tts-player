# Meeting TTS Player（会议语音播放器）

> 打开 JSON 会议记录，点击就能朗读 — 桌面端 Electron 应用

## 这是什么

一个桌面工具，把会议对话 JSON 文件变成可播放的语音。导入会议记录后，点击任意一段对话即可用浏览器内置的语音合成引擎朗读出来，支持按发言人筛选、倍速播放、导出为独立 HTML 文件。

## 功能

- 🎙️ **点击朗读** — 点哪段读哪段，或从头连续播放
- 👤 **发言人筛选** — 只看/只播特定人的发言
- ⚡ **倍速播放** — 0.5x / 1x / 1.5x / 2x
- ⌨️ **键盘快捷键** — 空格播放/停止，左右箭头切换段落
- 📦 **独立 HTML 导出** — 导出为可在任何浏览器打开的单个 HTML 文件，方便分享
- 🌙 **深色主题** — 护眼暗色界面
- 🔍 **自动识别 JSON 结构** — 支持 4 种常见格式，拖进去就能用

## 快速开始

### 方式一：下载安装包（推荐）

从 [Releases](https://github.com/tjxydsy/meeting-tts-player/releases) 下载 `Meeting TTS Player-1.0.0-Setup.exe`，双击安装即可。

### 方式二：开发模式运行

```bash
# 安装依赖
npm install

# 启动应用
npm start

# 开发模式（带 DevTools）
npm run dev
```

**要求：** Node.js >= 18.0.0

## 使用方法

1. 打开应用，点击 **「打开文件」** 或直接拖拽 JSON 文件到窗口
2. 文件解析成功后，对话列表自动展示
3. 点击任意一条消息开始朗读
4. 底部工具栏可控制播放/暂停、切换段落、调整语速
5. 顶部筛选栏可按发言人过滤
6. 点击 **「导出 HTML」** 生成独立播放文件

## 支持的 JSON 格式

自动识别以下 4 种结构，无需手动选择：

```json
// 格式 1：简单数组
[
  { "paragraph": "会议内容", "name": "张三", "startTime": 0, "endTime": 12000 }
]

// 格式 2：paragraphList 包装
{ "paragraphList": [...] }

// 格式 3：data 嵌套
{ "data": { "paragraphList": [...] } }

// 格式 4：conferences 接口响应
{ "conferences_queryConferencesTextsNew_response": { "paragraphList": [...] } }
```

每条记录字段说明：

| 字段 | 必须 | 说明 |
|------|------|------|
| `paragraph` | ✅ | 发言内容 |
| `name` | ✅ | 发言人姓名 |
| `startTime` | - | 开始时间（毫秒） |
| `endTime` | - | 结束时间（毫秒） |

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `空格` | 播放 / 暂停 |
| `→` | 下一段 |
| `←` | 上一段 |
| `Esc` | 停止播放 |

## 技术栈

- **框架：** Electron 33
- **语音引擎：** Web Speech API（SpeechSynthesis + zh-CN）
- **构建工具：** electron-builder
- **平台：** Windows (x64)

## 构建

```bash
# 构建 Windows 安装包 + zip
npm run build

# 仅构建解压版（调试用）
npm run build:dir
```

构建输出在 `dist/` 目录下。

## 项目结构

```
src/
├── main/              # Electron 主进程
│   ├── main.js        # 窗口创建
│   ├── menu.js        # 应用菜单 + 最近文件
│   ├── ipc-handlers.js # 文件读写 IPC
│   └── json-parser.js  # JSON 解析器（4 种结构自动检测）
├── renderer/           # 渲染进程 UI
│   ├── index.html      # 主页面
│   ├── player.js       # 播放核心逻辑
│   ├── styles.css      # 样式
│   └── preload.js      # 预加载脚本
├── export/
│   └── html-template.js # 独立 HTML 导出模板
└── shared/
    └── constants.js     # 共享常量（调色板、语速等）
```

## License

MIT
