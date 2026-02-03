import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
// 1. 引入代理库
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class UseOpenAI {
  private readonly logger = new Logger(UseOpenAI.name);
  private readonly openai: OpenAI;

  constructor() {
    // =========================================================
    // 🔥 硬编码配置区域
    // =========================================================
    const PROXY_URL = 'http://127.0.0.1:7890'; // 你的本地梯子地址

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 500000,
      ...(process.env.NODE_ENV === 'production'
        ? {}
        : { httpAgent: new HttpsProxyAgent(PROXY_URL) }),
    } as any);
  }

  /**
   * 调用 GPT-5.2 Responses API
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
      const fullInput = `${systemPrompt}\n\n${userPrompt}`;

      const requestParams: any = {
        model: 'gpt-5.2',
        input: fullInput,
        reasoning: { effort: reasoningEffort },
        text: { verbosity: verbosity },
        max_output_tokens: maxTokens,
      };

      if (reasoningEffort === 'none') {
        requestParams.temperature = temperature;
      }

      // 强制传入 timeout
      const response: any = await this.openai.responses.create(requestParams, {
        timeout: 180000,
      });

      let content: any = '';

      if (response?.output?.[0]) {
        const outputItem = response.output[0];
        if (outputItem.content?.[0]?.text) {
          content = outputItem.content[0].text;
        } else {
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

  // ... callGPT52WithRetry 保持不变 ...
  async callGPT52WithRetry(
    systemPrompt: string,
    userPrompt: string,
    options?: any,
    retries: number = 2,
  ): Promise<string> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await this.callGPT52(systemPrompt, userPrompt, options);
      } catch (error: any) {
        lastError = error;
        if (
          error.message &&
          (error.message.includes('timeout') ||
            error.message.includes('ECONNRESET'))
        ) {
          if (i < retries - 1) {
            this.logger.warn(`[OpenAI] Retrying (${i + 1}/${retries})...`);
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError || new Error('OpenAI request failed after retries');
  }
}
