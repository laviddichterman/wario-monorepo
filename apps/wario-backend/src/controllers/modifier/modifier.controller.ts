import { Body, Controller, Delete, Inject, Param, Patch, Post } from '@nestjs/common';

import { type IOptionType, UncommittedOptionDto } from '@wcp/wario-shared';

import { SocketIoService } from 'src/config/socket-io/socket-io.service';
import { UpdateOptionDto } from 'src/dtos/modifier.dto';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import type { UncommitedOption, UpdateModifierTypeProps } from '../../config/catalog-provider/catalog.types';

@Controller('api/v1/menu/option')
export class ModifierController {
  constructor(
    @Inject(CatalogProviderService) private catalogProvider: CatalogProviderService,
    @Inject(SocketIoService) private socketIoService: SocketIoService,
  ) {}

  @Post()
  @Scopes('write:catalog')
  async CreateModifierType(@Body() body: { modifierType: Omit<IOptionType, 'id'>; options: UncommitedOption[] }) {
    const doc = await this.catalogProvider.CreateModifierType(body.modifierType, body.options);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Patch(':id')
  @Scopes('write:catalog')
  async UpdateModifierType(@Body() body: UpdateModifierTypeProps) {
    const doc = await this.catalogProvider.UpdateModifierType({
      id: body.id,
      modifierType: body.modifierType,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete(':id')
  @Scopes('delete:catalog')
  async DeleteModifierType(@Param('id') id: string) {
    const doc = await this.catalogProvider.DeleteModifierType(id);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Post(':mtid')
  @Scopes('write:catalog')
  async CreateOption(@Body() body: UncommittedOptionDto, @Param('mtid') mtid: string) {
    const doc = await this.catalogProvider.CreateOption(mtid, body as UncommitedOption);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Patch(':mtid/:id')
  @Scopes('write:catalog')
  async UpdateModifierOption(@Body() body: UpdateOptionDto, @Param('id') id: string, @Param('mtid') mtid: string) {
    const doc = await this.catalogProvider.UpdateModifierOption({
      id,
      modifierTypeId: mtid,
      modifierOption: body,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete(':mtid/:id')
  @Scopes('delete:catalog')
  async DeleteModifierOption(@Param('id') id: string, @Param('mtid') mtid: string) {
    const doc = await this.catalogProvider.DeleteModifierOption(mtid, id);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }
}
