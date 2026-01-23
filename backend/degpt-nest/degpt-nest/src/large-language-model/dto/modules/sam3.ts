import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class Sam3Dto {
  // Video 在 Sam3 中也是必填，虽然与 Wan 相同，但物理隔离写一遍更清晰
  @ValidateIf((o) => o.model === 'sam3')
  @IsOnlyForModel(['sam3'])
  @IsString()
  @IsNotEmpty()
  video?: string;

  @IsOptional()
  @IsOnlyForModel(['sam3'])
  @IsBoolean()
  apply_mask?: boolean;
}
