import {
  IsString,
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
  // LTX 专属：单张图片 string
  @ValidateIf((o) => o.model === 'ltx-2-19b')
  @IsOnlyForModel(['ltx-2-19b'])
  @IsUrl()
  @IsNotEmpty()
  image?: string;

  // LTX 专属：Duration (5-20)
  // 注意：虽然变量名和 Wan 一样，但因为文件隔离 + ValidateIf，不会冲突
  @IsOptional()
  @ValidateIf((o) => o.model === 'ltx-2-19b')
  @IsOnlyForModel(['ltx-2-19b'])
  @IsInt()
  @Min(5)
  @Max(20)
  duration?: number;
}
