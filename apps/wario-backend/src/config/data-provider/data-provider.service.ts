import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  FulfillmentConfig,
  IWSettings,
  PostBlockedOffToFulfillmentsRequest,
  ReduceArrayToMapByKey,
  SeatingResource,
  SetLeadTimesRequest,
  WDateUtils,
} from '@wcp/wario-shared';

import { SeatingResourceModel } from '../../models/orders/WSeatingResource';
import { FulfillmentModel } from '../../models/settings/FulfillmentSchema';
import { KeyValueModel } from '../../models/settings/KeyValueSchema';
import { SettingsModel } from '../../models/settings/SettingsSchema';
@Injectable()
export class DataProviderService implements OnModuleInit {
  private settings: IWSettings;
  private fulfillments: Record<string, FulfillmentConfig>;
  private keyvalueconfig: { [key: string]: string };
  private seatingResources: Record<string, SeatingResource>;

  constructor(
    @InjectModel('SettingsSchema')
    private settingsModel: typeof SettingsModel,
    @InjectModel('KeyValueSchema') private keyValueModel: typeof KeyValueModel,
    @InjectModel('FulfillmentSchema')
    private fulfillmentModel: typeof FulfillmentModel,
    @InjectModel('SeatingResource')
    private seatingResourceModel: typeof SeatingResourceModel,
    @InjectPinoLogger(DataProviderService.name)
    private readonly logger: PinoLogger,
  ) {
    this.fulfillments = {};
    this.seatingResources = {};
    this.settings = { additional_pizza_lead_time: 5, config: {} };
    this.keyvalueconfig = {};
  }

  async onModuleInit() {
    await this.Bootstrap();
  }

  public syncFulfillments = async () => {
    this.logger.debug(`Syncing Fulfillments.`);
    try {
      this.fulfillments = ReduceArrayToMapByKey(
        (await this.fulfillmentModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err: unknown) {
      this.logger.error({ err }, 'Failed fetching fulfillments');
    }
  };

  public syncSeatingResources = async () => {
    this.logger.debug(`Syncing Seating Resources.`);
    try {
      this.seatingResources = ReduceArrayToMapByKey(
        (await this.seatingResourceModel.find().exec()).map((x) => x.toObject()),
        'id',
      );
    } catch (err: unknown) {
      this.logger.error({ err }, 'Failed fetching seating resources');
    }
  };

  private Bootstrap = async () => {
    this.logger.info('DataProvider: Loading from and bootstrapping to database.');

    await this.syncFulfillments();
    await this.syncSeatingResources();

    // look for key value config area:
    const found_key_value_store = await this.keyValueModel.findOne();
    if (!found_key_value_store) {
      this.keyvalueconfig = {};
      const keyvalueconfig_document = new this.keyValueModel({ settings: [] });
      await keyvalueconfig_document.save();
      this.logger.info('Added default (empty) key value config area');
    } else {
      this.logger.debug({ keyValueStore: found_key_value_store }, 'Found KeyValueSchema in database');
      for (const setting of found_key_value_store.settings) {
        if (Object.hasOwn(this.keyvalueconfig, setting.key)) {
          this.logger.error(
            `Clobbering key: ${setting.key} containing ${this.keyvalueconfig[setting.key]}`,
          );
        }
        this.keyvalueconfig[setting.key] = setting.value;
      }
    }

    // check for and populate settings, including operating hours
    const found_settings = await this.settingsModel.findOne();
    this.logger.info({ settings: found_settings }, 'Found settings');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.settings = found_settings!;

    this.logger.debug('Done Bootstrapping DataProvider');
  };

  get Settings() {
    return this.settings;
  }

  get Fulfillments() {
    return this.fulfillments;
  }

  get SeatingResources() {
    return this.seatingResources;
  }

  get KeyValueConfig() {
    return this.keyvalueconfig;
  }

  /**
   * Update settings in memory and persist to database.
   */
  updateSettings = async (da: IWSettings) => {
    this.settings = da;
    try {
      const db_settings = await this.settingsModel.findOne();
      if (db_settings) {
        Object.assign(db_settings, da);
        await db_settings.save();
        this.logger.debug({ settings: db_settings }, 'Saved settings');
      }
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error saving settings');
      throw err;
    }
  };

  postBlockedOffToFulfillments = async (request: PostBlockedOffToFulfillmentsRequest) => {
    return await Promise.all(
      request.fulfillmentIds.map(async (fId) => {
        const newBlockedOff = WDateUtils.AddIntervalToDate(
          request.interval,
          request.date,
          this.fulfillments[fId].blockedOff,
        );
        return this.fulfillmentModel.findByIdAndUpdate(fId, {
          blockedOff: newBlockedOff,
        });
      }),
    );
  };

  deleteBlockedOffFromFulfillments = async (request: PostBlockedOffToFulfillmentsRequest) => {
    return await Promise.all(
      request.fulfillmentIds.map(async (fId) => {
        const newBlockedOff = WDateUtils.SubtractIntervalFromDate(
          request.interval,
          request.date,
          this.fulfillments[fId].blockedOff,
          this.fulfillments[fId].timeStep,
        );
        return this.fulfillmentModel.findByIdAndUpdate(fId, {
          blockedOff: newBlockedOff,
        });
      }),
    );
  };

  setLeadTimes = async (request: SetLeadTimesRequest) => {
    return await Promise.all(
      Object.entries(request).map(async ([fId, leadTime]) => {
        return this.fulfillmentModel.findByIdAndUpdate(fId, {
          leadTime: leadTime,
        });
      }),
    );
  };

  setFulfillment = async (fulfillment: Omit<FulfillmentConfig, 'id'>) => {
    const fm = new this.fulfillmentModel(fulfillment);
    const savePromise = fm
      .save()
      .then((x) => {
        this.logger.debug({ fulfillment: x }, 'Saved new fulfillment');
        this.fulfillments[x.id as string] = x;
        return x;
      })
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Error saving new fulfillment');
        throw err;
      });
    return savePromise;
  };

  // TODO: does this properly handle partial updates?
  updateFulfillment = async (id: string, fulfillment: Partial<Omit<FulfillmentConfig, 'id'>>) => {
    return this.fulfillmentModel
      .findByIdAndUpdate(id, fulfillment, { new: true })
      .then((doc) => {
        this.logger.debug({ fulfillmentId: id, fulfillment: doc }, 'Updated fulfillment');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.fulfillments[id] = doc!;
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Error updating fulfillment');
        throw err;
      });
  };

  /** this probably should get deleted. We want to disable seating resources and repurpose disabled ones otherwise this might become a data management nightmare */
  deleteFulfillment = async (id: string) => {
    return this.fulfillmentModel
      .findByIdAndDelete(id)
      .then((doc) => {
        this.logger.debug({ fulfillmentId: id, fulfillment: doc }, 'Deleted fulfillment');
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.fulfillments[id];
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Error deleting fulfillment');
        throw err;
      });
  };

  setSeatingResource = async (seatingResource: Omit<SeatingResource, 'id'>) => {
    const sr = new this.seatingResourceModel(seatingResource);
    const savePromise = sr
      .save()
      .then((x) => {
        this.logger.debug({ seatingResource: x }, 'Saved new seating resource');
        this.seatingResources[x.id as string] = x;
        return x;
      })
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Error saving new seating resource');
        throw err;
      });
    return savePromise;
  };

  updateSeatingResource = async (id: string, seatingResource: Partial<Omit<SeatingResource, 'id'>>) => {
    return this.seatingResourceModel
      .findByIdAndUpdate(id, seatingResource, { new: true })
      .then((doc) => {
        this.logger.debug({ seatingResourceId: id, seatingResource: doc }, 'Updated Seating Resource');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.seatingResources[id] = doc!;
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Error updating Seating Resource');
        throw err;
      });
  };

  /** precondition: references to this seating resource have already been removed from the catalog! */
  deleteSeatingResource = async (id: string) => {
    return this.seatingResourceModel
      .findByIdAndDelete(id)
      .then((doc) => {
        this.logger.debug({ seatingResourceId: id, seatingResource: doc }, 'Deleted seating resource');
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.seatingResources[id];
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error({ err }, 'Error deleting seating resource');
        throw err;
      });
  };

  updateKeyValueConfig = async (da: { [key: string]: string }) => {
    this.keyvalueconfig = da;
    try {
      const db_key_values = await this.keyValueModel.findOne();
      if (db_key_values) {
        const settings_list: { key: string; value: string }[] = [];
        for (const i in da) {
          settings_list.push({ key: i, value: da[i] });
        }
        db_key_values.settings = settings_list;
        await db_key_values.save();
        this.logger.debug({ keyValueConfig: db_key_values }, 'Saved key/value config');
      }
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error saving key/value config');
      throw err;
    }
  };
}
