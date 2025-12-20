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

import { CreateSeatingFloorDto, UpdateSeatingFloorDto } from '@wcp/wario-shared';

import { SeatingService } from 'src/modules/seating/seating.service';

@Controller('api/v1/config/seating-floor')
export class SeatingFloorController {
  constructor(private readonly seatingService: SeatingService) {}

  @Get()
  async getFloors() {
    return this.seatingService.getAllFloors();
  }

  @Get(':id')
  async getFloor(@Param('id') id: string) {
    const floor = await this.seatingService.getFloor(id);
    if (!floor) {
      throw new NotFoundException(`Seating Floor with ID ${id} not found`);
    }
    return floor;
  }

  @Post()
  @HttpCode(201)
  async createFloor(@Body() body: CreateSeatingFloorDto) {
    return this.seatingService.createFloor(body);
  }

  @Patch(':id')
  async updateFloor(@Param('id') id: string, @Body() body: UpdateSeatingFloorDto) {
    try {
      const updated = await this.seatingService.updateFloor(id, body);
      if (!updated) {
        throw new NotFoundException(`Seating Floor with ID ${id} not found`);
      }
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error);
    }
  }

  @Delete(':id')
  async deleteFloor(@Param('id') id: string) {
    const deleted = await this.seatingService.deleteFloor(id);
    if (!deleted) {
      throw new NotFoundException(`Seating Floor with ID ${id} not found`);
    }
    return { success: true };
  }
}
