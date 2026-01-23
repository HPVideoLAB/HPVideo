import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class PipelineDto {
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @IsUrl()
  image?: string; // 产品图

  @IsOptional()
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableSmartEnhance?: boolean;

  // Kling 必传（由 DTO 强制）
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  sound_effect_prompt!: string;

  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  bgm_prompt!: string;

  @IsOptional()
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  asmr_mode?: boolean;

  @IsOptional()
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableUpscale?: boolean;

  @IsOptional()
  @IsOnlyForModel(['commercial-pipeline'])
  @IsIn(['720p', '1080p', '2k', '4k'])
  target_resolution?: '720p' | '1080p' | '2k' | '4k';
}
