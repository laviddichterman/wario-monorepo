import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { parseISO } from 'date-fns';
import { Connection, Model, Schema } from 'mongoose';

import { SEMVER, WDateUtils } from '@wcp/wario-shared';
import { IOption, IOptionType, IProduct } from '@wcp/wario-shared';

// We need to import package.json. In NestJS build, it might not be in the same relative path.
// For now, let's assume we can require it or use a const.
import PACKAGE_JSON from '../../../../package.json';
import { DBVersion } from '../../models/DBVersionSchema';
import { WOrderInstance } from '../../models/orders/WOrderInstance';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { WARIO_SQUARE_ID_METADATA_KEY } from '../square-wario-bridge'; // We'll need to create this or import from where it ends up
import { SquareService } from '../square/square.service';

interface IMigrationFunctionObject {
  [index: string]: [SEMVER, () => Promise<void>];
}

@Injectable()
export class DatabaseManagerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseManagerService.name);

  constructor(
    @InjectModel('DBVersionSchema') private dbVersionModel: Model<DBVersion>,
    @InjectModel('WOrderInstance') private orderModel: Model<WOrderInstance>,
    @InjectModel('WProductSchema') private productModel: Model<IProduct>,
    @InjectModel('WOptionSchema') private optionModel: Model<IOption>,
    @InjectModel('WOptionTypeSchema')
    private optionTypeModel: Model<IOptionType>,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @InjectConnection() private connection: Connection,
  ) {}

  async onModuleInit() {
    await this.Bootstrap();
  }

  private SetVersion = async (new_version: SEMVER) => {
    return await this.dbVersionModel.findOneAndUpdate({}, new_version, {
      new: true,
      upsert: true,
    });
  };

  private UPGRADE_MIGRATION_FUNCTIONS: IMigrationFunctionObject = {
    '0.5.18': [{ major: 0, minor: 5, patch: 19 }, async () => {}],
    '0.5.19': [
      { major: 0, minor: 5, patch: 20 },
      async () => {
        const allOrders = await this.orderModel.find();
        await Promise.all(
          allOrders.map(async (o) => {
            // @ts-ignore
            const newTime = WDateUtils.formatISODate(
              parseISO(o.fulfillment.selectedDate),
            );
            // @ts-ignore
            this.logger.log(
              `Converting ${o.fulfillment.selectedDate} to ${newTime}`,
            );
            // @ts-ignore
            return await this.orderModel.findByIdAndUpdate(o.id, {
              'fulfillment.selectedDate': WDateUtils.formatISODate(
                parseISO(o.fulfillment.selectedDate),
              ),
            });
          }),
        );
      },
    ],
    '0.5.38': [
      { major: 0, minor: 5, patch: 39 },
      async () => {
        this.catalogProvider.RequireSquareRebuild = true;
      },
    ],
    '0.5.39': [{ major: 0, minor: 5, patch: 40 }, async () => {}],
    '0.5.40': [{ major: 0, minor: 5, patch: 41 }, async () => {}],
    '0.5.41': [{ major: 0, minor: 5, patch: 42 }, async () => {}],
    '0.5.42': [
      { major: 0, minor: 5, patch: 43 },
      async () => {
        const allOptionsUpdate = await this.optionModel.updateMany(
          {},
          {
            $pull: {
              externalIDs: {
                key: { $regex: `^${WARIO_SQUARE_ID_METADATA_KEY}.*` },
              },
            },
          },
        );
        this.logger.log(`Updated options: ${JSON.stringify(allOptionsUpdate)}`);
        const allModifierTypeUpdate = await this.optionTypeModel.updateMany(
          {},
          {
            $pull: {
              externalIDs: {
                key: { $regex: `^${WARIO_SQUARE_ID_METADATA_KEY}.*` },
              },
            },
          },
        );
        this.logger.log(
          `Updated modifier types: ${JSON.stringify(allModifierTypeUpdate)}`,
        );
        this.squareService.ObliterateModifiersOnLoad = true;
        this.catalogProvider.RequireSquareRebuild = true;
      },
    ],
    '0.5.43': [
      { major: 0, minor: 5, patch: 44 },
      async () => {
        {
          const WFulfillmentSchema = this.connection.model(
            'fulFILLmentSCHEMA',
            new Schema(
              {
                exposeFulfillment: {
                  type: Boolean,
                  required: true,
                },
              },
              { id: true },
            ),
          );
          const updatedFulfillments = await WFulfillmentSchema.updateMany(
            {},
            { exposeFulfillment: true },
            {},
          );
          this.logger.log(
            `Updated fulfillments, setting exposeFulfillment to true, got result: ${JSON.stringify(updatedFulfillments)}`,
          );
        }
        {
          // mass set is3p to false on OptionType
          const WOptionTypeModel = this.connection.model(
            'woPTioNtypescHema',
            new Schema({
              displayFlags: {
                is3p: Boolean,
              },
            }),
          );
          const updateResponse = await WOptionTypeModel.updateMany(
            {},
            {
              $set: { 'displayFlags.is3p': false },
            },
          ).exec();
          if (updateResponse.modifiedCount > 0) {
            this.logger.debug(
              `Updated ${updateResponse.modifiedCount} IOptionType with disabled is3p.`,
            );
          } else {
            this.logger.warn('No option types had is3p disabled');
          }
        }
        {
          // mass set is3p to false on IProduct
          const WProductModel = this.connection.model(
            'wproDUctsCHema',
            new Schema({
              displayFlags: {
                is3p: Boolean,
              },
            }),
          );
          const updateResponse = await WProductModel.updateMany(
            {},
            {
              $set: { 'displayFlags.is3p': false },
            },
          ).exec();
          if (updateResponse.modifiedCount > 0) {
            this.logger.debug(
              `Updated ${updateResponse.modifiedCount} IProduct with disabled is3p.`,
            );
          } else {
            this.logger.warn('No IProduct had is3p disabled');
          }
        }
      },
    ],
    '0.5.57': [{ major: 0, minor: 5, patch: 58 }, async () => {}],
    '0.5.58': [
      { major: 0, minor: 5, patch: 59 },
      async () => {
        {
          // set isExpo to false for all printer groups
          const WPrinterGroupSchema = this.connection.model(
            'WPRINTERGroupSchema',
            new Schema({
              isExpo: Boolean,
            }),
          );
          const updateResponse = await WPrinterGroupSchema.updateMany(
            {},
            {
              $set: { isExpo: false },
            },
          ).exec();
          if (updateResponse.modifiedCount > 0) {
            this.logger.debug(
              `Updated ${updateResponse.modifiedCount} WPrinterGroupSchema with disabled isExpo.`,
            );
          } else {
            this.logger.warn('No WPrinterGroupSchema had isExpo disabled');
          }
        }
      },
    ],
    '0.5.59': [
      { major: 0, minor: 5, patch: 60 },
      async () => {
        // add balance to OrderLineDiscountCodeAmount.discount
        // move OrderPaymentAllocated.payment.processorId to OrderPaymentAllocated.processorId
        const discountSchema = new Schema({
          discount: {
            type: {
              amount: {
                type: Object, // WMoney is an object
                required: true,
              },
              balance: {
                type: Object, // WMoney
                required: true,
              },
            },
            required: true,
          },
        });
        const paymentSchema = new Schema({
          processorId: String,
          payment: {
            type: {
              processorId: String,
            },
            required: true,
          },
        });
        const WOrderInstanceSchema = this.connection.model(
          'wOrderinstancE',
          new Schema(
            {
              discounts: {
                type: [discountSchema],
                required: true,
              },
              payments: {
                type: [paymentSchema],
                required: true,
              },
            },
            {
              id: true,
              toJSON: { virtuals: true },
              toObject: { virtuals: true },
            },
          ),
        );
        const allOrders = await WOrderInstanceSchema.find();
        await Promise.all(
          allOrders.map(async (o) => {
            o.discounts.forEach((d) => {
              d.discount.balance = d.discount.amount;
            });
            o.payments.forEach((p) => {
              p.processorId = p.payment.processorId;
            });
            return await o
              .save()
              .then((doc) => {
                this.logger.log(
                  `Updated WOrderInstance (${doc.id}) with new schema`,
                );
                return doc;
              })
              .catch((err) => {
                this.logger.error(
                  `Failed to update WOrderInstance got error: ${JSON.stringify(err)}`,
                );
                throw err;
              });
          }),
        );
      },
    ],
    '0.5.60': [
      { major: 0, minor: 5, patch: 61 },
      async () => {
        // set displayFlags.hideFromPos to false for all WProductInstance
        const WProductInstanceSchema = this.connection.model(
          'WPrODUctInstanceSchema',
          new Schema({
            displayFlags: {
              hideFromPos: Boolean,
            },
          }),
        );
        const updateResponse = await WProductInstanceSchema.updateMany(
          {},
          {
            $set: { 'displayFlags.hideFromPos': false },
          },
        ).exec();
        if (updateResponse.modifiedCount > 0) {
          this.logger.debug(
            `Updated ${updateResponse.modifiedCount} WProductInstanceSchema with disabled hideFromPos.`,
          );
        } else {
          this.logger.warn('No WProductInstanceSchema had hideFromPos set');
        }
      },
    ],
    '0.5.61': [{ major: 0, minor: 5, patch: 62 }, async () => {}],
    '0.5.62': [
      { major: 0, minor: 5, patch: 63 },
      async () => {
        {
          // add null availability to all products
          // add null timing to all products
          const WProductModel = this.connection.model(
            'wproduCtsChema',
            new Schema({
              availability: Schema.Types.Mixed,
              timing: Schema.Types.Mixed,
            }),
          );

          const updateResponse = await WProductModel.updateMany(
            {},
            {
              $set: { availability: null, timing: null },
            },
          ).exec();
          if (updateResponse.modifiedCount > 0) {
            this.logger.debug(
              `Updated ${updateResponse.modifiedCount} IProduct with null availability, null timimng.`,
            );
          } else {
            this.logger.warn(
              'No IProduct had availability and timing set to null',
            );
          }
        }

        {
          // add null availability to all modifier options
          const WOptionModel = this.connection.model(
            'woPtioNschEma',
            new Schema({
              availability: Schema.Types.Mixed,
            }),
          );
          const updateResponse = await WOptionModel.updateMany(
            {},
            {
              $set: { availability: null },
            },
          ).exec();
          if (updateResponse.modifiedCount > 0) {
            this.logger.debug(
              `Updated ${updateResponse.modifiedCount} IOption with null availability.`,
            );
          } else {
            this.logger.warn('No options had availability set to null');
          }
        }

        {
          // add null availability to all modifier options
          const WOptionModel = this.connection.model(
            'woPtioNschema',
            new Schema({
              availability: Schema.Types.Mixed,
            }),
          );
          const updateResponse = await WOptionModel.updateMany(
            {},
            {
              $set: { availability: null },
            },
          ).exec();
          if (updateResponse.modifiedCount > 0) {
            this.logger.debug(
              `Updated ${updateResponse.modifiedCount} IOption with null availability.`,
            );
          } else {
            this.logger.warn('No options had availability set to null');
          }
        }

        {
          // set allowTipping to true
          const WFulfillmentSchema = this.connection.model(
            'fulFIlLmEntSCHEMA',
            new Schema(
              {
                allowTipping: {
                  type: Boolean,
                  required: true,
                },
              },
              { id: true },
            ),
          );
          const updatedFulfillments = await WFulfillmentSchema.updateMany(
            {},
            { allowTipping: true },
            { new: true },
          );
          this.logger.log(
            `Updated fulfillments, setting allowTipping to true, got result: ${JSON.stringify(updatedFulfillments)}`,
          );
        }
      },
    ],
    '0.5.68': [
      { major: 0, minor: 5, patch: 69 },
      async () => {
        // mass set posName to empty string on WProductInstance
        const WProductInstanceSchema = this.connection.model(
          'WPrODUcTInstanceSchema',
          new Schema({
            displayFlags: {
              posName: String,
            },
          }),
        );
        const updateResponse = await WProductInstanceSchema.updateMany(
          {},
          {
            $set: { 'displayFlags.posName': '' },
          },
        ).exec();
        if (updateResponse.modifiedCount > 0) {
          this.logger.debug(
            `Updated ${updateResponse.modifiedCount} WProductInstanceSchema with empty posName.`,
          );
        } else {
          this.logger.warn(
            'No WProductInstanceSchema had posName set to empty string',
          );
        }
      },
    ],
    '0.5.69': [{ major: 0, minor: 5, patch: 84 }, async () => {}],
    '0.5.84': [{ major: 0, minor: 5, patch: 85 }, async () => {}],
    '0.5.85': [{ major: 0, minor: 5, patch: 86 }, async () => {}],
    '0.5.86': [{ major: 0, minor: 5, patch: 87 }, async () => {}],
    '0.5.87': [{ major: 0, minor: 5, patch: 88 }, async () => {}],
    '0.5.88': [{ major: 0, minor: 5, patch: 89 }, async () => {}],
    '0.5.89': [
      { major: 0, minor: 6, patch: 0 },
      async () => {
        {
          const WProductModel = this.connection.model(
            'wproductsCHema',
            new Schema({
              availability: {
                type: [Schema.Types.Mixed],
                default: [],
              },
            }),
          );
          const elts = await WProductModel.find();
          await Promise.all(
            elts.map(async (prod) => {
              if (prod.availability === null) {
                // If availability is null, set it to an empty array
                prod.availability = [];
              } else if (!Array.isArray(prod.availability)) {
                // If availability is not an array, wrap it in an array
                // @ts-ignore
                prod.availability = [prod.availability];
              }
              return await prod
                .save()
                .then((doc) => {
                  this.logger.log(
                    `Updated ProductModel ${doc.id} with availability: ${JSON.stringify(doc.availability)}`,
                  );
                  return doc;
                })
                .catch((err) => {
                  this.logger.error(
                    `Failed to update ProductModel ${prod.id} got error: ${JSON.stringify(err)}`,
                  );
                  throw err;
                });
            }),
          );
        }
        {
          // convert availability on modifier options to array
          const WOptionModel = this.connection.model(
            'woPtIoNschema',
            new Schema({
              availability: {
                type: [Schema.Types.Mixed],
                default: [],
              },
            }),
          );
          const elts = await WOptionModel.find();
          await Promise.all(
            elts.map(async (opt) => {
              if (opt.availability === null) {
                // If availability is null, set it to an empty array
                opt.availability = [];
              } else if (!Array.isArray(opt.availability)) {
                // If availability is not an array, wrap it in an array
                // @ts-ignore
                opt.availability = [opt.availability];
              }
              return await opt
                .save()
                .then((doc) => {
                  this.logger.log(
                    `Updated WOptionModel ${doc.id} with availability: ${JSON.stringify(doc.availability)}`,
                  );
                  return doc;
                })
                .catch((err) => {
                  this.logger.error(
                    `Failed to update WOptionModel ${opt.id} got error: ${JSON.stringify(err)}`,
                  );
                  throw err;
                });
            }),
          );
        }
      },
    ],
    '0.6.0': [{ major: 0, minor: 6, patch: 1 }, async () => {}],
    '0.6.1': [{ major: 0, minor: 6, patch: 2 }, async () => {}],
    '0.6.2': [{ major: 0, minor: 6, patch: 3 }, async () => {}],
    '0.6.3': [{ major: 0, minor: 6, patch: 4 }, async () => {}],
    '0.6.4': [{ major: 0, minor: 6, patch: 5 }, async () => {}],
    '0.6.5': [{ major: 0, minor: 6, patch: 6 }, async () => {}],
    '0.6.6': [
      { major: 0, minor: 6, patch: 7 },
      async () => {
        {
          // migrate hideFromPos, posName to pos.hide, pos.name and set pos.skip_customization to the same value as order.skip_customization
          const WProductInstanceSchema = this.connection.model(
            'WPrODUctInstanceSCHeMa',
            new Schema({
              displayFlags: {
                hideFromPos: Boolean,
                posName: String,
                pos: {
                  // name used internally in the POS, so things like BEERNAME pint and BEERNAME growler fill can exist without muddying up the menu names
                  // eg: ABT 12 growler fill
                  name: String,
                  hide: Boolean,
                  skip_customization: Boolean,
                },
                order: {
                  skip_customization: Boolean,
                },
              },
            }),
          );
          const elts = await WProductInstanceSchema.find();
          await Promise.all(
            elts.map(async (prod) => {
              if (prod.displayFlags) {
                prod.displayFlags.pos = {
                  name: prod.displayFlags.posName,
                  hide: prod.displayFlags.hideFromPos,
                  skip_customization:
                    prod.displayFlags.order?.skip_customization || false,
                };
                delete prod.displayFlags.posName;
                delete prod.displayFlags.hideFromPos;
                return await prod
                  .save()
                  .then((doc) => {
                    this.logger.log(
                      `Updated ProductInstanceModel ${doc.id} with POS scoped fields: ${JSON.stringify(doc.displayFlags!.pos)}`,
                    );
                    return doc;
                  })
                  .catch((err) => {
                    this.logger.error(
                      `Failed to update ProductInstanceModel ${prod.id} got error: ${JSON.stringify(err)}`,
                    );
                    throw err;
                  });
              }
              this.logger.warn(
                `ProductInstanceModel ${prod.id} has no displayFlags, skipping.`,
              );
              return prod;
            }),
          );
        }
      },
    ],
    '0.6.7': [{ major: 0, minor: 6, patch: 8 }, async () => {}],
    '0.6.8': [{ major: 0, minor: 6, patch: 9 }, async () => {}],
  };

  Bootstrap = async () => {
    const [VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH] = PACKAGE_JSON.version
      .split('.', 3)
      .map((x) => parseInt(x));
    const VERSION_PACKAGE = {
      major: VERSION_MAJOR,
      minor: VERSION_MINOR,
      patch: VERSION_PATCH,
    };

    // load version from the DB
    this.logger.log('Running database upgrade bootstrap.');

    let current_db_version = '0.0.0';

    const db_version = await this.dbVersionModel.find({});
    if (db_version.length > 1) {
      this.logger.error(
        `Found more than one DB version entry: ${JSON.stringify(db_version)}, deleting all.`,
      );
      await this.dbVersionModel.deleteMany({});
    } else if (db_version.length === 1) {
      current_db_version = `${db_version[0].major}.${db_version[0].minor}.${db_version[0].patch}`;
    }

    // run update loop
    while (PACKAGE_JSON.version !== current_db_version) {
      if (Object.hasOwn(this.UPGRADE_MIGRATION_FUNCTIONS, current_db_version)) {
        const [next_ver, migration_function] =
          this.UPGRADE_MIGRATION_FUNCTIONS[current_db_version];
        const next_ver_string = `${next_ver.major}.${next_ver.minor}.${next_ver.patch}`;
        this.logger.log(
          `Running migration function from ${current_db_version} to ${next_ver_string}`,
        );
        await migration_function();
        await this.SetVersion(next_ver);
        current_db_version = next_ver_string;
      } else {
        this.logger.warn(
          `No explicit migration from ${current_db_version} to ${PACKAGE_JSON.version}, setting to new version.`,
        );
        await this.SetVersion(VERSION_PACKAGE);
        current_db_version = PACKAGE_JSON.version;
      }
    }
    this.logger.log('Database upgrade checks completed.');
  };
}
