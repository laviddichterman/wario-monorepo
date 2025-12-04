import { Body, Controller, Delete, Param, Patch, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { SeatingResource } from '@wcp/wario-shared';

import { CreateSeatingResourceDto, UpdateSeatingResourceDto } from 'src/dtos/seating-resource.dto';

import { DataProviderService } from '../../config/data-provider/data-provider.service';
import { SocketIoService } from '../../config/socket-io/socket-io.service';

@Controller('api/v1/config/seating')
export class SeatingResourceController {
  constructor(
    private readonly dataProvider: DataProviderService,
    private readonly socketIoService: SocketIoService,
  ) { }

  @Post()
  async postSeatingResource(@Body() body: CreateSeatingResourceDto, @Req() req: Request, @Res() res: Response) {
    try {
      const newSeatingResource = await this.dataProvider.setSeatingResource(body);
      await this.dataProvider.syncSeatingResources();
      this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.SeatingResources);
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${newSeatingResource._id.toString()}`;
      res.setHeader('Location', location);
      return res.status(201).send(newSeatingResource);
    } catch (error) {
      return res.status(400).send(error);
    }
  }

  @Patch(':srid')
  async patchSeatingResource(@Param('srid') seatingResourceId: string, @Body() body: UpdateSeatingResourceDto, @Res() res: Response) {
    try {
      const updatedSeatingResource = await this.dataProvider.updateSeatingResource(seatingResourceId, body);
      await this.dataProvider.syncSeatingResources();
      this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.SeatingResources);
      return res.status(200).send(updatedSeatingResource);
    } catch (error) {
      return res.status(404).send(error);
    }
  }

  @Delete(':srid')
  async deleteSeatingResource(@Param('srid') seatingResourceId: string, @Res() res: Response) {
    try {
      const doc = await this.dataProvider.deleteSeatingResource(seatingResourceId);
      await this.dataProvider.syncSeatingResources();
      this.socketIoService.EmitSeatingResourcesTo(this.socketIoService.server, this.dataProvider.SeatingResources);
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(400).send(error);
    }
  }
}
