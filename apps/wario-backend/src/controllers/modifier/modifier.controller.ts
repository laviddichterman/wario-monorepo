import { Body, Controller, Delete, HttpCode, InternalServerErrorException, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { IOption } from '@wcp/wario-shared';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import type { UncommitedOption } from '../../config/catalog-provider/catalog-provider.service';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import {
  CreateModifierTypeDto,
  CreateOptionDto,
  UpdateModifierTypeDto,
  UpdateOptionDto,
} from '../../dtos/modifier.dto';

@Controller('api/v1/menu/option')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class ModifierController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Post()
  @Scopes('write:catalog')
  @HttpCode(201)
  async postModifierType(@Body() body: CreateModifierTypeDto) {
    try {
      const modifierType = {
        name: body.name,
        displayName: body.displayName,
        ordinal: body.ordinal,
        min_selected: body.min_selected,
        max_selected: body.max_selected,
        externalIDs: body.externalIDs,
        displayFlags: body.displayFlags,
      };
      const options: UncommitedOption[] = body.options; // Cast to avoid strict type mismatch if DTO differs slightly
      const doc = await this.catalogProvider.CreateModifierType(modifierType, options);
      return doc;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  @Patch(':mtid')
  @Scopes('write:catalog')
  async patchModifierType(@Param('mtid') mtid: string, @Body() body: UpdateModifierTypeDto) {
    try {
      const doc = await this.catalogProvider.UpdateModifierType({
        id: mtid,
        modifierType: {
          name: body.name,
          displayName: body.displayName,
          ordinal: body.ordinal,
          min_selected: body.min_selected,
          max_selected: body.max_selected,
          externalIDs: body.externalIDs,
          displayFlags: body.displayFlags,
        },
      });
      if (!doc) {
        throw new NotFoundException(`Unable to update ModifierType: ${mtid}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Delete(':mtid')
  @Scopes('delete:catalog')
  async deleteModifierType(@Param('mtid') mtid: string) {
    try {
      const doc = await this.catalogProvider.DeleteModifierType(mtid);
      if (!doc) {
        throw new NotFoundException(`Unable to delete Modifier Type: ${mtid}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Post(':mtid')
  @Scopes('write:catalog')
  @HttpCode(201)
  async postModifierOption(
    @Param('mtid') mtid: string,
    @Body() body: CreateOptionDto,
  ) {
    try {
      const new_option = await this.catalogProvider.CreateOption({ ...(body as Omit<IOption, 'id' | 'modifierTypeId'>), modifierTypeId: mtid });
      if (!new_option) {
        throw new NotFoundException(`Unable to find ModifierType ${mtid} to create Modifier Option`);
      }
      return new_option;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Patch(':mtid/:moid')
  @Scopes('write:catalog')
  async patchModifierOption(
    @Param('mtid') mtid: string,
    @Param('moid') moid: string,
    @Body() body: UpdateOptionDto,
  ) {
    try {
      const modifierTypeEntry = this.catalogProvider.Catalog.modifiers[mtid];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!modifierTypeEntry) {
        const doc = await this.catalogProvider.UpdateModifierOption({
          id: moid,
          modifierTypeId: mtid,
          modifierOption: {
            displayName: body.displayName,
            description: body.description,
            price: body.price,
            shortcode: body.shortcode,
            disabled: body.disabled ? body.disabled : null,
            externalIDs: body.externalIDs ?? [],
            ordinal: body.ordinal,
            metadata: body.metadata,
            enable: body.enable,
            displayFlags: body.displayFlags,
            availability: body.availability,
          },
        });
        if (doc) {
          return doc;
        }
      }
      throw new NotFoundException(`Unable to update ModifierOption: ${moid}`);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }

  @Delete(':mtid/:moid')
  @Scopes('delete:catalog')
  async deleteModifierOption(@Param('moid') moid: string) {
    try {
      const doc = await this.catalogProvider.DeleteModifierOption(moid);
      if (!doc) {
        throw new NotFoundException(`Unable to delete Modifier Option: ${moid}`);
      }
      return doc;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error);
    }
  }
}
