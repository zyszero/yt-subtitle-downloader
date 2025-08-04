/**
 * YouTube字幕下载器内容脚本
 * 用于在YouTube页面中注入功能
 */

// 导入工具函数
import { extractPlayerResponse, extractCaptionTracks, getAvailableLanguages, buildSubtitleUrl, fetchSubtitlesWithRetry, parseYouTubeSubtitles } from './utils/subtitle-parser.js';
import { convertToSRT, convertToWebVTT } from './utils/format-converter.js';

class YouTubeSubtitleDownloader {
    constructor() {
        this.currentVideoId = null;
        this.captionTracks = null;
        this.availableLanguages = [];
        this.isProcessing = false;
        this.init();
    }

    /**
     * 初始化
     */
    async init() {
        // 等待页面完全加载
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // 监听URL变化
        this.setupUrlChangeListener();
        
        // 监听来自扩展的消息
        this.setupMessageListener();
        
        // 初始化当前页面
        await this.initializeCurrentPage();
        
        // 在控制台输出初始化信息
        console.log('YouTube字幕下载器已初始化');
    }

    /**
     * 设置URL变化监听器
     */
    setupUrlChangeListener() {
        let lastUrl = location.href;
        
        const checkUrlChange = () => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                this.initializeCurrentPage();
            }
        };

        // 监听多种导航事件
        document.addEventListener('spfdone', checkUrlChange);
        document.addEventListener('yt-navigate-start', checkUrlChange);
        document.addEventListener('yt-navigate-finish', checkUrlChange);
        
        // 定时检查
        setInterval(checkUrlChange, 1000);
    }

    /**
     * 设置消息监听器
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开放
        });
    }

    /**
     * 处理消息
     */
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'getVideoInfo':
                    const videoInfo = await this.getVideoInfo();
                    sendResponse({ success: true, data: videoInfo });
                    break;
                    
                case 'getCaptionTracks':
                    const tracks = await this.getCaptionTracks();
                    sendResponse({ success: true, data: tracks });
                    break;
                    
                case 'downloadSubtitles':
                    const downloadResult = await this.downloadSubtitles(request.options);
                    sendResponse({ success: true, data: downloadResult });
                    break;
                    
                case 'getAvailableLanguages':
                    const languages = await this.getAvailableLanguages();
                    sendResponse({ success: true, data: languages });
                    break;
                    
                default:
                    sendResponse({ success: false, error: '未知的操作' });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * 初始化当前页面
     */
    async initializeCurrentPage() {
        // 检查是否为YouTube视频页面
        if (!this.isVideoPage()) {
            return;
        }

        // 获取视频ID
        const videoId = this.extractVideoId();
        if (!videoId || videoId === this.currentVideoId) {
            return;
        }

        this.currentVideoId = videoId;
        this.captionTracks = null;
        this.availableLanguages = [];

        // 等待播放器数据加载
        await this.waitForPlayerData();
        
        // 提取字幕轨道信息
        await this.extractCaptionData();
        
        // 发送页面更新消息
        this.sendPageUpdate();
    }

    /**
     * 检查是否为视频页面
     */
    isVideoPage() {
        return location.pathname === '/watch' && location.search.includes('v=');
    }

    /**
     * 提取视频ID
     */
    extractVideoId() {
        const urlParams = new URLSearchParams(location.search);
        return urlParams.get('v');
    }

    /**
     * 等待播放器数据加载
     */
    async waitForPlayerData() {
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
            const playerData = this.extractPlayerData();
            if (playerData) {
                return true;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error('等待播放器数据超时');
    }

    /**
     * 提取播放器数据
     */
    extractPlayerData() {
        try {
            // 尝试多种方式获取播放器数据
            const scripts = document.getElementsByTagName('script');
            
            for (const script of scripts) {
                const text = script.textContent;
                if (text && text.includes('ytInitialPlayerResponse')) {
                    return extractPlayerResponse(text);
                }
            }
            
            // 尝试从window对象获取
            if (window.ytInitialPlayerResponse) {
                return window.ytInitialPlayerResponse;
            }
            
            return null;
        } catch (error) {
            console.error('提取播放器数据失败:', error);
            return null;
        }
    }

    /**
     * 提取字幕数据
     */
    async extractCaptionData() {
        try {
            const playerData = this.extractPlayerData();
            if (!playerData) {
                throw new Error('无法获取播放器数据');
            }

            this.captionTracks = extractCaptionTracks(playerData);
            this.availableLanguages = getAvailableLanguages(this.captionTracks);
            
            console.log(`找到 ${this.availableLanguages.length} 种字幕语言`);
        } catch (error) {
            console.error('提取字幕数据失败:', error);
            this.captionTracks = null;
            this.availableLanguages = [];
        }
    }

    /**
     * 获取视频信息
     */
    async getVideoInfo() {
        if (!this.currentVideoId) {
            throw new Error('未找到视频ID');
        }

        const playerData = this.extractPlayerData();
        if (!playerData) {
            throw new Error('无法获取播放器数据');
        }

        const videoDetails = playerData.videoDetails;
        
        return {
            videoId: this.currentVideoId,
            title: videoDetails.title,
            author: videoDetails.author,
            lengthSeconds: videoDetails.lengthSeconds,
            viewCount: videoDetails.viewCount,
            thumbnail: videoDetails.thumbnail?.thumbnails?.[0]?.url,
            hasCaptions: this.captionTracks && this.captionTracks.length > 0,
            captionCount: this.availableLanguages.length
        };
    }

    /**
     * 获取字幕轨道
     */
    async getCaptionTracks() {
        if (!this.captionTracks) {
            await this.extractCaptionData();
        }
        
        return this.captionTracks || [];
    }

    /**
     * 获取可用语言
     */
    async getAvailableLanguages() {
        if (!this.availableLanguages.length) {
            await this.extractCaptionData();
        }
        
        return this.availableLanguages;
    }

    /**
     * 下载字幕
     */
    async downloadSubtitles(options) {
        if (this.isProcessing) {
            throw new Error('正在处理中，请稍候');
        }

        this.isProcessing = true;

        try {
            const {
                language,
                format = 'srt',
                translate = false,
                translateTo = null,
                bilingual = false
            } = options;

            if (!this.captionTracks) {
                throw new Error('未找到字幕轨道');
            }

            let subtitles = [];
            
            if (bilingual && translate && translateTo) {
                // 双语字幕
                const originalUrl = buildSubtitleUrl(this.captionTracks, language, false);
                const translatedUrl = buildSubtitleUrl(this.captionTracks, language, true, translateTo);
                
                if (originalUrl && translatedUrl) {
                    const [originalXml, translatedXml] = await Promise.all([
                        fetchSubtitlesWithRetry(originalUrl),
                        fetchSubtitlesWithRetry(translatedUrl)
                    ]);
                    
                    const originalSubtitles = await parseYouTubeSubtitles(originalXml);
                    const translatedSubtitles = await parseYouTubeSubtitles(translatedXml);
                    
                    // 合并双语字幕
                    subtitles = originalSubtitles.map((orig, index) => ({
                        id: index + 1,
                        start: orig.start,
                        end: orig.end,
                        duration: orig.duration,
                        text: `${orig.text}\n${translatedSubtitles[index]?.text || ''}`,
                        startTime: orig.startTime,
                        endTime: orig.endTime
                    }));
                }
            } else {
                // 单语字幕
                const url = buildSubtitleUrl(this.captionTracks, language, translate, translateTo);
                if (!url) {
                    throw new Error('无法构建字幕URL');
                }
                
                const xmlText = await fetchSubtitlesWithRetry(url);
                subtitles = await parseYouTubeSubtitles(xmlText);
            }

            // 转换格式
            let content;
            let filename;
            
            switch (format.toLowerCase()) {
                case 'srt':
                    content = convertToSRT(subtitles);
                    filename = `${this.currentVideoId}_${language}.srt`;
                    break;
                case 'vtt':
                    content = convertToWebVTT(subtitles);
                    filename = `${this.currentVideoId}_${language}.vtt`;
                    break;
                default:
                    throw new Error(`不支持的格式: ${format}`);
            }

            // 下载文件
            await this.downloadFile(content, filename);
            
            return {
                success: true,
                subtitleCount: subtitles.length,
                format,
                language,
                filename
            };
            
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 下载文件
     */
    async downloadFile(content, filename) {
        // 创建下载链接
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 清理URL对象
        URL.revokeObjectURL(url);
    }

    /**
     * 发送页面更新消息
     */
    sendPageUpdate() {
        chrome.runtime.sendMessage({
            action: 'pageUpdated',
            data: {
                videoId: this.currentVideoId,
                hasCaptions: this.captionTracks && this.captionTracks.length > 0,
                languageCount: this.availableLanguages.length
            }
        }).catch(error => {
            console.error('发送页面更新消息失败:', error);
        });
    }

    /**
     * 获取页面状态
     */
    getPageState() {
        return {
            videoId: this.currentVideoId,
            hasCaptions: this.captionTracks && this.captionTracks.length > 0,
            isProcessing: this.isProcessing,
            languageCount: this.availableLanguages.length
        };
    }
}

// 创建全局实例
const downloader = new YouTubeSubtitleDownloader();

// 将实例暴露给全局作用域，便于调试
window.youTubeSubtitleDownloader = downloader;