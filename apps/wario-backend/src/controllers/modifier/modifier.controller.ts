import { Body, Controller, Delete, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

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
  async postModifierType(@Body() body: CreateModifierTypeDto, @Req() req: Request, @Res() res: Response) {
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
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${doc.id}`;
      res.setHeader('Location', location);
      return res.status(201).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Patch(':mtid')
  @Scopes('write:catalog')
  async patchModifierType(@Param('mtid') mtid: string, @Body() body: UpdateModifierTypeDto, @Res() res: Response) {
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
        return res.status(404).send(`Unable to update ModifierType: ${mtid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Delete(':mtid')
  @Scopes('delete:catalog')
  async deleteModifierType(@Param('mtid') mtid: string, @Res() res: Response) {
    try {
      const doc = await this.catalogProvider.DeleteModifierType(mtid);
      if (!doc) {
        return res.status(404).send(`Unable to delete Modifier Type: ${mtid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Post(':mtid')
  @Scopes('write:catalog')
  async postModifierOption(
    @Param('mtid') mtid: string,
    @Body() body: CreateOptionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const new_option = await this.catalogProvider.CreateOption({
        price: body.price,
        description: body.description,
        displayName: body.displayName,
        shortcode: body.shortcode,
        disabled: body.disabled ? body.disabled : null,
        externalIDs: body.externalIDs ?? [],
        modifierTypeId: mtid,
        ordinal: body.ordinal,
        metadata: body.metadata,
        enable: body.enable,
        displayFlags: body.displayFlags,
        availability: body.availability,
      });
      if (!new_option) {
        return res.status(404).send(`Unable to find ModifierType ${mtid} to create Modifier Option`);
      }
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${new_option.id}`;
      res.setHeader('Location', location);
      return res.status(201).send(new_option);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Patch(':mtid/:moid')
  @Scopes('write:catalog')
  async patchModifierOption(
    @Param('mtid') mtid: string,
    @Param('moid') moid: string,
    @Body() body: UpdateOptionDto,
    @Res() res: Response,
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
          return res.status(200).send(doc);
        }
      }
      return res.status(404).send(`Unable to update ModifierOption: ${moid}`);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Delete(':mtid/:moid')
  @Scopes('delete:catalog')
  async deleteModifierOption(@Param('moid') moid: string, @Res() res: Response) {
    try {
      const doc = await this.catalogProvider.DeleteModifierOption(moid);
      if (!doc) {
        return res.status(404).send(`Unable to delete Modifier Option: ${moid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }
}
