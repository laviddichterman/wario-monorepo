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

import { SeatingPlacementDto } from '@wcp/wario-shared';

import { SeatingService } from 'src/modules/seating/seating.service';

@Controller('api/v1/config/seating-placement')
export class SeatingPlacementController {
  constructor(private readonly seatingService: SeatingService) { }

  @Get()
  async getPlacements() {
    return this.seatingService.getAllPlacements();
  }

  @Get(':id')
  async getPlacement(@Param('id') id: string) {
    const placement = await this.seatingService.getPlacement(id);
    if (!placement) {
      throw new NotFoundException(`Seating Placement with ID ${id} not found`);
    }
    return placement;
  }

  @Post()
  @HttpCode(201)
  async createPlacement(@Body() body: SeatingPlacementDto) {
    return this.seatingService.createPlacement(body);
  }

  @Patch(':id')
  async updatePlacement(@Param('id') id: string, @Body() body: Partial<SeatingPlacementDto>) {
    try {
      const updated = await this.seatingService.updatePlacement(id, body);
      if (!updated) {
        throw new NotFoundException(`Seating Placement with ID ${id} not found`);
      }
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error);
    }
  }

  @Delete(':id')
  async deletePlacement(@Param('id') id: string) {
    const deleted = await this.seatingService.deletePlacement(id);
    if (!deleted) {
      throw new NotFoundException(`Seating Placement with ID ${id} not found`);
    }
    return { success: true };
  }
}
