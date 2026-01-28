import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';
import { ASIAN_MARKET_VOICES } from '@/constants/voice-presets';

export class CommercialPipelineDto {
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  // Duration 保持不变
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsInt()
  @IsIn([5, 10, 15])
  duration: number;

  // ⚠️ 修改点 1: Resolution 变得不那么重要了，可以留着做兼容，或者标为可选
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  // 其他参数保持不变...
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  negative_prompt?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @IsIn(['single', 'multi'])
  shot_type?: 'single' | 'multi';

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @IsIn(ASIAN_MARKET_VOICES.map((v) => v.id))
  voice_id?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableSmartEnhance?: boolean;

  // 🔥🔥🔥 修改点 2: 扩展允许的值，使其包含所有画质档位
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  // 允许 '720p', '1080p' (基础档) 以及 '2k', '4k' (超分档)
  @IsIn(['default', '720p', '1080p', '2k', '4k'])
  enableUpscale?: 'default' | '720p' | '1080p' | '2k' | '4k';
}
