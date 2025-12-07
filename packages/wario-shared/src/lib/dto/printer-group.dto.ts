import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

import { KeyValueDto } from './common.dto';

export class PrinterGroupDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsBoolean()
  singleItemPerTicket!: boolean;

  @IsBoolean()
  isExpo!: boolean;

  @ValidateNested({ each: true })
  @Type(() => KeyValueDto)
  externalIDs!: KeyValueDto[];
}

export class DeletePrinterGroupNoReassignRequestDto {
  @IsBoolean()
  reassign!: false;
}

export class DeletePrinterGroupReassignRequestDto {
  @IsBoolean()
  reassign!: true;

  @IsString()
  @IsNotEmpty()
  printerGroup!: string;
}

export type DeletePrinterGroupRequestDto =
  | DeletePrinterGroupNoReassignRequestDto
  | DeletePrinterGroupReassignRequestDto;
