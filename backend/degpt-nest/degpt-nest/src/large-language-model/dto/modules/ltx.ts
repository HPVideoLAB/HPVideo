// dto/modules/ltx.ts
import {
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class LtxDto {
  @ValidateIf(
    (o) => o.model === 'ltx-2-19b' || o.model === 'commercial-pipeline',
  )
  @IsOnlyForModel(['ltx-2-19b', 'commercial-pipeline'])
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  @IsOptional()
  @ValidateIf(
    (o) => o.model === 'ltx-2-19b' || o.model === 'commercial-pipeline',
  )
  @IsOnlyForModel(['ltx-2-19b', 'commercial-pipeline'])
  @IsInt()
  @Min(5)
  @Max(20)
  duration?: number;
}
