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

import { SeatingLayoutSectionDto } from '@wcp/wario-shared';

import { SeatingService } from 'src/modules/seating/seating.service';

@Controller('api/v1/config/seating-section')
export class SeatingSectionController {
  constructor(private readonly seatingService: SeatingService) {}

  @Get()
  async getSections() {
    return this.seatingService.getAllSections();
  }

  @Get(':id')
  async getSection(@Param('id') id: string) {
    const section = await this.seatingService.getSection(id);
    if (!section) {
      throw new NotFoundException(`Seating Section with ID ${id} not found`);
    }
    return section;
  }

  @Post()
  @HttpCode(201)
  async createSection(@Body() body: SeatingLayoutSectionDto) {
    return this.seatingService.createSection(body);
  }

  @Patch(':id')
  async updateSection(@Param('id') id: string, @Body() body: Partial<SeatingLayoutSectionDto>) {
    try {
      const updated = await this.seatingService.updateSection(id, body);
      if (!updated) {
        throw new NotFoundException(`Seating Section with ID ${id} not found`);
      }
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error);
    }
  }

  @Delete(':id')
  async deleteSection(@Param('id') id: string) {
    const deleted = await this.seatingService.deleteSection(id);
    if (!deleted) {
      throw new NotFoundException(`Seating Section with ID ${id} not found`);
    }
    return { success: true };
  }
}
