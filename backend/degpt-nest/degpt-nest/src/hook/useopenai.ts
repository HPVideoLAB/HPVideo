import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * OpenAI GPT-5.2 Hook
 * 使用官方 OpenAI SDK 调用 GPT-5.2 Responses API
 */
@Injectable()
export class UseOpenAI {
  private readonly logger = new Logger(UseOpenAI.name);
  private readonly openai: OpenAI;

  constructor() {
    // 初始化 OpenAI 客户端
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 调用 GPT-5.2 Responses API
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @param options 可选配置
   * @returns GPT-5.2 响应内容
   */
  async callGPT52(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh';
      verbosity?: 'low' | 'medium' | 'high';
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<string> {
    const {
      reasoningEffort = 'none',
      verbosity = 'medium',
      maxTokens = 10000,
      temperature = 0.85,
    } = options || {};

    this.logger.log(
      `[OpenAI] Calling GPT-5.2 | Reasoning: ${reasoningEffort} | Verbosity: ${verbosity}`,
    );

    try {
      // 构建完整的输入内容（合并 system 和 user prompt）
      const fullInput = `${systemPrompt}\n\n${userPrompt}`;

      // 构建请求参数
      const requestParams: any = {
        model: 'gpt-5.2',
        input: fullInput,
        reasoning: {
          effort: reasoningEffort,
        },
        text: {
          verbosity: verbosity,
        },
        max_output_tokens: maxTokens,
      };

      // 只有在 reasoning effort 为 none 时才支持 temperature
      if (reasoningEffort === 'none') {
        requestParams.temperature = temperature;
      }

      // 使用 OpenAI SDK 调用 Responses API
      const response: any = await this.openai.responses.create(requestParams);

      // 从响应中提取内容
      // 响应格式: { output: [{ content: [{ type: "output_text", text: "..." }] }] }
      let content: any = '';

      if (response?.output?.[0]) {
        const outputItem = response.output[0];

        // 正确的路径：output[0].content[0].text
        if (outputItem.content?.[0]?.text) {
          content = outputItem.content[0].text;
        } else {
          // 兼容其他可能的格式
          content = outputItem.text || outputItem.content || '';
        }
      }

      if (!content || typeof content !== 'string') {
        this.logger.error('[OpenAI] No valid content in response', response);
        throw new Error('No content returned from OpenAI API');
      }

      this.logger.log(
        `[OpenAI] Response received | Length: ${content.length} chars`,
      );

      return content;
    } catch (error: any) {
      this.logger.error(`[OpenAI] Request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 带重试机制的 GPT-5.2 调用
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @param options 可选配置
   * @param retries 重试次数
   * @returns GPT-5.2 响应内容
   */
  async callGPT52WithRetry(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh';
      verbosity?: 'low' | 'medium' | 'high';
      maxTokens?: number;
      temperature?: number;
    },
    retries: number = 2,
  ): Promise<string> {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        return await this.callGPT52(systemPrompt, userPrompt, options);
      } catch (error: any) {
        lastError = error;

        // 如果是 504 或 502 错误，重试
        if (
          error.message.includes('504') ||
          error.message.includes('502') ||
          error.message.includes('Gateway Timeout')
        ) {
          if (i < retries - 1) {
            this.logger.warn(`[OpenAI] Retrying (${i + 1}/${retries})...`);
            continue;
          }
        }

        // 其他错误直接抛出
        throw error;
      }
    }

    throw lastError || new Error('OpenAI request failed after retries');
  }
}
