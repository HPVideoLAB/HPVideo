import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class CommercialPipelineDto {
  // ✅ 产品图（作为 startFrame / 或未开启 smartEnhance 时的输入）
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  // ✅ 是否启用智能优化
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableSmartEnhance?: boolean;

  // ✅ LTX 生成视频时长（你 hook 已支持 duration）
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsInt()
  @Min(5)
  @Max(20)
  duration?: number;

  // ✅ 音效/配乐：pipeline 也要用（<=200 chars）
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  sound_effect_prompt?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  bgm_prompt?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  asmr_mode?: boolean;

  // ✅ 是否提升画质
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableUpscale?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsIn(['720p', '1080p', '2k', '4k'])
  target_resolution?: '720p' | '1080p' | '2k' | '4k';
}
