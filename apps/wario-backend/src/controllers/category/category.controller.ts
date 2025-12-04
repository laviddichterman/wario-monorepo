import { Body, Controller, Delete, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { Scopes } from '../../auth/decorators/scopes.decorator';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { CreateCategoryDto, DeleteCategoryDto, UpdateCategoryDto } from '../../dtos/category.dto';

@Controller('api/v1/menu/category')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class CategoryController {
  constructor(private readonly catalogProvider: CatalogProviderService) { }

  @Post()
  @Scopes('write:catalog')
  async postCategory(@Body() body: CreateCategoryDto, @Req() req: Request, @Res() res: Response) {
    try {
      const doc = await this.catalogProvider.CreateCategory({
        name: body.name,
        ordinal: body.ordinal,
        description: body.description,
        subheading: body.subheading,
        footnotes: body.footnotes,
        parent_id: body.parent_id,
        display_flags: body.display_flags,
        serviceDisable: body.serviceDisable,
      });
      if (!doc) {
        return res.status(500).send(`Unable to create category`);
      }
      const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${doc.id}`;
      res.setHeader('Location', location);
      return res.status(201).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Patch(':catid')
  @Scopes('write:catalog')
  async patchCategory(@Param('catid') catid: string, @Body() body: UpdateCategoryDto, @Res() res: Response) {
    try {
      // todo: UpdateCategoryDto needs to allow partial updates
      const doc = await this.catalogProvider.UpdateCategory(catid, body);
      if (!doc) {
        return res.status(404).send(`Unable to update category: ${catid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  @Delete(':catid')
  @Scopes('delete:catalog')
  async deleteCategory(@Param('catid') catid: string, @Body() body: DeleteCategoryDto, @Res() res: Response) {
    try {
      const delete_contained_products = body.delete_contained_products ?? false;
      const doc = await this.catalogProvider.DeleteCategory(catid, delete_contained_products);
      if (!doc) {
        return res.status(404).send(`Unable to delete category: ${catid}`);
      }
      return res.status(200).send(doc);
    } catch (error) {
      return res.status(500).send(error);
    }
  }
}
