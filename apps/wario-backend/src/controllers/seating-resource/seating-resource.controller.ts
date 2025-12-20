import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateSeatingResourceDto, UpdateSeatingResource, UpdateSeatingResourceDto } from '@wcp/wario-shared';

import { SeatingService } from 'src/modules/seating/seating.service';

@Controller('api/v1/config/seating')
export class SeatingResourceController {
  constructor(private readonly seatingService: SeatingService) {}

  @Get()
  async getSeatingResources() {
    return this.seatingService.getAllResources();
  }

  @Post()
  @HttpCode(201)
  async postSeatingResource(@Body() body: CreateSeatingResourceDto) {
    return this.seatingService.createResource(body);
  }

  @Patch(':srid')
  async patchSeatingResource(@Param('srid') seatingResourceId: string, @Body() body: UpdateSeatingResourceDto) {
    try {
      return await this.seatingService.updateResource(seatingResourceId, {
        ...(body as UpdateSeatingResource),
        id: seatingResourceId,
      });
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  @Delete(':srid')
  async deleteSeatingResource(@Param('srid') seatingResourceId: string) {
    try {
      return await this.seatingService.deleteResource(seatingResourceId);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
