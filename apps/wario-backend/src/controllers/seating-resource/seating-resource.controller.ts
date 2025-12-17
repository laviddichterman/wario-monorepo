import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { DataProviderService } from 'src/config/data-provider/data-provider.service';
import { CreateSeatingResourceDto, UpdateSeatingResourceDto } from 'src/dtos/seating-resource.dto';
import { SocketIoService } from 'src/infrastructure/messaging/socket-io/socket-io.service';

@Controller('api/v1/config/seating')
export class SeatingResourceController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly socketIoService: SocketIoService,
  ) {}

  @Post()
  @HttpCode(201)
  async postSeatingResource(@Body() body: CreateSeatingResourceDto) {
    const newSeatingResource = await this.dataProvider.setSeatingResource(body);
    await this.dataProvider.syncSeatingResources();
    this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.getSeatingResources());
    return newSeatingResource;
  }

  @Patch(':srid')
  async patchSeatingResource(@Param('srid') seatingResourceId: string, @Body() body: UpdateSeatingResourceDto) {
    try {
      const updatedSeatingResource = await this.dataProvider.updateSeatingResource(seatingResourceId, body);
      await this.dataProvider.syncSeatingResources();
      this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.getSeatingResources());
      return updatedSeatingResource;
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  @Delete(':srid')
  async deleteSeatingResource(@Param('srid') seatingResourceId: string) {
    try {
      const doc = await this.dataProvider.deleteSeatingResource(seatingResourceId);
      await this.dataProvider.syncSeatingResources();
      this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.getSeatingResources());
      return doc;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
