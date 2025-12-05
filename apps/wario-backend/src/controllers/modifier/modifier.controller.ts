import { Body, Controller, Delete, Inject, Param, Post, Put } from '@nestjs/common';

import { type IOption, type IOptionType } from '@wcp/wario-shared';

import { UpdateOptionDto } from 'src/dtos/modifier.dto';

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
    @Inject(CatalogProviderService) private catalogProviderService: CatalogProviderService,
    @Inject(CatalogModifierService) private catalogModifierService: CatalogModifierService,
  ) { }

  @Post('type')
  @Scopes('write:catalog')
  async CreateModifierType(@Body() body: { modifierType: Omit<IOptionType, 'id'>; options: UncommitedOption[] }) {
    return await this.catalogModifierService.CreateModifierType(body.modifierType, body.options);
  }

  @Put('type')
  @Scopes('write:catalog')
  async UpdateModifierType(@Body() body: UpdateModifierTypeProps) {
    return await this.catalogModifierService.UpdateModifierType(body);
  }

  @Delete('type/:id')
  @Scopes('delete:catalog')
  async DeleteModifierType(@Param('id') id: string) {
    return await this.catalogModifierService.DeleteModifierType(id);
  }

  @Post('option')
  @Scopes('write:catalog')
  async CreateOption(@Body() body: Omit<IOption, 'id'>) {
    return await this.catalogModifierService.CreateOption(body);
  }

  @Put('option')
  @Scopes('write:catalog')
  // todo: change the type to a dto
  async UpdateModifierOption(@Body() body: UpdateModifierOptionProps) {
    return await this.catalogModifierService.UpdateModifierOption(body);
  }

  @Delete('option/:id')
  @Scopes('delete:catalog')
  async DeleteModifierOption(@Param('id') id: string) {
    return await this.catalogModifierService.DeleteModifierOption(id);
  }
}
