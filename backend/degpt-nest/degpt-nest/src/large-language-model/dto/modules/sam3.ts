// src\large-language-model\dto\modules\sam3.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class Sam3Dto {
  // 🔥🔥🔥 [修改点] video 是共享字段 (Wan/Upscaler 也有)
  // 必须删掉 @IsOnlyForModel，否则会拦截其他模型的请求
  @ValidateIf((o) => o.model === 'sam3')
  // ❌ 删除这一行: @IsOnlyForModel(['sam3'])
  @IsString()
  @IsNotEmpty()
  video?: string;

  // apply_mask 是 Sam3 独有字段，保留 IsOnlyForModel 没问题
  // 建议补上 ValidateIf 以保持风格统一
  @IsOptional()
  @ValidateIf((o) => o.model === 'sam3')
  @IsOnlyForModel(['sam3'])
  @IsBoolean()
  apply_mask?: boolean;
}
