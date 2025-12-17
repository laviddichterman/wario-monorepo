import { Body, Controller, Delete, Inject, Param, Patch, Post } from '@nestjs/common';

import {
  CreateIOptionRequestBodyDto,
  CreateIOptionTypeRequestBodyDto,
  UpdateIOptionTypeRequestBodyDto,
} from '@wcp/wario-shared';

import { SocketIoService } from 'src/config/socket-io/socket-io.service';
import { UpdateOptionDto } from 'src/dtos/modifier.dto';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';

@Controller('api/v1/menu/option')
export class ModifierController {
  constructor(
    @Inject(CatalogProviderService) private catalogProvider: CatalogProviderService,
    @Inject(SocketIoService) private socketIoService: SocketIoService,
  ) {}

  @Post()
  @Scopes('write:catalog')
  async CreateModifierType(@Body() body: CreateIOptionTypeRequestBodyDto) {
    const doc = await this.catalogProvider.CreateModifierType(body);
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Patch(':id')
  @Scopes('write:catalog')
  async UpdateModifierType(@Param('id') id: string, @Body() body: UpdateIOptionTypeRequestBodyDto) {
    const doc = await this.catalogProvider.UpdateModifierType({
      id,
      modifierType: body,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Delete(':id')
  @Scopes('delete:catalog')
  async DeleteModifierType(@Param('id') id: string) {
    const doc = await this.catalogProvider.DeleteModifierType(id);
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Post(':mtid')
  @Scopes('write:catalog')
  async CreateOption(@Body() body: CreateIOptionRequestBodyDto, @Param('mtid') mtid: string) {
    const doc = await this.catalogProvider.CreateOption(mtid, body);
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Patch(':mtid/:id')
  @Scopes('write:catalog')
  async UpdateModifierOption(@Body() body: UpdateOptionDto, @Param('id') id: string, @Param('mtid') mtid: string) {
    const doc = await this.catalogProvider.UpdateModifierOption({
      id,
      modifierTypeId: mtid,
      option: body,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }

  @Delete(':mtid/:id')
  @Scopes('delete:catalog')
  async DeleteModifierOption(@Param('id') id: string, @Param('mtid') mtid: string) {
    const doc = await this.catalogProvider.DeleteModifierOption(mtid, id);
    this.socketIoService.EmitCatalog(this.catalogProvider.getCatalog());
    return doc;
  }
}
