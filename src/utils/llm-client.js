/**
 * LLM客户端工具
 * 支持OpenAI和Anthropic API调用
 */

/**
 * LLM配置类
 */
export class LLMConfig {
    constructor() {
        this.providers = {
            openai: {
                apiKey: '',
                model: 'gpt-3.5-turbo',
                baseUrl: 'https://api.openai.com/v1',
                maxTokens: 2000,
                temperature: 0.7
            },
            anthropic: {
                apiKey: '',
                model: 'claude-3-sonnet-20240229',
                baseUrl: 'https://api.anthropic.com',
                maxTokens: 2000,
                temperature: 0.7
            }
        };
    }

    /**
     * 从Chrome存储加载配置
     */
    async loadFromStorage() {
        try {
            const result = await chrome.storage.sync.get('llmConfig');
            if (result.llmConfig) {
                const config = JSON.parse(result.llmConfig);
                this.providers = { ...this.providers, ...config };
            }
        } catch (error) {
            console.error('加载LLM配置失败:', error);
        }
    }

    /**
     * 保存配置到Chrome存储
     */
    async saveToStorage() {
        try {
            await chrome.storage.sync.set({
                llmConfig: JSON.stringify(this.providers)
            });
        } catch (error) {
            console.error('保存LLM配置失败:', error);
        }
    }

    /**
     * 获取指定提供商的配置
     * @param {string} provider - 提供商名称
     * @returns {Object} 配置对象
     */
    getConfig(provider) {
        return this.providers[provider] || null;
    }

    /**
     * 更新指定提供商的配置
     * @param {string} provider - 提供商名称
     * @param {Object} config - 新配置
     */
    updateConfig(provider, config) {
        if (this.providers[provider]) {
            this.providers[provider] = { ...this.providers[provider], ...config };
        }
    }

    /**
     * 验证配置是否完整
     * @param {string} provider - 提供商名称
     * @returns {boolean} 是否有效
     */
    validateConfig(provider) {
        const config = this.providers[provider];
        if (!config) return false;
        
        return config.apiKey && config.apiKey.trim() !== '';
    }
}

/**
 * LLM客户端类
 */
export class LLMClient {
    constructor() {
        this.config = new LLMConfig();
    }

    /**
     * 初始化配置
     */
    async init() {
        await this.config.loadFromStorage();
    }

    /**
     * 优化字幕文本
     * @param {string} text - 字幕文本
     * @param {string} provider - LLM提供商
     * @param {Object} options - 选项
     * @returns {Promise<string>} 优化后的文本
     */
    async optimizeSubtitle(text, provider = 'openai', options = {}) {
        const config = this.config.getConfig(provider);
        if (!config || !this.config.validateConfig(provider)) {
            throw new Error(`${provider} 配置不完整`);
        }

        const prompt = this.buildOptimizePrompt(text, options);

        switch (provider) {
            case 'openai':
                return await this.callOpenAI(prompt, config);
            case 'anthropic':
                return await this.callAnthropic(prompt, config);
            default:
                throw new Error(`不支持的LLM提供商: ${provider}`);
        }
    }

    /**
     * 翻译字幕文本
     * @param {string} text - 字幕文本
     * @param {string} targetLanguage - 目标语言
     * @param {string} provider - LLM提供商
     * @returns {Promise<string>} 翻译后的文本
     */
    async translateSubtitle(text, targetLanguage, provider = 'openai') {
        const config = this.config.getConfig(provider);
        if (!config || !this.config.validateConfig(provider)) {
            throw new Error(`${provider} 配置不完整`);
        }

        const prompt = this.buildTranslatePrompt(text, targetLanguage);

        switch (provider) {
            case 'openai':
                return await this.callOpenAI(prompt, config);
            case 'anthropic':
                return await this.callAnthropic(prompt, config);
            default:
                throw new Error(`不支持的LLM提供商: ${provider}`);
        }
    }

    /**
     * 批量处理字幕
     * @param {Array} subtitles - 字幕数组
     * @param {string} operation - 操作类型 ('optimize' 或 'translate')
     * @param {string} provider - LLM提供商
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 处理后的字幕数组
     */
    async processSubtitles(subtitles, operation = 'optimize', provider = 'openai', options = {}) {
        if (!subtitles || subtitles.length === 0) {
            return [];
        }

        // 限制批量处理大小
        const batchSize = 50;
        const results = [];

        for (let i = 0; i < subtitles.length; i += batchSize) {
            const batch = subtitles.slice(i, i + batchSize);
            const batchResults = await this.processBatch(batch, operation, provider, options);
            results.push(...batchResults);
            
            // 避免API限制
            if (i + batchSize < subtitles.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    }

    /**
     * 处理单个批次
     * @param {Array} batch - 字幕批次
     * @param {string} operation - 操作类型
     * @param {string} provider - LLM提供商
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 处理后的字幕数组
     */
    async processBatch(batch, operation, provider, options) {
        const promises = batch.map(async (subtitle) => {
            try {
                let processedText;
                
                if (operation === 'optimize') {
                    processedText = await this.optimizeSubtitle(subtitle.text, provider, options);
                } else if (operation === 'translate') {
                    processedText = await this.translateSubtitle(subtitle.text, options.targetLanguage, provider);
                } else {
                    throw new Error(`不支持的操作: ${operation}`);
                }

                return {
                    ...subtitle,
                    text: processedText,
                    processed: true
                };
            } catch (error) {
                console.error(`处理字幕失败 (ID: ${subtitle.id}):`, error);
                return {
                    ...subtitle,
                    processed: false,
                    error: error.message
                };
            }
        });

        return Promise.all(promises);
    }

    /**
     * 调用OpenAI API
     * @param {string} prompt - 提示词
     * @param {Object} config - 配置
     * @returns {Promise<string>} 响应文本
     */
    async callOpenAI(prompt, config) {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: config.maxTokens,
                temperature: config.temperature
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API错误: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content?.trim() || '';
    }

    /**
     * 调用Anthropic API
     * @param {string} prompt - 提示词
     * @param {Object} config - 配置
     * @returns {Promise<string>} 响应文本
     */
    async callAnthropic(prompt, config) {
        const response = await fetch(`${config.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic API错误: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content[0]?.text?.trim() || '';
    }

    /**
     * 构建优化提示词
     * @param {string} text - 字幕文本
     * @param {Object} options - 选项
     * @returns {string} 提示词
     */
    buildOptimizePrompt(text, options = {}) {
        const {
            style = '自然流畅',
            preserveMeaning = true,
            removeErrors = true,
            improveGrammar = true
        } = options;

        let prompt = `请优化以下字幕文本，要求：\n`;
        prompt += `- 风格：${style}\n`;
        
        if (preserveMeaning) {
            prompt += `- 保持原意不变\n`;
        }
        
        if (removeErrors) {
            prompt += `- 修正明显的错误和不通顺的表达\n`;
        }
        
        if (improveGrammar) {
            prompt += `- 改善语法和标点符号\n`;
        }
        
        prompt += `- 保持字幕简洁，避免过长\n`;
        prompt += `- 只返回优化后的文本，不要添加解释\n\n`;
        prompt += `原文本：\n${text}\n\n`;
        prompt += `优化后的文本：`;

        return prompt;
    }

    /**
     * 构建翻译提示词
     * @param {string} text - 字幕文本
     * @param {string} targetLanguage - 目标语言
     * @returns {string} 提示词
     */
    buildTranslatePrompt(text, targetLanguage) {
        const prompt = `请将以下字幕文本翻译为${targetLanguage}，要求：\n`;
        prompt += `- 保持原意和语气\n`;
        prompt += `- 翻译要自然流畅，符合目标语言的表达习惯\n`;
        prompt += `- 保持字幕简洁，避免过长\n`;
        prompt += `- 只返回翻译后的文本，不要添加解释\n\n`;
        prompt += `原文本：\n${text}\n\n`;
        prompt += `翻译后的文本：`;

        return prompt;
    }

    /**
     * 测试API连接
     * @param {string} provider - LLM提供商
     * @returns {Promise<boolean>} 是否连接成功
     */
    async testConnection(provider) {
        try {
            const config = this.config.getConfig(provider);
            if (!config || !this.config.validateConfig(provider)) {
                return false;
            }

            const testPrompt = '请回复"连接成功"';
            const response = await this.optimizeSubtitle(testPrompt, provider);
            
            return response && response.includes('连接成功');
        } catch (error) {
            console.error('测试连接失败:', error);
            return false;
        }
    }

    /**
     * 获取使用统计
     * @returns {Promise<Object>} 使用统计信息
     */
    async getUsageStats() {
        try {
            const result = await chrome.storage.local.get('llmUsageStats');
            return result.llmUsageStats || {
                totalRequests: 0,
                totalTokens: 0,
                providerStats: {}
            };
        } catch (error) {
            console.error('获取使用统计失败:', error);
            return {
                totalRequests: 0,
                totalTokens: 0,
                providerStats: {}
            };
        }
    }

    /**
     * 更新使用统计
     * @param {string} provider - LLM提供商
     * @param {number} tokens - 使用的token数
     */
    async updateUsageStats(provider, tokens = 0) {
        try {
            const stats = await this.getUsageStats();
            stats.totalRequests++;
            stats.totalTokens += tokens;
            
            if (!stats.providerStats[provider]) {
                stats.providerStats[provider] = {
                    requests: 0,
                    tokens: 0
                };
            }
            
            stats.providerStats[provider].requests++;
            stats.providerStats[provider].tokens += tokens;
            
            await chrome.storage.local.set({ llmUsageStats: stats });
        } catch (error) {
            console.error('更新使用统计失败:', error);
        }
    }
}

/**
 * 创建全局LLM客户端实例
 */
export const llmClient = new LLMClient();