import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class KlingAudioDto {
  @ValidateIf((o) => o.model === 'kling-video-to-audio')
  @IsOnlyForModel(['kling-video-to-audio'])
  @IsString()
  @IsUrl()
  video?: string;

  // ✅ pipeline 也要用，所以允许 commercial-pipeline
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.model === 'kling-video-to-audio' || o.model === 'commercial-pipeline',
  )
  @IsOnlyForModel(['kling-video-to-audio', 'commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  sound_effect_prompt?: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o.model === 'kling-video-to-audio' || o.model === 'commercial-pipeline',
  )
  @IsOnlyForModel(['kling-video-to-audio', 'commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  bgm_prompt?: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o.model === 'kling-video-to-audio' || o.model === 'commercial-pipeline',
  )
  @IsOnlyForModel(['kling-video-to-audio', 'commercial-pipeline'])
  @IsBoolean()
  asmr_mode?: boolean;
}
