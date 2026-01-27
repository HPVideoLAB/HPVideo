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

  // ✅ 1. 在这里自己定义 Duration
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsInt()
  @IsIn([5, 10, 15]) // Pipeline/Wan 只支持这三个
  duration: number;

  // ✅ 2. 在这里自己定义 Resolution
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  // ✅ 3. 其他参数
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

  // ✅ 新增：用户指定的音色 ID
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @IsIn(ASIAN_MARKET_VOICES.map((v) => v.id)) // 🔒 必须是预设列表里的 ID
  voice_id?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableSmartEnhance?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @IsIn(['default', '2k', '4k'])
  enableUpscale?: 'default' | '2k' | '4k';
}
