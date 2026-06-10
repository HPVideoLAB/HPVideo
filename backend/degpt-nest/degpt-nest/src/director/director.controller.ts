import { Body, Controller, Post, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { DirectorService } from './director.service';

/**
 * Director Mode endpoints, mounted under /director.
 *
 * Frontend proxies through the studio's existing /nest-proxy mount
 * so calls land at:
 *   POST /creator/nest-proxy/director/plan
 */
@Controller('director')
export class DirectorController {
  constructor(private readonly directorService: DirectorService) {}

  @Post('plan')
  async plan(
    @Body('text') text: string,
    @Body('lang') lang?: 'en' | 'zh' | 'ja' | 'ko',
  ) {
    if (!text || typeof text !== 'string') {
      throw new BadRequestException('missing text');
    }
    try {
      return await this.directorService.plan({ rawText: text, lang });
    } catch (e: any) {
      // LLM upstream failure (ZenMux 5xx, JSON parse, etc.) — surface
      // a 502 so the studio can show a retryable error rather than a
      // generic 500.
      throw new HttpException(
        { message: e?.message || 'director plan failed' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
