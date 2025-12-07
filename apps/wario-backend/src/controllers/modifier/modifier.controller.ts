import { Body, Controller, Delete, Inject, Param, Post, Put } from '@nestjs/common';

import { type IOption, type IOptionType } from '@wcp/wario-shared';

import { SocketIoService } from 'src/config/socket-io/socket-io.service';

import { Scopes } from '../../auth/decorators/scopes.decorator';
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
    @Inject(SocketIoService) private socketIoService: SocketIoService,
  ) { }

  @Post('type')
  @Scopes('write:catalog')
  async CreateModifierType(@Body() body: { modifierType: Omit<IOptionType, 'id'>; options: UncommitedOption[] }) {
    const doc = await this.catalogProvider.CreateModifierType(body.modifierType, body.options);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Put('type')
  @Scopes('write:catalog')
  async UpdateModifierType(@Body() body: UpdateModifierTypeProps) {
    const doc = await this.catalogProvider.UpdateModifierType({
      id: body.id,
      modifierType: body.modifierType,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete('type/:id')
  @Scopes('delete:catalog')
  async DeleteModifierType(@Param('id') id: string) {
    const doc = await this.catalogProvider.DeleteModifierType(id);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Post('option')
  @Scopes('write:catalog')
  async CreateOption(@Body() body: Omit<IOption, 'id'>) {
    const doc = await this.catalogProvider.CreateOption(body);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Put('option')
  @Scopes('write:catalog')
  // todo: change the type to a dto
  async UpdateModifierOption(@Body() body: UpdateModifierOptionProps) {
    const doc = await this.catalogProvider.UpdateModifierOption({
      id: body.id,
      modifierTypeId: body.modifierTypeId, // we need this to process the update
      modifierOption: body.modifierOption,
    });
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }

  @Delete('option/:id')
  @Scopes('delete:catalog')
  async DeleteModifierOption(@Param('id') id: string) {
    const doc = await this.catalogProvider.DeleteModifierOption(id);
    this.socketIoService.EmitCatalog(this.catalogProvider.Catalog);
    return doc;
  }
}
