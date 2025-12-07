import { OmitType, PartialType } from '@nestjs/mapped-types';

import { IProductInstanceFunctionDto } from '@wcp/wario-shared';

export class CreateProductInstanceFunctionDto extends OmitType(IProductInstanceFunctionDto, ['id'] as const) {}

export class UpdateProductInstanceFunctionDto extends PartialType(CreateProductInstanceFunctionDto) {}
