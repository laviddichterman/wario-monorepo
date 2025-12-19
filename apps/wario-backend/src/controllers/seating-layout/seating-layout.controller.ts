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

import {
  CreateSeatingLayoutRequestDto,
  UpdateSeatingLayoutRequestDto,
} from '@wcp/wario-shared';

import { SeatingService } from 'src/modules/seating/seating.service';

@Controller('api/v1/config/seating-layout')
export class SeatingLayoutController {
  constructor(private readonly seatingService: SeatingService) { }

  @Get()
  async getLayouts() {
    return this.seatingService.getAllLayouts();
  }

  @Get(':id')
  async getLayout(@Param('id') id: string) {
    const layout = await this.seatingService.getLayout(id);
    if (!layout) {
      throw new NotFoundException(`Seating Layout with ID ${id} not found`);
    }
    return layout;
  }

  @Post()
  @HttpCode(201)
  async createLayout(@Body() body: CreateSeatingLayoutRequestDto) {
    return this.seatingService.createLayout(body);
  }

  @Patch(':id')
  async updateLayout(@Param('id') id: string, @Body() body: UpdateSeatingLayoutRequestDto) {
    try {
      const updated = await this.seatingService.updateLayout(id, body);
      if (!updated) {
        throw new NotFoundException(`Seating Layout with ID ${id} not found`);
      }
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error);
    }
  }

  @Delete(':id')
  async deleteLayout(@Param('id') id: string) {
    const deleted = await this.seatingService.deleteLayout(id);
    if (!deleted) {
      throw new NotFoundException(`Seating Layout with ID ${id} not found`);
    }
    return { success: true };
  }
}
