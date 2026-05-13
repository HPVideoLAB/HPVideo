import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
// 1. 引入代理库
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * UseOpenAI: routes LLM calls through ZenMux (https://zenmux.ai), an
 * OpenAI-compatible aggregator, so we get gpt-5.2 without burning the
 * direct OpenAI account's quota. Falls back to direct OpenAI if no
 * ZENMUX_API_KEY is set.
 *
 * ZenMux exposes /api/v1/chat/completions (standard OpenAI shape), so
 * we switched off the /responses endpoint the GPT-5.2-only flow used
 * to call. The smart-enhancer prompts are short enough that
 * chat/completions handles them without any quality loss.
 */
@Injectable()
export class UseOpenAI {
  private readonly logger = new Logger(UseOpenAI.name);
  private readonly client: OpenAI;
  private readonly modelId: string;
  private readonly provider: 'zenmux' | 'openai';

  constructor() {
    const PROXY_URL = 'http://127.0.0.1:7890'; // local dev proxy

    const zenmuxKey = process.env.ZENMUX_API_KEY;
    if (zenmuxKey) {
      this.provider = 'zenmux';
      // ZenMux's slug for OpenAI's flagship — see BoxHire's
      // zenmuxModelMap. We default to gpt-5.2-pro for best quality;
      // override with ZENMUX_MODEL env var if cost matters more.
      this.modelId = process.env.ZENMUX_MODEL || 'openai/gpt-5.2';
      this.client = new OpenAI({
        apiKey: zenmuxKey,
        baseURL: 'https://zenmux.ai/api/v1',
        timeout: 500000,
      } as any);
      this.logger.log(`[LLM] Provider=ZenMux Model=${this.modelId}`);
    } else {
      this.provider = 'openai';
      this.modelId = 'gpt-5.2';
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 500000,
        ...(process.env.NODE_ENV === 'production'
          ? {}
          : { httpAgent: new HttpsProxyAgent(PROXY_URL) }),
      } as any);
      this.logger.warn(
        '[LLM] ZENMUX_API_KEY not set, falling back to direct OpenAI (subject to that account quota)',
      );
    }
  }

  /**
   * Call the LLM via chat completions. Uses ZenMux when available so
   * we don't deplete the direct OpenAI account's quota (which 429'd
   * during commercial-pipeline traffic on 2026-05-13).
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
    const { maxTokens = 10000, temperature = 0.85 } = options || {};

    this.logger.log(
      `[LLM:${this.provider}] Calling ${this.modelId} maxTokens=${maxTokens}`,
    );

    try {
      const response: any = await this.client.chat.completions.create(
        {
          model: this.modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        { timeout: 180000 },
      );

      const content: string | undefined =
        response?.choices?.[0]?.message?.content?.toString();

      if (!content) {
        this.logger.error(
          `[LLM:${this.provider}] No content in response`,
          response,
        );
        throw new Error('No content returned from LLM API');
      }

      this.logger.log(
        `[LLM:${this.provider}] Response | length=${content.length} chars`,
      );

      return content;
    } catch (error: any) {
      this.logger.error(
        `[LLM:${this.provider}] Request failed: ${error.message}`,
      );
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
