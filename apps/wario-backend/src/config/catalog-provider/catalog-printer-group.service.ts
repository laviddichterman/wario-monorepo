/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogObject } from 'square';

import {
  DeletePrinterGroupRequest,
  PrinterGroup,
} from '@wcp/wario-shared';

import { DataProviderService } from '../data-provider/data-provider.service';
import {
  GetSquareExternalIds,
  IdMappingsToExternalIds,
  PrinterGroupToSquareCatalogObjectPlusDummyProduct,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

import { CatalogProviderService } from './catalog-provider.service';
import { CatalogSquareSyncService } from './catalog-square-sync.service';
import { UpdatePrinterGroupProps } from './catalog.types';

@Injectable()
export class CatalogPrinterGroupService {
  private readonly logger = new Logger(CatalogPrinterGroupService.name);

  constructor(
    @InjectModel('WPrinterGroup') private printerGroupModel: Model<PrinterGroup>,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    private dataProviderService: DataProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => CatalogSquareSyncService))
    private catalogSquareSyncService: CatalogSquareSyncService,
  ) { }

  CreatePrinterGroup = async (printerGroup: Omit<PrinterGroup, 'id'>) => {
    this.logger.log(`Creating Printer Group: ${JSON.stringify(printerGroup)}`);
    const upsertResponse = await this.squareService.BatchUpsertCatalogObjects([
      {
        objects: PrinterGroupToSquareCatalogObjectPlusDummyProduct(
          [this.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE], // this ONLY goes to the alternate location since we can't purchase messages
          printerGroup,
          [],
          '',
        ),
      },
    ]);
    if (!upsertResponse.success) {
      this.logger.error(`failed to add square category, got errors: ${JSON.stringify(upsertResponse.error)}`);
      return null;
    }

    const doc = new this.printerGroupModel({
      ...printerGroup,
      externalIDs: [...printerGroup.externalIDs, ...IdMappingsToExternalIds(upsertResponse.result.idMappings, '')],
    });
    await doc.save();
    await this.catalogProvider.SyncPrinterGroups();
    return doc.toObject();
  };

  BatchUpdatePrinterGroup = async (batches: UpdatePrinterGroupProps[]): Promise<(PrinterGroup | null)[]> => {
    this.logger.log(
      `Updating printer group(s) ${batches.map((x) => `ID: ${x.id}, changes: ${JSON.stringify(x.printerGroup)}`).join(', ')}`,
    );

    const oldPGs = batches.map((b) => this.catalogProvider.PrinterGroups[b.id]);
    const newExternalIdses = batches.map((b, i) => b.printerGroup.externalIDs ?? oldPGs[i].externalIDs);
    const existingSquareExternalIds = newExternalIdses.map((ids) => GetSquareExternalIds(ids)).flat();
    let existingSquareObjects: CatalogObject[] = [];
    if (existingSquareExternalIds.length > 0) {
      const batchRetrieveCatalogObjectsResponse = await this.squareService.BatchRetrieveCatalogObjects(
        existingSquareExternalIds.map((x) => x.value),
        false,
      );
      if (!batchRetrieveCatalogObjectsResponse.success) {
        this.logger.error(
          `Getting current square CatalogObjects failed with ${JSON.stringify(batchRetrieveCatalogObjectsResponse.error)}`,
        );
        return batches.map((_) => null);
      }
      existingSquareObjects = batchRetrieveCatalogObjectsResponse.result.objects ?? [];
    }

    const catalogObjects = batches.map((b, i) =>
      PrinterGroupToSquareCatalogObjectPlusDummyProduct(
        [this.dataProviderService.KeyValueConfig.SQUARE_LOCATION_ALTERNATE], // message only needs to go to the alternate location
        { ...oldPGs[i], ...b.printerGroup },
        existingSquareObjects,
        ('000' + i).slice(-3),
      ),
    );
    const upsertResponse = await this.squareService.BatchUpsertCatalogObjects(
      catalogObjects.map((x) => ({ objects: x })),
    );
    if (!upsertResponse.success) {
      this.logger.error(`Failed to update square categories, got errors: ${JSON.stringify(upsertResponse.error)}`);
      return batches.map((_) => null);
    }

    const mappings = upsertResponse.result.idMappings;

    const updated = await Promise.all(
      batches.map(async (b, i) => {
        const doc = await this.printerGroupModel
          .findByIdAndUpdate(
            b.id,
            {
              ...b.printerGroup,
              externalIDs: [...newExternalIdses[i], ...IdMappingsToExternalIds(mappings, ('000' + i).slice(-3))],
            },
            { new: true },
          )
          .exec();
        if (!doc) {
          return null;
        }
        return doc.toObject();
      }),
    );

    void this.catalogProvider.SyncPrinterGroups();
    return updated;
  };

  UpdatePrinterGroup = async (props: UpdatePrinterGroupProps) => {
    return (await this.BatchUpdatePrinterGroup([props]))[0];
  };

  DeletePrinterGroup = async (request: DeletePrinterGroupRequest & { id: string }) => {
    this.logger.debug(`Removing Printer Group ${request.id}`);
    const doc = await this.printerGroupModel.findByIdAndDelete(request.id).exec();
    if (!doc) {
      return null;
    }

    // NOTE: this removes the category from the Square ITEMs as well
    await this.catalogSquareSyncService.BatchDeleteCatalogObjectsFromExternalIds(doc.externalIDs);

    await this.catalogProvider.SyncPrinterGroups();

    // needs to write batch update product
    await this.catalogProvider.UpdateProductsWithConstraint(
      { printerGroup: request.id },
      { printerGroup: request.reassign ? request.printerGroup : null },
      false,
    );
    return doc.toObject();
  };
}
