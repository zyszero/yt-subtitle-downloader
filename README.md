# YouTube 字幕下载器

一个功能强大的 Chrome 浏览器扩展，用于下载 YouTube 视频字幕，支持单语、双语字幕下载和 LLM 智能优化。

## ✨ 主要功能

### 📥 字幕下载
- **多语言支持**：自动检测并支持所有可用字幕语言
- **多种格式**：支持 SRT、WebVTT、纯文本、JSON 等格式
- **双语字幕**：可同时下载原始语言和翻译语言的双语字幕
- **批量处理**：支持批量下载多个字幕文件

### 🤖 LLM 智能优化
- **多平台支持**：集成 OpenAI 和 Anthropic API
- **智能优化**：使用大语言模型优化字幕文本质量
- **翻译功能**：支持将字幕翻译为多种语言
- **自定义配置**：用户可配置不同的模型和参数

### 🎛️ 用户界面
- **侧边栏面板**：在 YouTube 页面侧边栏中直接操作
- **弹出窗口**：快速访问和基本设置
- **实时预览**：下载前可预览字幕内容
- **状态监控**：实时显示下载和处理状态

## 🚀 安装方法

### 开发者安装
1. 克隆或下载本项目
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

### 正式安装
等待扩展上架 Chrome Web Store

## 📖 使用方法

### 基本使用
1. 打开 YouTube 视频页面
2. 点击扩展图标打开弹出窗口
3. 点击"打开侧边栏"进入完整功能界面
4. 选择字幕语言和输出格式
5. 点击"下载字幕"按钮

### 双语字幕
1. 在侧边栏中启用"双语模式"
2. 选择翻译语言
3. 下载时会自动合并两种语言

### LLM 优化
1. 在侧边栏中选择 LLM 提供商（OpenAI 或 Anthropic）
2. 输入 API 密钥并配置参数
3. 点击"测试连接"确保配置正确
4. 下载字幕后启用优化功能
5. 点击"优化字幕"进行智能处理

## ⚙️ 配置说明

### 基本设置
- **默认格式**：设置默认的字幕输出格式
- **默认语言**：设置首选的字幕语言
- **自动下载**：是否在检测到字幕时自动下载
- **双语模式**：是否默认启用双语字幕

### LLM 配置
- **OpenAI 配置**：
  - API Key：OpenAI API 密钥
  - 模型：GPT-3.5-turbo、GPT-4 等
  - 服务地址：默认为 https://api.openai.com/v1

- **Anthropic 配置**：
  - API Key：Anthropic API 密钥
  - 模型：Claude 3 系列模型
  - 服务地址：默认为 https://api.anthropic.com

## 📁 文件结构

```
transcript/
├── manifest.json              # 扩展配置文件
├── README.md                  # 项目说明文档
├── generate_icons.py          # 图标生成脚本
├── icons/                     # 图标资源
│   ├── icon.svg              # SVG 源文件
│   ├── icon16.png            # 16x16 图标
│   ├── icon32.png            # 32x32 图标
│   ├── icon48.png            # 48x48 图标
│   └── icon128.png           # 128x128 图标
└── src/                      # 源代码
    ├── content.js            # 内容脚本
    ├── background.js         # 后台脚本
    ├── utils/                # 工具函数
    │   ├── subtitle-parser.js    # 字幕解析
    │   ├── format-converter.js   # 格式转换
    │   └── llm-client.js         # LLM 客户端
    ├── popup/                # 弹出窗口
    │   ├── popup.html
    │   ├── popup.js
    │   └── popup.css
    └── sidepanel/            # 侧边栏
        ├── panel.html
        ├── panel.js
        └── panel.css
```

## 🔧 技术实现

### 核心技术
- **Manifest V3**：使用最新的 Chrome 扩展架构
- **ES6 Modules**：模块化的代码组织
- **异步处理**：Promise 和 async/await 的异步操作
- **Chrome API**：充分利用浏览器扩展 API

### 字幕获取
- **页面解析**：直接解析 YouTube 页面数据
- **正则表达式**：提取 ytInitialPlayerResponse
- **XML 解析**：解析字幕 XML 文件
- **错误处理**：重试机制和备用方案

### 格式支持
- **SRT**：SubRip 字幕格式
- **WebVTT**：Web 视频文本轨道格式
- **LRC**：歌词格式
- **纯文本**：带/不带时间戳的文本
- **JSON**：结构化数据格式

## 🛠️ 开发说明

### 环境要求
- Chrome 浏览器（版本 88+）
- Python 3.x（用于生成图标）
- 基本的 Web 开发知识

### 构建步骤
1. 生成图标文件：
   ```bash
   python generate_icons.py
   ```

2. 加载扩展：
   - 打开 Chrome 扩展管理页面
   - 启用开发者模式
   - 加载项目文件夹

### 调试方法
- 使用 Chrome 开发者工具调试内容脚本
- 使用扩展管理页面查看后台脚本日志
- 使用控制台输出进行问题诊断

## 🔒 隐私和安全

### 数据安全
- **本地处理**：所有字幕处理在本地完成
- **API 密钥**：安全存储在 Chrome 扩展存储中
- **无追踪**：不收集用户数据和使用行为

### 权限说明
- `storage`：存储用户设置和配置
- `sidePanel`：显示侧边栏界面
- `tabs`：获取当前标签页信息
- `scripting`：注入内容脚本
- `downloads`：下载字幕文件
- `activeTab`：访问当前活动标签页

## 🤝 贡献指南

欢迎提交问题和功能请求！

### 开发流程
1. Fork 本项目
2. 创建功能分支
3. 提交代码更改
4. 创建 Pull Request

### 代码规范
- 使用 ES6+ 语法
- 添加适当的注释
- 遵循现有的代码风格
- 确保功能完整性

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- YouTube 字幕 API 的逆向工程
- OpenAI 和 Anthropic 提供的 AI 服务
- Chrome 扩展开发社区

## 📞 联系方式

- 问题反馈：[GitHub Issues](https://github.com/example/youtube-subtitle-downloader/issues)
- 功能请求：[GitHub Discussions](https://github.com/example/youtube-subtitle-downloader/discussions)

---

**免责声明**：本工具仅供个人学习和研究使用，使用时请遵守相关法律法规和 YouTube 服务条款。# yt-subtitle-downloader
