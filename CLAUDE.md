# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 Chrome 扩展程序，用于下载 YouTube 视频字幕。该扩展支持多语言字幕下载、双语字幕、格式转换和 LLM 智能优化功能。

## 架构设计

### 核心组件

1. **Manifest V3 扩展架构**
   - `manifest.json`: 扩展配置文件
   - `src/background.js`: Service Worker，处理后台逻辑和消息传递
   - `src/content.js`: 内容脚本，注入到 YouTube 页面提取字幕数据
   - `src/popup/`: 弹出窗口界面
   - `src/sidepanel/`: 侧边栏主界面

2. **工具模块** (`src/utils/`)
   - `subtitle-parser.js`: YouTube 页面数据解析和字幕获取
   - `format-converter.js`: 字幕格式转换 (SRT, WebVTT 等)
   - `llm-client.js`: LLM 客户端，支持 OpenAI 和 Anthropic API

### 关键技术实现

- **页面数据提取**: 通过正则表达式从 YouTube 页面解析 `ytInitialPlayerResponse`
- **字幕获取**: 从解析的播放器数据中提取字幕轨道 URL，支持备用服务
- **格式转换**: 解析 YouTube XML 字幕格式并转换为 SRT、WebVTT 等标准格式
- **消息传递**: 使用 Chrome 扩展 API 在 background、content 和 sidepanel 之间通信

## 开发工作流

### 测试扩展
```bash
# 1. 生成图标文件
python generate_icons.py

# 2. 在 Chrome 中加载扩展
# - 打开 chrome://extensions/
# - 启用开发者模式
# - 点击"加载已解压的扩展程序"
# - 选择项目根目录
```

### 调试方法
- **内容脚本调试**: 在 YouTube 页面使用 DevTools Console
- **后台脚本调试**: 在 chrome://extensions/ 中点击"service worker"链接
- **侧边栏调试**: 右键侧边栏选择"检查"

### 重要的调试入口
- `window.youTubeSubtitleDownloader`: 内容脚本实例 (YouTube 页面控制台)
- `window.backgroundService`: 后台服务实例 (Service Worker 控制台)
- `window.sidePanelController`: 侧边栏控制器实例 (侧边栏控制台)

## 核心功能实现

### 字幕数据提取流程
1. 内容脚本监听 YouTube 页面导航变化
2. 从页面脚本中提取 `ytInitialPlayerResponse` 播放器数据
3. 解析字幕轨道信息 (`captions.playerCaptionsTracklistRenderer.captionTracks`)
4. 构建字幕下载 URL，支持原始字幕和翻译字幕
5. 获取 XML 格式字幕并解析为结构化数据

### 关键正则表达式
```javascript
// 提取播放器响应数据
const PLAYER_RESPONSE_REGEX = /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/
```

### 消息传递模式
- `background.js ↔ content.js`: 获取视频信息、字幕轨道、下载字幕
- `background.js ↔ sidepanel.js`: LLM 配置管理、优化处理、状态同步
- `sidepanel.js → background.js → content.js`: 用户操作传递

## 文件结构关键点

- `icons/`: 扩展图标文件 (通过 `generate_icons.py` 生成)
- `src/popup/`: 扩展弹出窗口 (简单界面)
- `src/sidepanel/`: 主要用户界面 (完整功能)
- `src/utils/`: 核心功能模块 (可在多个组件中复用)

## 开发注意事项

### Manifest V3 特点
- 使用 Service Worker 替代 background page
- 所有模块必须使用 ES6 模块语法 (`import/export`)
- 动态代码注入需要在 `web_accessible_resources` 中声明

### 错误处理策略
- 网络请求失败时自动重试机制
- 支持备用字幕服务 URL
- 页面数据解析失败时的降级处理

### 权限要求
- `storage`: 保存用户设置和 LLM 配置
- `sidePanel`: 显示主界面
- `tabs` + `activeTab`: 获取当前页面信息
- `scripting`: 注入内容脚本
- `downloads`: 下载字幕文件

### LLM 集成
- 支持 OpenAI 和 Anthropic API
- 配置存储在 Chrome 扩展存储中
- 字幕优化和翻译功能
- 使用统计和错误监控