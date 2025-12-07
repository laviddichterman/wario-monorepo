import { OmitType, PartialType } from '@nestjs/mapped-types';

import { FulfillmentConfigDto } from '@wcp/wario-shared';

export class CreateFulfillmentDto extends OmitType(FulfillmentConfigDto, ['id'] as const) {}

export class UpdateFulfillmentDto extends PartialType(CreateFulfillmentDto) {}
