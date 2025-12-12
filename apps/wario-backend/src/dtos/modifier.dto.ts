import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { IOptionDto, IOptionTypeDto } from '@wcp/wario-shared';

// modifierTypeId is no longer on IOptionDto in 2025 schema
export class CreateOptionDto extends OmitType(IOptionDto, ['id'] as const) {}

// we might want to accept the options field?
export class CreateModifierTypeDto extends OmitType(IOptionTypeDto, ['id', 'options'] as const) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options!: CreateOptionDto[];
}

export class UpdateModifierTypeDto extends PartialType(IOptionTypeDto) {}

export class UpdateOptionDto extends PartialType(CreateOptionDto) {}
