import { Body, Controller, Delete, Inject, Param, Post, Put } from '@nestjs/common';

import { type IOption, type IOptionType } from '@wcp/wario-shared';

import { SocketIoService } from 'src/config/socket-io/socket-io.service';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { CatalogModifierService } from '../../config/catalog-provider/catalog-modifier.service';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import type {
  UncommitedOption,
  UpdateModifierOptionProps,
  UpdateModifierTypeProps,
} from '../../config/catalog-provider/catalog.types';

@Controller('api/v1/menu/option')
export class ModifierController {
  constructor(
    @Inject(CatalogProviderService) private catalogProvider: CatalogProviderService,
    @Inject(CatalogModifierService) private catalogModifierService: CatalogModifierService,
    @Inject(SocketIoService) private socketIoService: SocketIoService,
  ) { }

  @Post('type')
  @Scopes('write:catalog')
  async CreateModifierType(@Body() body: { modifierType: Omit<IOptionType, 'id'>; options: UncommitedOption[] }) {
    const doc = await this.catalogModifierService.CreateModifierType(body.modifierType, body.options);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Put('type')
  @Scopes('write:catalog')
  async UpdateModifierType(@Body() body: UpdateModifierTypeProps) {
    const doc = await this.catalogModifierService.UpdateModifierType(body);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete('type/:id')
  @Scopes('delete:catalog')
  async DeleteModifierType(@Param('id') id: string) {
    const doc = await this.catalogModifierService.DeleteModifierType(id);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Post('option')
  @Scopes('write:catalog')
  async CreateOption(@Body() body: Omit<IOption, 'id'>) {
    const doc = await this.catalogModifierService.CreateOption(body);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Put('option')
  @Scopes('write:catalog')
  // todo: change the type to a dto
  async UpdateModifierOption(@Body() body: UpdateModifierOptionProps) {
    const doc = await this.catalogModifierService.UpdateModifierOption(body);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete('option/:id')
  @Scopes('delete:catalog')
  async DeleteModifierOption(@Param('id') id: string) {
    const doc = await this.catalogModifierService.DeleteModifierOption(id);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }
}
