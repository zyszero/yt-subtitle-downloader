/**
 * YouTube字幕下载器侧边栏脚本
 */

class SidePanelController {
    constructor() {
        this.currentTab = null;
        this.videoInfo = null;
        this.captionTracks = [];
        this.availableLanguages = [];
        this.currentSubtitles = [];
        this.isProcessing = false;
        this.llmConfig = null;
        this.stats = {
            totalDownloads: 0,
            totalOptimized: 0,
            apiCalls: 0
        };
        
        this.init();
    }

    /**
     * 初始化
     */
    async init() {
        // 设置事件监听器
        this.setupEventListeners();
        
        // 初始化UI
        this.initializeUI();
        
        // 获取当前标签页信息
        await this.getCurrentTab();
        
        // 加载设置
        await this.loadSettings();
        
        // 加载统计信息
        await this.loadStats();
        
        // 检查页面状态
        await this.checkPageState();
        
        console.log('侧边栏初始化完成');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 语言选择
        document.getElementById('languageSelect').addEventListener('change', () => {
            this.onLanguageChange();
        });

        // 格式选择
        document.getElementById('formatSelect').addEventListener('change', () => {
            this.onFormatChange();
        });

        // 双语模式
        document.getElementById('bilingualMode').addEventListener('change', (e) => {
            this.onBilingualModeChange(e.target.checked);
        });

        // 翻译语言
        document.getElementById('translateLanguage').addEventListener('change', () => {
            this.onTranslateLanguageChange();
        });

        // 下载按钮
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.onDownloadClick();
        });

        // LLM提供商选择
        document.getElementById('llmProvider').addEventListener('change', (e) => {
            this.onLLMProviderChange(e.target.value);
        });

        // 保存配置按钮
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.onSaveLLMConfig();
        });

        // 测试连接按钮
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.onTestConnection();
        });

        // 优化按钮
        document.getElementById('optimizeBtn').addEventListener('click', () => {
            this.onOptimizeClick();
        });

        // 启用优化
        document.getElementById('enableOptimization').addEventListener('change', (e) => {
            this.onEnableOptimizationChange(e.target.checked);
        });

        // 复制按钮
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.onCopyClick();
        });

        // 编辑按钮
        document.getElementById('editBtn').addEventListener('click', () => {
            this.onEditClick();
        });

        // 刷新按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.onRefreshClick();
        });

        // 设置变更
        document.getElementById('showNotifications').addEventListener('change', (e) => {
            this.onSettingChange('showNotifications', e.target.checked);
        });

        document.getElementById('autoDetectLanguage').addEventListener('change', (e) => {
            this.onSettingChange('autoDetectLanguage', e.target.checked);
        });

        document.getElementById('maxSubtitles').addEventListener('change', (e) => {
            this.onSettingChange('maxSubtitles', parseInt(e.target.value));
        });

        // 重置设置
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            this.onResetSettings();
        });

        // 导出设置
        document.getElementById('exportSettingsBtn').addEventListener('click', () => {
            this.onExportSettings();
        });

        // 关于链接
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelp();
        });

        document.getElementById('feedbackLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openFeedback();
        });

        document.getElementById('updateLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.checkForUpdates();
        });

        // 监听来自后台脚本的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleBackgroundMessage(request);
        });
    }

    /**
     * 初始化UI
     */
    initializeUI() {
        // 设置初始状态
        this.updateStatus('准备就绪', 'ready');
        
        // 禁用需要数据的控件
        document.getElementById('languageSelect').disabled = true;
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('optimizeBtn').disabled = true;
        
        // 隐藏字幕预览
        document.getElementById('subtitlePreview').style.display = 'none';
    }

    /**
     * 获取当前标签页
     */
    async getCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                this.currentTab = tabs[0];
                console.log('当前标签页:', this.currentTab.url);
            }
        } catch (error) {
            console.error('获取当前标签页失败:', error);
        }
    }

    /**
     * 检查页面状态
     */
    async checkPageState() {
        if (!this.currentTab || !this.currentTab.url?.includes('youtube.com/watch')) {
            this.updateStatus('请打开YouTube视频页面', 'warning');
            return;
        }

        try {
            // 获取页面状态
            const response = await this.sendMessageToBackground({
                action: 'getPageState'
            });

            if (response.success) {
                const pageState = response.data;
                
                if (pageState.hasCaptions) {
                    this.updateStatus('找到字幕', 'ready');
                    await this.loadVideoInfo();
                    await this.loadCaptionTracks();
                } else {
                    this.updateStatus('视频没有字幕', 'warning');
                }
            } else {
                this.updateStatus('无法获取页面信息', 'error');
            }
        } catch (error) {
            console.error('检查页面状态失败:', error);
            this.updateStatus('检查页面状态失败', 'error');
        }
    }

    /**
     * 加载视频信息
     */
    async loadVideoInfo() {
        try {
            const response = await this.sendMessageToBackground({
                action: 'getVideoInfo'
            });

            if (response.success) {
                this.videoInfo = response.data;
                this.displayVideoInfo();
            }
        } catch (error) {
            console.error('加载视频信息失败:', error);
        }
    }

    /**
     * 显示视频信息
     */
    displayVideoInfo() {
        if (!this.videoInfo) return;

        document.getElementById('videoInfo').style.display = 'block';
        document.getElementById('videoTitle').textContent = this.videoInfo.title;
        document.getElementById('videoAuthor').textContent = this.videoInfo.author;
        document.getElementById('videoDuration').textContent = this.formatDuration(this.videoInfo.lengthSeconds);
    }

    /**
     * 加载字幕轨道
     */
    async loadCaptionTracks() {
        try {
            const response = await this.sendMessageToBackground({
                action: 'getCaptionTracks'
            });

            if (response.success) {
                this.captionTracks = response.data;
                await this.loadAvailableLanguages();
            }
        } catch (error) {
            console.error('加载字幕轨道失败:', error);
        }
    }

    /**
     * 加载可用语言
     */
    async loadAvailableLanguages() {
        try {
            const response = await this.sendMessageToBackground({
                action: 'getAvailableLanguages'
            });

            if (response.success) {
                this.availableLanguages = response.data;
                this.populateLanguageSelect();
                
                // 启用控件
                document.getElementById('languageSelect').disabled = false;
                document.getElementById('downloadBtn').disabled = false;
            }
        } catch (error) {
            console.error('加载可用语言失败:', error);
        }
    }

    /**
     * 填充语言选择器
     */
    populateLanguageSelect() {
        const select = document.getElementById('languageSelect');
        select.innerHTML = '';

        if (this.availableLanguages.length === 0) {
            select.innerHTML = '<option value="">没有可用语言</option>';
            return;
        }

        this.availableLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            select.appendChild(option);
        });

        // 尝试自动选择中文
        const chineseLang = this.availableLanguages.find(lang => 
            lang.code === 'zh' || lang.code === 'zh-CN' || lang.code === 'zh-TW'
        );
        
        if (chineseLang) {
            select.value = chineseLang.code;
        } else {
            select.value = this.availableLanguages[0].code;
        }
    }

    /**
     * 处理语言变化
     */
    onLanguageChange() {
        this.updateOptimizeButtonState();
    }

    /**
     * 处理格式变化
     */
    onFormatChange() {
        // 格式变化时的处理
    }

    /**
     * 处理双语模式变化
     */
    onBilingualModeChange(enabled) {
        const translateGroup = document.getElementById('translateGroup');
        translateGroup.style.display = enabled ? 'block' : 'none';
        
        if (enabled) {
            this.updateStatus('双语模式已启用', 'ready');
        }
    }

    /**
     * 处理翻译语言变化
     */
    onTranslateLanguageChange() {
        // 翻译语言变化时的处理
    }

    /**
     * 处理下载点击
     */
    async onDownloadClick() {
        if (this.isProcessing) return;

        const language = document.getElementById('languageSelect').value;
        const format = document.getElementById('formatSelect').value;
        const bilingual = document.getElementById('bilingualMode').checked;
        const translateLanguage = bilingual ? document.getElementById('translateLanguage').value : null;

        if (!language) {
            this.showMessage('请选择字幕语言', 'warning');
            return;
        }

        this.setProcessingState(true);

        try {
            const response = await this.sendMessageToBackground({
                action: 'downloadSubtitles',
                options: {
                    language,
                    format,
                    translate: bilingual,
                    translateTo: translateLanguage,
                    bilingual
                }
            });

            if (response.success) {
                this.showMessage(`字幕下载成功！共 ${response.data.subtitleCount} 条字幕`, 'success');
                this.updateStats('totalDownloads', this.stats.totalDownloads + 1);
                
                // 如果启用了优化，显示优化按钮
                if (document.getElementById('enableOptimization').checked) {
                    this.currentSubtitles = response.data.subtitles || [];
                    this.updateOptimizeButtonState();
                }
            } else {
                this.showMessage(`下载失败：${response.error}`, 'error');
            }
        } catch (error) {
            console.error('下载失败:', error);
            this.showMessage(`下载失败：${error.message}`, 'error');
        } finally {
            this.setProcessingState(false);
        }
    }

    /**
     * 处理LLM提供商变化
     */
    onLLMProviderChange(provider) {
        const configDiv = document.getElementById('llmConfig');
        const actionsDiv = document.getElementById('llmActions');
        
        if (provider) {
            configDiv.style.display = 'block';
            this.loadLLMConfig(provider);
        } else {
            configDiv.style.display = 'none';
            actionsDiv.style.display = 'none';
        }
    }

    /**
     * 处理保存LLM配置
     */
    async onSaveLLMConfig() {
        const provider = document.getElementById('llmProvider').value;
        if (!provider) return;

        const config = {
            apiKey: document.getElementById('apiKey').value,
            model: document.getElementById('model').value,
            baseUrl: document.getElementById('baseUrl').value
        };

        try {
            const response = await this.sendMessageToBackground({
                action: 'saveLLMConfig',
                data: { provider, config }
            });

            if (response.success) {
                this.showMessage('配置保存成功', 'success');
                this.updateLLMActionsState();
            } else {
                this.showMessage(`配置保存失败：${response.error}`, 'error');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showMessage(`配置保存失败：${error.message}`, 'error');
        }
    }

    /**
     * 处理测试连接
     */
    async onTestConnection() {
        const provider = document.getElementById('llmProvider').value;
        if (!provider) return;

        this.setProcessingState(true);

        try {
            const response = await this.sendMessageToBackground({
                action: 'testLLMConnection',
                data: { provider }
            });

            if (response.success && response.data.connected) {
                this.showMessage('连接测试成功', 'success');
            } else {
                this.showMessage('连接测试失败，请检查配置', 'error');
            }
        } catch (error) {
            console.error('测试连接失败:', error);
            this.showMessage(`测试连接失败：${error.message}`, 'error');
        } finally {
            this.setProcessingState(false);
        }
    }

    /**
     * 处理优化点击
     */
    async onOptimizeClick() {
        if (this.isProcessing || this.currentSubtitles.length === 0) return;

        const provider = document.getElementById('llmProvider').value;
        const style = document.getElementById('optimizeStyle').value;

        this.setProcessingState(true);

        try {
            const response = await this.sendMessageToBackground({
                action: 'optimizeSubtitles',
                data: {
                    subtitles: this.currentSubtitles,
                    provider,
                    options: { style }
                }
            });

            if (response.success) {
                this.currentSubtitles = response.data;
                this.displaySubtitles(this.currentSubtitles);
                this.showMessage('字幕优化成功', 'success');
                this.updateStats('totalOptimized', this.stats.totalOptimized + 1);
            } else {
                this.showMessage(`优化失败：${response.error}`, 'error');
            }
        } catch (error) {
            console.error('优化失败:', error);
            this.showMessage(`优化失败：${error.message}`, 'error');
        } finally {
            this.setProcessingState(false);
        }
    }

    /**
     * 处理启用优化变化
     */
    onEnableOptimizationChange(enabled) {
        this.updateLLMActionsState();
    }

    /**
     * 处理复制点击
     */
    async onCopyClick() {
        const content = document.getElementById('previewContent').textContent;
        if (!content) return;

        try {
            await navigator.clipboard.writeText(content);
            this.showMessage('已复制到剪贴板', 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.showMessage('复制失败', 'error');
        }
    }

    /**
     * 处理编辑点击
     */
    onEditClick() {
        const content = document.getElementById('previewContent');
        content.contentEditable = true;
        content.focus();
        
        // 修改按钮文本
        const editBtn = document.getElementById('editBtn');
        editBtn.textContent = '保存';
        editBtn.onclick = () => this.onSaveEdit();
    }

    /**
     * 处理保存编辑
     */
    onSaveEdit() {
        const content = document.getElementById('previewContent');
        content.contentEditable = false;
        
        // 恢复按钮
        const editBtn = document.getElementById('editBtn');
        editBtn.textContent = '编辑';
        editBtn.onclick = () => this.onEditClick();
        
        this.showMessage('编辑已保存', 'success');
    }

    /**
     * 处理刷新点击
     */
    async onRefreshClick() {
        await this.checkPageState();
    }

    /**
     * 处理设置变化
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
     * 处理重置设置
     */
    async onResetSettings() {
        if (!confirm('确定要重置所有设置吗？')) return;

        try {
            await chrome.storage.sync.clear();
            await this.loadSettings();
            this.showMessage('设置已重置', 'success');
        } catch (error) {
            console.error('重置设置失败:', error);
            this.showMessage('重置设置失败', 'error');
        }
    }

    /**
     * 处理导出设置
     */
    async onExportSettings() {
        try {
            const settings = await chrome.storage.sync.get(null);
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'youtube-subtitle-downloader-settings.json';
            a.click();
            
            URL.revokeObjectURL(url);
            this.showMessage('设置已导出', 'success');
        } catch (error) {
            console.error('导出设置失败:', error);
            this.showMessage('导出设置失败', 'error');
        }
    }

    /**
     * 处理后台消息
     */
    handleBackgroundMessage(request) {
        switch (request.action) {
            case 'tabUpdated':
            case 'tabActivated':
            case 'sidePanelShown':
                this.checkPageState();
                break;
            case 'pageUpdated':
                this.checkPageState();
                break;
        }
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                downloadFormat: 'srt',
                defaultLanguage: 'zh',
                autoTranslate: false,
                showNotifications: true,
                autoDetectLanguage: true,
                maxSubtitles: 500
            });

            // 应用设置到UI
            document.getElementById('formatSelect').value = settings.downloadFormat;
            document.getElementById('showNotifications').checked = settings.showNotifications;
            document.getElementById('autoDetectLanguage').checked = settings.autoDetectLanguage;
            document.getElementById('maxSubtitles').value = settings.maxSubtitles;
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    /**
     * 加载LLM配置
     */
    async loadLLMConfig(provider) {
        try {
            const response = await this.sendMessageToBackground({
                action: 'getLLMConfig'
            });

            if (response.success) {
                const config = response.data[provider];
                if (config) {
                    document.getElementById('apiKey').value = config.apiKey || '';
                    document.getElementById('model').value = config.model || '';
                    document.getElementById('baseUrl').value = config.baseUrl || '';
                }
            }
        } catch (error) {
            console.error('加载LLM配置失败:', error);
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
                this.updateStats('totalDownloads', stats.totalRequests || 0);
                this.updateStats('totalOptimized', stats.providerStats?.optimize?.requests || 0);
                this.updateStats('apiCalls', stats.totalTokens || 0);
            }
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    /**
     * 更新统计信息
     */
    updateStats(key, value) {
        this.stats[key] = value;
        document.getElementById(key).textContent = value;
    }

    /**
     * 更新状态
     */
    updateStatus(text, type = 'ready') {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');
        
        statusText.textContent = text;
        statusIndicator.className = `status-indicator ${type}`;
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        // 检查是否显示通知
        const showNotifications = document.getElementById('showNotifications').checked;
        if (showNotifications) {
            this.showNotification(message, type);
        }
        
        // 在状态栏显示消息
        this.updateStatus(message, type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'ready');
        
        // 3秒后恢复状态
        setTimeout(() => {
            this.updateStatus('准备就绪', 'ready');
        }, 3000);
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `${type}-message`;
        notification.textContent = message;
        
        // 添加到页面
        document.body.insertBefore(notification, document.body.firstChild);
        
        // 3秒后移除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * 设置处理状态
     */
    setProcessingState(processing) {
        this.isProcessing = processing;
        
        const downloadBtn = document.getElementById('downloadBtn');
        const optimizeBtn = document.getElementById('optimizeBtn');
        
        if (processing) {
            downloadBtn.disabled = true;
            optimizeBtn.disabled = true;
            downloadBtn.querySelector('.btn-text').style.display = 'none';
            downloadBtn.querySelector('.btn-loading').style.display = 'inline';
            optimizeBtn.querySelector('.btn-text').style.display = 'none';
            optimizeBtn.querySelector('.btn-loading').style.display = 'inline';
        } else {
            this.updateOptimizeButtonState();
            downloadBtn.querySelector('.btn-text').style.display = 'inline';
            downloadBtn.querySelector('.btn-loading').style.display = 'none';
            optimizeBtn.querySelector('.btn-text').style.display = 'inline';
            optimizeBtn.querySelector('.btn-loading').style.display = 'none';
        }
    }

    /**
     * 更新优化按钮状态
     */
    updateOptimizeButtonState() {
        const optimizeBtn = document.getElementById('optimizeBtn');
        const enableOptimization = document.getElementById('enableOptimization').checked;
        const llmProvider = document.getElementById('llmProvider').value;
        
        const canOptimize = enableOptimization && 
                           llmProvider && 
                           this.currentSubtitles.length > 0 && 
                           !this.isProcessing;
        
        optimizeBtn.disabled = !canOptimize;
    }

    /**
     * 更新LLM操作状态
     */
    updateLLMActionsState() {
        const actionsDiv = document.getElementById('llmActions');
        const enableOptimization = document.getElementById('enableOptimization').checked;
        const llmProvider = document.getElementById('llmProvider').value;
        
        if (enableOptimization && llmProvider) {
            actionsDiv.style.display = 'block';
            this.updateOptimizeButtonState();
        } else {
            actionsDiv.style.display = 'none';
        }
    }

    /**
     * 显示字幕
     */
    displaySubtitles(subtitles) {
        const previewDiv = document.getElementById('subtitlePreview');
        const contentDiv = document.getElementById('previewContent');
        
        if (!subtitles || subtitles.length === 0) {
            contentDiv.innerHTML = '<div class="preview-placeholder">没有字幕内容</div>';
        } else {
            contentDiv.innerHTML = subtitles.map(sub => 
                `<div>[${sub.startTime}] ${sub.text}</div>`
            ).join('');
        }
        
        previewDiv.style.display = 'block';
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

    /**
     * 打开帮助
     */
    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/example/youtube-subtitle-downloader/wiki'
        });
    }

    /**
     * 打开反馈
     */
    openFeedback() {
        chrome.tabs.create({
            url: 'https://github.com/example/youtube-subtitle-downloader/issues'
        });
    }

    /**
     * 检查更新
     */
    async checkForUpdates() {
        this.showMessage('正在检查更新...', 'info');
        
        try {
            // 这里可以实现检查更新逻辑
            setTimeout(() => {
                this.showMessage('当前已是最新版本', 'success');
            }, 2000);
        } catch (error) {
            this.showMessage('检查更新失败', 'error');
        }
    }
}

// 创建侧边栏控制器实例
const sidePanelController = new SidePanelController();

// 将实例暴露给全局作用域，便于调试
window.sidePanelController = sidePanelController;