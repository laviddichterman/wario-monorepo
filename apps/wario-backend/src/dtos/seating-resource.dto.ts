import { OmitType, PartialType } from '@nestjs/mapped-types';

import { SeatingResourceDto } from '@wcp/wario-shared';

export class CreateSeatingResourceDto extends OmitType(SeatingResourceDto, ['id'] as const) {}

export class UpdateSeatingResourceDto extends PartialType(CreateSeatingResourceDto) {}
