import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { IOptionDto, IOptionTypeDto } from '@wcp/wario-shared';

export class CreateOptionDto extends OmitType(IOptionDto, ['id', 'modifierTypeId'] as const) {}

export class CreateModifierTypeDto extends OmitType(IOptionTypeDto, ['id'] as const) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options!: CreateOptionDto[];
}

export class UpdateModifierTypeDto extends PartialType(IOptionTypeDto) {}

export class UpdateOptionDto extends PartialType(IOptionDto) {}
