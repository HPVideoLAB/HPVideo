// commercial-pipeline.ts
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
  // 🔥 [修改] image: Wan 2.6 也有这个字段，必须删掉 IsOnlyForModel
  // 逻辑不变: 只有 model 是 commercial 时，才校验必须是 URL 且非空
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  // 🔥 [修改] duration: Wan 2.1 / 2.6 都有，必须删掉 IsOnlyForModel
  // 逻辑不变: Commercial 依然只能传 5, 10, 15
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsInt()
  @IsIn([5, 10, 15])
  duration: number;

  // 🔥 [修改] resolution: Wan 2.6 / Pika 都有，必须删掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  // 🔥 [修改] negative_prompt: Wan 系列都有，必须删掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsString()
  negative_prompt?: string;

  // 🔥 [修改] shot_type: Wan 2.6 也有，必须删掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsString()
  @IsIn(['single', 'multi'])
  shot_type?: 'single' | 'multi';

  // --- 下面这些字段目前是 Commercial 独有的，保留 IsOnlyForModel 没问题 ---
  // --- 但为了统一风格和防止未来冲突，删掉 IsOnlyForModel 也是安全的 (只要有 ValidateIf) ---
  // --- 这里我保留了 voice_id 等独有字段的 IsOnlyForModel，由你决定是否要极致纯净 ---

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline']) // 独有字段，可以保留
  @IsString()
  @IsIn(ASIAN_MARKET_VOICES.map((v) => v.id))
  voice_id?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline']) // 独有字段，可以保留
  @IsBoolean()
  enableSmartEnhance?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline']) // 独有字段，可以保留
  @IsString()
  @IsIn(['default', '720p', '1080p', '2k', '4k'])
  enableUpscale?: 'default' | '720p' | '1080p' | '2k' | '4k';
}
