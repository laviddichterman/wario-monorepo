import { IsArray, IsString } from 'class-validator';

export class BatchDeleteProductClassDto {
  @IsArray()
  @IsString({ each: true })
  pids!: string[];
}
