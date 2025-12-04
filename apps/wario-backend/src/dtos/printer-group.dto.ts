import { OmitType, PartialType } from '@nestjs/mapped-types';

import { PrinterGroupDto } from '@wcp/wario-shared';

export class CreatePrinterGroupDto extends OmitType(PrinterGroupDto, ['id'] as const) { };

export class UpdatePrinterGroupDto extends PartialType(PrinterGroupDto) { };