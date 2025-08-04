/**
 * YouTube字幕下载器后台脚本
 * 处理扩展的后台逻辑和消息传递
 */

// 导入LLM客户端
import { llmClient } from './utils/llm-client.js';

class BackgroundService {
    constructor() {
        this.isActive = false;
        this.currentTab = null;
        this.llmInitialized = false;
        this.init();
    }

    /**
     * 初始化后台服务
     */
    async init() {
        // 初始化LLM客户端
        try {
            await llmClient.init();
            this.llmInitialized = true;
            console.log('LLM客户端初始化成功');
        } catch (error) {
            console.error('LLM客户端初始化失败:', error);
        }

        // 设置事件监听器
        this.setupEventListeners();
        
        // 检查当前标签页
        await this.checkCurrentTab();
        
        this.isActive = true;
        console.log('YouTube字幕下载器后台服务已启动');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 扩展安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // 扩展启动事件
        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });

        // 消息监听器
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放
        });

        // 标签页更新事件
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // 标签页激活事件
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivate(activeInfo);
        });

        // 侧边栏打开事件
        chrome.sidePanel.onShown.addListener(() => {
            this.handleSidePanelShown();
        });
    }

    /**
     * 处理扩展安装
     */
    async handleInstall(details) {
        console.log('扩展安装/更新:', details.reason);
        
        // 设置默认配置
        await this.setDefaultSettings();
        
        // 如果是首次安装，打开欢迎页面
        if (details.reason === 'install') {
            await this.openWelcomePage();
        }
    }

    /**
     * 处理扩展启动
     */
    async handleStartup() {
        console.log('扩展启动');
        await this.checkCurrentTab();
    }

    /**
     * 处理标签页更新
     */
    async handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
            this.currentTab = tab;
            await this.notifySidePanel({ action: 'tabUpdated', tab });
        }
    }

    /**
     * 处理标签页激活
     */
    async handleTabActivate(activeInfo) {
        try {
            const tab = await chrome.tabs.get(activeInfo.tabId);
            if (tab.url?.includes('youtube.com/watch')) {
                this.currentTab = tab;
                await this.notifySidePanel({ action: 'tabActivated', tab });
            }
        } catch (error) {
            console.error('获取标签页信息失败:', error);
        }
    }

    /**
     * 处理侧边栏显示
     */
    async handleSidePanelShown() {
        if (this.currentTab) {
            await this.notifySidePanel({ action: 'sidePanelShown', tab: this.currentTab });
        }
    }

    /**
     * 处理消息
     */
    async handleMessage(request, sender, sendResponse) {
        try {
            const { action, data } = request;
            
            switch (action) {
                case 'getVideoInfo':
                    await this.handleGetVideoInfo(sender.tab, sendResponse);
                    break;
                    
                case 'getCaptionTracks':
                    await this.handleGetCaptionTracks(sender.tab, sendResponse);
                    break;
                    
                case 'getAvailableLanguages':
                    await this.handleGetAvailableLanguages(sender.tab, sendResponse);
                    break;
                    
                case 'downloadSubtitles':
                    await this.handleDownloadSubtitles(sender.tab, data, sendResponse);
                    break;
                    
                case 'optimizeSubtitles':
                    await this.handleOptimizeSubtitles(data, sendResponse);
                    break;
                    
                case 'translateSubtitles':
                    await this.handleTranslateSubtitles(data, sendResponse);
                    break;
                    
                case 'saveLLMConfig':
                    await this.handleSaveLLMConfig(data, sendResponse);
                    break;
                    
                case 'getLLMConfig':
                    await this.handleGetLLMConfig(sendResponse);
                    break;
                    
                case 'testLLMConnection':
                    await this.handleTestLLMConnection(data, sendResponse);
                    break;
                    
                case 'getUsageStats':
                    await this.handleGetUsageStats(sendResponse);
                    break;
                    
                case 'openSidePanel':
                    await this.handleOpenSidePanel(sender.tab, sendResponse);
                    break;
                    
                case 'getPageState':
                    await this.handleGetPageState(sender.tab, sendResponse);
                    break;
                    
                default:
                    sendResponse({ success: false, error: `未知的操作: ${action}` });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 获取视频信息
     */
    async handleGetVideoInfo(tab, sendResponse) {
        if (!tab || !tab.url?.includes('youtube.com/watch')) {
            sendResponse({ success: false, error: '当前页面不是YouTube视频页面' });
            return;
        }

        const response = await this.sendMessageToContentScript(tab, {
            action: 'getVideoInfo'
        });

        sendResponse(response);
    }

    /**
     * 获取字幕轨道
     */
    async handleGetCaptionTracks(tab, sendResponse) {
        if (!tab || !tab.url?.includes('youtube.com/watch')) {
            sendResponse({ success: false, error: '当前页面不是YouTube视频页面' });
            return;
        }

        const response = await this.sendMessageToContentScript(tab, {
            action: 'getCaptionTracks'
        });

        sendResponse(response);
    }

    /**
     * 获取可用语言
     */
    async handleGetAvailableLanguages(tab, sendResponse) {
        if (!tab || !tab.url?.includes('youtube.com/watch')) {
            sendResponse({ success: false, error: '当前页面不是YouTube视频页面' });
            return;
        }

        const response = await this.sendMessageToContentScript(tab, {
            action: 'getAvailableLanguages'
        });

        sendResponse(response);
    }

    /**
     * 下载字幕
     */
    async handleDownloadSubtitles(tab, options, sendResponse) {
        if (!tab || !tab.url?.includes('youtube.com/watch')) {
            sendResponse({ success: false, error: '当前页面不是YouTube视频页面' });
            return;
        }

        const response = await this.sendMessageToContentScript(tab, {
            action: 'downloadSubtitles',
            options
        });

        sendResponse(response);
    }

    /**
     * 优化字幕
     */
    async handleOptimizeSubtitles(data, sendResponse) {
        if (!this.llmInitialized) {
            sendResponse({ success: false, error: 'LLM客户端未初始化' });
            return;
        }

        try {
            const { subtitles, provider, options } = data;
            const optimizedSubtitles = await llmClient.processSubtitles(
                subtitles,
                'optimize',
                provider,
                options
            );

            sendResponse({ success: true, data: optimizedSubtitles });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 翻译字幕
     */
    async handleTranslateSubtitles(data, sendResponse) {
        if (!this.llmInitialized) {
            sendResponse({ success: false, error: 'LLM客户端未初始化' });
            return;
        }

        try {
            const { subtitles, targetLanguage, provider } = data;
            const translatedSubtitles = await llmClient.processSubtitles(
                subtitles,
                'translate',
                provider,
                { targetLanguage }
            );

            sendResponse({ success: true, data: translatedSubtitles });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 保存LLM配置
     */
    async handleSaveLLMConfig(data, sendResponse) {
        try {
            if (!this.llmInitialized) {
                sendResponse({ success: false, error: 'LLM客户端未初始化' });
                return;
            }

            const { provider, config } = data;
            llmClient.config.updateConfig(provider, config);
            await llmClient.config.saveToStorage();

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 获取LLM配置
     */
    async handleGetLLMConfig(sendResponse) {
        try {
            if (!this.llmInitialized) {
                sendResponse({ success: false, error: 'LLM客户端未初始化' });
                return;
            }

            const config = llmClient.config.providers;
            sendResponse({ success: true, data: config });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 测试LLM连接
     */
    async handleTestLLMConnection(data, sendResponse) {
        try {
            if (!this.llmInitialized) {
                sendResponse({ success: false, error: 'LLM客户端未初始化' });
                return;
            }

            const { provider } = data;
            const isConnected = await llmClient.testConnection(provider);

            sendResponse({ success: true, data: { connected: isConnected } });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 获取使用统计
     */
    async handleGetUsageStats(sendResponse) {
        try {
            if (!this.llmInitialized) {
                sendResponse({ success: false, error: 'LLM客户端未初始化' });
                return;
            }

            const stats = await llmClient.getUsageStats();
            sendResponse({ success: true, data: stats });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 打开侧边栏
     */
    async handleOpenSidePanel(tab, sendResponse) {
        try {
            if (tab) {
                await chrome.sidePanel.open({ tabId: tab.id });
            }
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 获取页面状态
     */
    async handleGetPageState(tab, sendResponse) {
        if (!tab || !tab.url?.includes('youtube.com/watch')) {
            sendResponse({ success: false, error: '当前页面不是YouTube视频页面' });
            return;
        }

        const response = await this.sendMessageToContentScript(tab, {
            action: 'getPageState'
        });

        sendResponse(response);
    }

    /**
     * 向内容脚本发送消息
     */
    async sendMessageToContentScript(tab, message) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, message);
            return response;
        } catch (error) {
            console.error('向内容脚本发送消息失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 通知侧边栏
     */
    async notifySidePanel(message) {
        try {
            // 向侧边栏发送消息
            const sidePanelMessage = {
                ...message,
                timestamp: Date.now()
            };

            chrome.runtime.sendMessage(sidePanelMessage).catch(error => {
                console.log('侧边栏未打开或无法接收消息:', error);
            });
        } catch (error) {
            console.error('通知侧边栏失败:', error);
        }
    }

    /**
     * 检查当前标签页
     */
    async checkCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0 && tabs[0].url?.includes('youtube.com/watch')) {
                this.currentTab = tabs[0];
            }
        } catch (error) {
            console.error('检查当前标签页失败:', error);
        }
    }

    /**
     * 设置默认设置
     */
    async setDefaultSettings() {
        const defaultSettings = {
            downloadFormat: 'srt',
            defaultLanguage: 'zh',
            autoTranslate: false,
            showNotifications: true,
            llmConfig: JSON.stringify(llmClient.config.providers)
        };

        try {
            await chrome.storage.sync.set(defaultSettings);
            console.log('默认设置已保存');
        } catch (error) {
            console.error('保存默认设置失败:', error);
        }
    }

    /**
     * 打开欢迎页面
     */
    async openWelcomePage() {
        try {
            await chrome.tabs.create({
                url: chrome.runtime.getURL('src/popup/welcome.html')
            });
        } catch (error) {
            console.error('打开欢迎页面失败:', error);
        }
    }

    /**
     * 获取扩展状态
     */
    getStatus() {
        return {
            isActive: this.isActive,
            llmInitialized: this.llmInitialized,
            currentTab: this.currentTab ? {
                id: this.currentTab.id,
                url: this.currentTab.url,
                title: this.currentTab.title
            } : null
        };
    }
}

// 创建后台服务实例
const backgroundService = new BackgroundService();

// 将实例暴露给全局作用域，便于调试
window.backgroundService = backgroundService;