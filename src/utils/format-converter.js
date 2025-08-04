/**
 * 字幕格式转换工具
 * 支持SRT、VTT等格式的转换
 */

/**
 * 转换为SRT格式
 * @param {Array} subtitles - 字幕数组
 * @returns {string} SRT格式文本
 */
export const convertToSRT = (subtitles) => {
    if (!subtitles || subtitles.length === 0) {
        return '';
    }
    
    return subtitles.map((subtitle, index) => {
        return `${index + 1}
${formatSRTTime(subtitle.start)} --> ${formatSRTTime(subtitle.end)}
${subtitle.text}`;
    }).join('\n\n');
};

/**
 * 转换为WebVTT格式
 * @param {Array} subtitles - 字幕数组
 * @returns {string} WebVTT格式文本
 */
export const convertToWebVTT = (subtitles) => {
    if (!subtitles || subtitles.length === 0) {
        return '';
    }
    
    let vttContent = 'WEBVTT\n\n';
    
    // 添加样式注释
    vttContent += 'STYLE\n';
    vttContent += '::cue {\n';
    vttContent += '  background-color: transparent;\n';
    vttContent += '  color: white;\n';
    vttContent += '  font-size: 16px;\n';
    vttContent += '}\n\n';
    
    vttContent += subtitles.map(subtitle => {
        return `${formatVTTTime(subtitle.start)} --> ${formatVTTTime(subtitle.end)}
${subtitle.text}`;
    }).join('\n\n');
    
    return vttContent;
};

/**
 * 转换为LRC格式（歌词格式）
 * @param {Array} subtitles - 字幕数组
 * @returns {string} LRC格式文本
 */
export const convertToLRC = (subtitles) => {
    if (!subtitles || subtitles.length === 0) {
        return '';
    }
    
    return subtitles.map(subtitle => {
        return `[${formatLRCTime(subtitle.start)}]${subtitle.text}`;
    }).join('\n');
};

/**
 * 转换为纯文本格式
 * @param {Array} subtitles - 字幕数组
 * @param {boolean} includeTimestamps - 是否包含时间戳
 * @returns {string} 纯文本格式
 */
export const convertToPlainText = (subtitles, includeTimestamps = false) => {
    if (!subtitles || subtitles.length === 0) {
        return '';
    }
    
    if (includeTimestamps) {
        return subtitles.map(subtitle => {
            return `[${subtitle.startTime}] ${subtitle.text}`;
        }).join('\n');
    }
    
    return subtitles.map(subtitle => subtitle.text).join('\n');
};

/**
 * 转换为JSON格式
 * @param {Array} subtitles - 字幕数组
 * @returns {string} JSON格式文本
 */
export const convertToJSON = (subtitles) => {
    if (!subtitles || subtitles.length === 0) {
        return '[]';
    }
    
    return JSON.stringify(subtitles, null, 2);
};

/**
 * 格式化SRT时间戳
 * @param {number} timeInSeconds - 秒数
 * @returns {string} SRT格式时间戳
 */
const formatSRTTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
};

/**
 * 格式化WebVTT时间戳
 * @param {number} timeInSeconds - 秒数
 * @returns {string} WebVTT格式时间戳
 */
const formatVTTTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

/**
 * 格式化LRC时间戳
 * @param {number} timeInSeconds - 秒数
 * @returns {string} LRC格式时间戳
 */
const formatLRCTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
};

/**
 * 从SRT格式解析字幕
 * @param {string} srtText - SRT格式文本
 * @returns {Array} 解析后的字幕数组
 */
export const parseSRT = (srtText) => {
    if (!srtText) return [];
    
    const lines = srtText.split('\n');
    const subtitles = [];
    let currentSubtitle = null;
    let lineIndex = 0;
    
    while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        if (line && !isNaN(line)) {
            // 序号行
            if (currentSubtitle) {
                subtitles.push(currentSubtitle);
            }
            
            currentSubtitle = {
                id: parseInt(line),
                text: ''
            };
            
            // 下一行应该是时间戳
            lineIndex++;
            if (lineIndex < lines.length) {
                const timeLine = lines[lineIndex].trim();
                const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                
                if (timeMatch) {
                    currentSubtitle.startTime = timeMatch[1];
                    currentSubtitle.endTime = timeMatch[2];
                    currentSubtitle.start = parseTimeToSeconds(timeMatch[1]);
                    currentSubtitle.end = parseTimeToSeconds(timeMatch[2]);
                    currentSubtitle.duration = currentSubtitle.end - currentSubtitle.start;
                }
            }
        } else if (currentSubtitle && line) {
            // 字幕文本行
            if (currentSubtitle.text) {
                currentSubtitle.text += '\n' + line;
            } else {
                currentSubtitle.text = line;
            }
        }
        
        lineIndex++;
    }
    
    if (currentSubtitle) {
        subtitles.push(currentSubtitle);
    }
    
    return subtitles;
};

/**
 * 从WebVTT格式解析字幕
 * @param {string} vttText - WebVTT格式文本
 * @returns {Array} 解析后的字幕数组
 */
export const parseWebVTT = (vttText) => {
    if (!vttText) return [];
    
    const lines = vttText.split('\n');
    const subtitles = [];
    let currentSubtitle = null;
    let lineIndex = 0;
    
    // 跳过WEBVTT头部
    while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        if (line === 'WEBVTT') {
            lineIndex++;
            break;
        }
        lineIndex++;
    }
    
    // 跳过样式和其他元数据
    while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        if (line && !line.startsWith('STYLE') && !line.startsWith('-->')) {
            break;
        }
        lineIndex++;
    }
    
    while (lineIndex < lines.length) {
        const line = lines[lineIndex].trim();
        
        if (line.includes('-->')) {
            // 时间戳行
            if (currentSubtitle) {
                subtitles.push(currentSubtitle);
            }
            
            currentSubtitle = {
                text: ''
            };
            
            const timeMatch = line.match(/(.+?) --> (.+)/);
            if (timeMatch) {
                currentSubtitle.startTime = timeMatch[1];
                currentSubtitle.endTime = timeMatch[2];
                currentSubtitle.start = parseTimeToSeconds(timeMatch[1]);
                currentSubtitle.end = parseTimeToSeconds(timeMatch[2]);
                currentSubtitle.duration = currentSubtitle.end - currentSubtitle.start;
            }
            
            lineIndex++;
            
            // 读取字幕文本
            while (lineIndex < lines.length) {
                const textLine = lines[lineIndex].trim();
                if (textLine) {
                    if (currentSubtitle.text) {
                        currentSubtitle.text += '\n' + textLine;
                    } else {
                        currentSubtitle.text = textLine;
                    }
                } else {
                    break;
                }
                lineIndex++;
            }
        } else {
            lineIndex++;
        }
    }
    
    if (currentSubtitle) {
        subtitles.push(currentSubtitle);
    }
    
    return subtitles;
};

/**
 * 将时间字符串转换为秒数
 * @param {string} timeString - 时间字符串
 * @returns {number} 秒数
 */
const parseTimeToSeconds = (timeString) => {
    const cleanTime = timeString.replace(',', '.');
    const parts = cleanTime.split(':');
    
    if (parts.length === 3) {
        // HH:MM:SS.mmm
        const hours = parseFloat(parts[0]);
        const minutes = parseFloat(parts[1]);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
        // MM:SS.mmm
        const minutes = parseFloat(parts[0]);
        const seconds = parseFloat(parts[1]);
        return minutes * 60 + seconds;
    }
    
    return parseFloat(cleanTime) || 0;
};

/**
 * 验证字幕数据格式
 * @param {Array} subtitles - 字幕数组
 * @returns {boolean} 是否有效
 */
export const validateSubtitles = (subtitles) => {
    if (!Array.isArray(subtitles)) {
        return false;
    }
    
    return subtitles.every(subtitle => 
        typeof subtitle.id === 'number' &&
        typeof subtitle.start === 'number' &&
        typeof subtitle.end === 'number' &&
        typeof subtitle.text === 'string' &&
        subtitle.start >= 0 &&
        subtitle.end > subtitle.start &&
        subtitle.text.trim().length > 0
    );
};

/**
 * 调整字幕时间偏移
 * @param {Array} subtitles - 字幕数组
 * @param {number} offset - 时间偏移（秒）
 * @returns {Array} 调整后的字幕数组
 */
export const adjustSubtitleTiming = (subtitles, offset) => {
    if (!subtitles || !Array.isArray(subtitles)) {
        return [];
    }
    
    return subtitles.map(subtitle => ({
        ...subtitle,
        start: Math.max(0, subtitle.start + offset),
        end: Math.max(0, subtitle.end + offset),
        startTime: formatSRTTime(Math.max(0, subtitle.start + offset)),
        endTime: formatSRTTime(Math.max(0, subtitle.end + offset))
    }));
};

/**
 * 合并多个字幕文件
 * @param {Array} subtitleArrays - 字幕数组数组
 * @returns {Array} 合并后的字幕数组
 */
export const mergeMultipleSubtitles = (subtitleArrays) => {
    if (!subtitleArrays || subtitleArrays.length === 0) {
        return [];
    }
    
    if (subtitleArrays.length === 1) {
        return subtitleArrays[0];
    }
    
    // 简单的合并策略：按时间戳排序并合并
    const allSubtitles = subtitleArrays.flat();
    
    // 按开始时间排序
    allSubtitles.sort((a, b) => a.start - b.start);
    
    // 重新分配ID
    return allSubtitles.map((subtitle, index) => ({
        ...subtitle,
        id: index + 1
    }));
};