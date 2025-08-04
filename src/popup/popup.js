/**
 * YouTube字幕下载器弹出窗口脚本
 */

class PopupController {
    constructor() {
        this.currentTab = null;
        this.pageState = null;
        this.stats = {
            totalDownloads: 0,
            totalVideos: 0,
            successRate: 100
        };
        
        this.init();
    }

    /**
     * 初始化
     */
    async init() {
        // 设置事件监听器
        this.setupEventListeners();
        
        // 获取当前标签页
        await this.getCurrentTab();
        
        // 加载设置
        await this.loadSettings();
        
        // 加载统计信息
        await this.loadStats();
        
        // 检查页面状态
        await this.checkPageState();
        
        console.log('弹出窗口初始化完成');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 打开侧边栏按钮
        document.getElementById('openSidePanelBtn').addEventListener('click', () => {
            this.onOpenSidePanel();
        });

        // 快速下载按钮
        document.getElementById('downloadCurrentBtn').addEventListener('click', () => {
            this.onQuickDownload();
        });

        // 设置变更
        document.getElementById('defaultFormat').addEventListener('change', (e) => {
            this.onSettingChange('defaultFormat', e.target.value);
        });

        document.getElementById('defaultLanguage').addEventListener('change', (e) => {
            this.onSettingChange('defaultLanguage', e.target.value);
        });

        document.getElementById('autoDownload').addEventListener('change', (e) => {
            this.onSettingChange('autoDownload', e.target.checked);
        });

        document.getElementById('bilingualMode').addEventListener('change', (e) => {
            this.onSettingChange('bilingualMode', e.target.checked);
        });

        // 快速链接
        document.getElementById('settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.onOpenSettings();
        });

        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.onOpenHelp();
        });

        document.getElementById('feedbackLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.onOpenFeedback();
        });

        document.getElementById('aboutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.onOpenAbout();
        });
    }

    /**
     * 获取当前标签页
     */
    async getCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                this.currentTab = tabs[0];
            }
        } catch (error) {
            console.error('获取当前标签页失败:', error);
        }
    }

    /**
     * 检查页面状态
     */
    async checkPageState() {
        const pageDetails = document.getElementById('pageDetails');
        const pageStatus = document.getElementById('pageStatus');
        
        if (!this.currentTab) {
            pageStatus.textContent = '无法获取当前页面';
            this.updateStatus('页面错误', 'error');
            return;
        }

        if (!this.currentTab.url?.includes('youtube.com/watch')) {
            pageStatus.textContent = '当前不是YouTube视频页面';
            this.updateStatus('非YouTube页面', 'warning');
            document.getElementById('downloadCurrentBtn').disabled = true;
            return;
        }

        try {
            pageStatus.textContent = '正在检查视频信息...';
            
            // 获取页面状态
            const response = await this.sendMessageToBackground({
                action: 'getPageState'
            });

            if (response.success) {
                this.pageState = response.data;
                this.displayPageInfo();
                this.updateStatus('准备就绪', 'ready');
                document.getElementById('downloadCurrentBtn').disabled = !this.pageState.hasCaptions;
            } else {
                pageStatus.textContent = '无法获取页面信息';
                this.updateStatus('页面错误', 'error');
                document.getElementById('downloadCurrentBtn').disabled = true;
            }
        } catch (error) {
            console.error('检查页面状态失败:', error);
            pageStatus.textContent = '检查页面状态失败';
            this.updateStatus('检查失败', 'error');
            document.getElementById('downloadCurrentBtn').disabled = true;
        }
    }

    /**
     * 显示页面信息
     */
    async displayPageInfo() {
        if (!this.pageState) return;

        const pageStatus = document.getElementById('pageStatus');
        const videoInfo = document.getElementById('videoInfo');
        const videoTitle = document.getElementById('videoTitle');
        const videoLang = document.getElementById('videoLang');
        const videoDuration = document.getElementById('videoDuration');

        if (this.pageState.hasCaptions) {
            pageStatus.textContent = '✓ 检测到视频字幕';
            
            // 获取详细信息
            try {
                const videoResponse = await this.sendMessageToBackground({
                    action: 'getVideoInfo'
                });

                if (videoResponse.success) {
                    const videoData = videoResponse.data;
                    
                    videoInfo.style.display = 'block';
                    videoTitle.textContent = videoData.title;
                    videoDuration.textContent = `时长: ${this.formatDuration(videoData.lengthSeconds)}`;
                    
                    // 获取语言信息
                    const langResponse = await this.sendMessageToBackground({
                        action: 'getAvailableLanguages'
                    });

                    if (langResponse.success && langResponse.data.length > 0) {
                        const languages = langResponse.data;
                        videoLang.textContent = `语言: ${languages.length}种可用`;
                    } else {
                        videoLang.textContent = '语言: 未知';
                    }
                }
            } catch (error) {
                console.error('获取视频信息失败:', error);
            }
        } else {
            pageStatus.textContent = '⚠ 视频没有字幕';
            videoInfo.style.display = 'none';
        }
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                defaultFormat: 'srt',
                defaultLanguage: 'zh',
                autoDownload: false,
                bilingualMode: false,
                showNotifications: true
            });

            // 应用设置到UI
            document.getElementById('defaultFormat').value = settings.defaultFormat;
            document.getElementById('defaultLanguage').value = settings.defaultLanguage;
            document.getElementById('autoDownload').checked = settings.autoDownload;
            document.getElementById('bilingualMode').checked = settings.bilingualMode;
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    /**
     * 加载统计信息
     */
    async loadStats() {
        try {
            const response = await this.sendMessageToBackground({
                action: 'getUsageStats'
            });

            if (response.success) {
                const stats = response.data;
                this.stats.totalDownloads = stats.totalRequests || 0;
                this.stats.totalVideos = this.stats.totalDownloads; // 简化统计
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    /**
     * 更新统计显示
     */
    updateStatsDisplay() {
        document.getElementById('totalDownloads').textContent = this.stats.totalDownloads;
        document.getElementById('totalVideos').textContent = this.stats.totalVideos;
        
        // 计算成功率（简化计算）
        const successRate = this.stats.totalDownloads > 0 ? 100 : 100;
        document.getElementById('successRate').textContent = `${successRate}%`;
    }

    /**
     * 处理打开侧边栏
     */
    async onOpenSidePanel() {
        try {
            if (this.currentTab) {
                await chrome.sidePanel.open({ tabId: this.currentTab.id });
                window.close(); // 关闭弹出窗口
            }
        } catch (error) {
            console.error('打开侧边栏失败:', error);
            this.showMessage('打开侧边栏失败', 'error');
        }
    }

    /**
     * 处理快速下载
     */
    async onQuickDownload() {
        if (!this.pageState || !this.pageState.hasCaptions) {
            this.showMessage('当前视频没有字幕', 'warning');
            return;
        }

        const format = document.getElementById('defaultFormat').value;
        const language = document.getElementById('defaultLanguage').value;
        const bilingual = document.getElementById('bilingualMode').checked;

        this.setLoadingState(true);

        try {
            const response = await this.sendMessageToBackground({
                action: 'downloadSubtitles',
                options: {
                    language,
                    format,
                    translate: bilingual,
                    translateTo: bilingual ? 'zh' : null,
                    bilingual
                }
            });

            if (response.success) {
                this.showMessage(`下载成功！${response.data.subtitleCount}条字幕`, 'success');
                this.stats.totalDownloads++;
                this.updateStatsDisplay();
            } else {
                this.showMessage(`下载失败：${response.error}`, 'error');
            }
        } catch (error) {
            console.error('快速下载失败:', error);
            this.showMessage(`下载失败：${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 处理设置变更
     */
    async onSettingChange(key, value) {
        try {
            await chrome.storage.sync.set({ [key]: value });
            this.showMessage('设置已保存', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showMessage('保存设置失败', 'error');
        }
    }

    /**
     * 处理打开设置
     */
    onOpenSettings() {
        this.openTab('src/sidepanel/panel.html');
    }

    /**
     * 处理打开帮助
     */
    onOpenHelp() {
        this.openTab('https://github.com/example/youtube-subtitle-downloader/wiki');
    }

    /**
     * 处理打开反馈
     */
    onOpenFeedback() {
        this.openTab('https://github.com/example/youtube-subtitle-downloader/issues');
    }

    /**
     * 处理打开关于
     */
    onOpenAbout() {
        this.showMessage('YouTube字幕下载器 v1.0.0', 'info');
    }

    /**
     * 打开标签页
     */
    async openTab(url) {
        try {
            await chrome.tabs.create({ url });
            window.close(); // 关闭弹出窗口
        } catch (error) {
            console.error('打开标签页失败:', error);
        }
    }

    /**
     * 更新状态
     */
    updateStatus(text, type = 'ready') {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        
        statusText.textContent = text;
        statusDot.className = `status-dot ${type}`;
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // 添加到消息区域
        const messageArea = document.getElementById('messageArea');
        messageArea.appendChild(messageEl);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    /**
     * 设置加载状态
     */
    setLoadingState(loading) {
        const downloadBtn = document.getElementById('downloadCurrentBtn');
        const openSidePanelBtn = document.getElementById('openSidePanelBtn');
        
        if (loading) {
            downloadBtn.disabled = true;
            openSidePanelBtn.disabled = true;
            downloadBtn.classList.add('loading');
        } else {
            downloadBtn.disabled = !this.pageState?.hasCaptions;
            openSidePanelBtn.disabled = false;
            downloadBtn.classList.remove('loading');
        }
    }

    /**
     * 格式化时长
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 发送消息到后台
     */
    async sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response);
            });
        });
    }
}

// 创建弹出窗口控制器实例
const popupController = new PopupController();

// 将实例暴露给全局作用域，便于调试
window.popupController = popupController;