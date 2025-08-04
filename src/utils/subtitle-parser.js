/**
 * YouTube字幕解析工具
 * 用于解析YouTube页面的字幕数据
 */

/**
 * 从页面HTML中提取播放器响应数据
 * @param {string} pageText - 页面HTML文本
 * @returns {Object} 解析后的播放器响应数据
 */
export const extractPlayerResponse = (pageText) => {
    // 尝试多种匹配模式
    const patterns = [
        /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
        /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?})\s*;/,
        /var\s+ytInitialPlayerResponse\s*=\s*({.+?})\s*;/
    ];
    
    for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (error) {
                console.warn('解析播放器响应失败:', error);
            }
        }
    }
    
    throw new Error('无法提取播放器响应数据');
};

/**
 * 从播放器响应中提取字幕轨道信息
 * @param {Object} playerResponse - 播放器响应数据
 * @returns {Array|null} 字幕轨道数组或null
 */
export const extractCaptionTracks = (playerResponse) => {
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
        return null;
    }
    
    return captionTracks.map(track => ({
        baseUrl: track.baseUrl,
        languageCode: track.languageCode,
        name: track.name?.simpleText || track.languageCode,
        isTranslatable: track.isTranslatable || false,
        kind: track.kind || '',
        vssId: track.vssId || ''
    }));
};

/**
 * 获取可用的语言列表
 * @param {Array} captionTracks - 字幕轨道数组
 * @returns {Array} 语言选项数组
 */
export const getAvailableLanguages = (captionTracks) => {
    if (!captionTracks) return [];
    
    const languages = new Map();
    
    captionTracks.forEach(track => {
        const code = track.languageCode;
        const name = track.name;
        
        if (!languages.has(code)) {
            languages.set(code, {
                code,
                name,
                isTranslatable: track.isTranslatable
            });
        }
    });
    
    return Array.from(languages.values());
};

/**
 * 构建字幕下载URL
 * @param {Array} captionTracks - 字幕轨道数组
 * @param {string} targetLanguage - 目标语言代码
 * @param {boolean} translate - 是否需要翻译
 * @param {string} translateTo - 翻译目标语言
 * @returns {string|null} 字幕URL或null
 */
export const buildSubtitleUrl = (captionTracks, targetLanguage, translate = false, translateTo = null) => {
    if (!captionTracks || captionTracks.length === 0) {
        return null;
    }
    
    // 查找目标语言的字幕轨道
    const targetTrack = captionTracks.find(track => track.languageCode === targetLanguage);
    
    if (!targetTrack) {
        // 如果没有找到目标语言，使用第一个可用的轨道
        const fallbackTrack = captionTracks[0];
        let url = fallbackTrack.baseUrl;
        
        if (translate && translateTo && fallbackTrack.isTranslatable) {
            const urlObj = new URL(url);
            urlObj.searchParams.append('tlang', translateTo);
            url = urlObj.toString();
        }
        
        return url;
    }
    
    let url = targetTrack.baseUrl;
    
    if (translate && translateTo && targetTrack.isTranslatable) {
        const urlObj = new URL(url);
        urlObj.searchParams.append('tlang', translateTo);
        url = urlObj.toString();
    }
    
    return url;
};

/**
 * 解析XML字幕内容
 * @param {string} xmlText - XML格式的字幕文本
 * @returns {Array} 解析后的字幕数组
 */
export const parseYouTubeSubtitles = async (xmlText) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        
        // 检查解析错误
        const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
        if (parseError) {
            throw new Error('XML解析失败');
        }
        
        const textNodes = Array.from(xmlDoc.getElementsByTagName("text"));
        
        return textNodes.map((node, index) => {
            const start = parseFloat(node.getAttribute("start")) || 0;
            const duration = parseFloat(node.getAttribute("dur")) || 0;
            const end = start + duration;
            
            return {
                id: index + 1,
                start,
                end,
                duration,
                text: node.textContent.trim(),
                startTime: formatTime(start),
                endTime: formatTime(end)
            };
        });
    } catch (error) {
        console.error('解析字幕失败:', error);
        throw error;
    }
};

/**
 * 格式化时间戳
 * @param {number} timeInSeconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

/**
 * 合并两种语言的字幕
 * @param {Array} originalSubtitles - 原始字幕
 * @param {Array} translatedSubtitles - 翻译字幕
 * @returns {Array} 合并后的字幕数组
 */
export const mergeBilingualSubtitles = (originalSubtitles, translatedSubtitles) => {
    if (!originalSubtitles || originalSubtitles.length === 0) {
        return translatedSubtitles || [];
    }
    
    if (!translatedSubtitles || translatedSubtitles.length === 0) {
        return originalSubtitles;
    }
    
    // 基于时间戳匹配字幕
    return originalSubtitles.map(original => {
        const translated = translatedSubtitles.find(trans => 
            Math.abs(trans.start - original.start) < 0.5 // 时间差小于0.5秒视为匹配
        );
        
        return {
            ...original,
            text: translated ? `${original.text}\n${translated.text}` : original.text
        };
    });
};

/**
 * 带重试机制的字幕下载
 * @param {string} url - 字幕URL
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<string>} 字幕XML文本
 */
export const fetchSubtitlesWithRetry = async (url, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetchWithTimeout(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            if (i === maxRetries - 1) {
                throw new Error(`字幕下载失败，已重试 ${maxRetries} 次: ${error.message}`);
            }
            // 指数退避
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
};

/**
 * 带超时的fetch请求
 * @param {string} url - 请求URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>} fetch响应
 */
const fetchWithTimeout = async (url, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};