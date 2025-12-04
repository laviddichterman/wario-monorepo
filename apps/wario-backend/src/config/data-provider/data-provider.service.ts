import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

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
  private readonly logger = new Logger(DataProviderService.name);
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
      this.logger.error(`Failed fetching fulfillments with error: ${JSON.stringify(err)}`);
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
      this.logger.error(`Failed fetching seating resources with error: ${JSON.stringify(err)}`);
    }
  };

  private Bootstrap = async () => {
    this.logger.log('DataProvider: Loading from and bootstrapping to database.');

    await this.syncFulfillments();
    await this.syncSeatingResources();

    // look for key value config area:
    const found_key_value_store = await this.keyValueModel.findOne();
    if (!found_key_value_store) {
      this.keyvalueconfig = {};
      const keyvalueconfig_document = new this.keyValueModel({ settings: [] });
      await keyvalueconfig_document.save();
      this.logger.log('Added default (empty) key value config area');
    } else {
      this.logger.debug(`Found KeyValueSchema in database: ${JSON.stringify(found_key_value_store)}`);
      for (const i in found_key_value_store.settings) {
        if (Object.hasOwn(this.keyvalueconfig, found_key_value_store.settings[i].key)) {
          this.logger.error(
            `Clobbering key: ${found_key_value_store.settings[i].key} containing ${this.keyvalueconfig[found_key_value_store.settings[i].key]}`,
          );
        }
        this.keyvalueconfig[found_key_value_store.settings[i].key] = found_key_value_store.settings[i].value;
      }
    }

    // check for and populate settings, including operating hours
    const found_settings = await this.settingsModel.findOne();
    this.logger.log(`Found settings: ${JSON.stringify(found_settings)}`);
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
        this.logger.debug(`Saved settings ${JSON.stringify(db_settings)}`);
      }
    } catch (err: unknown) {
      this.logger.error(`Error saving settings ${JSON.stringify(err)}`);
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
        this.logger.debug(`Saved new fulfillment: ${JSON.stringify(x)}`);
        this.fulfillments[x.id] = x;
        return x;
      })
      .catch((err: unknown) => {
        this.logger.error(`Error saving new fulfillment: ${JSON.stringify(err)}`);
        throw err;
      });
    return savePromise;
  };

  updateFulfillment = async (id: string, fulfillment: Partial<Omit<FulfillmentConfig, 'id'>>) => {
    return this.fulfillmentModel
      .findByIdAndUpdate(id, fulfillment, { new: true })
      .then((doc) => {
        this.logger.debug(`Updated fulfillment[${id}]: ${JSON.stringify(doc)}`);
        this.fulfillments[id] = doc!;
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error(`Error updating fulfillment: ${JSON.stringify(err)}`);
        throw err;
      });
  };

  /** this probably should get deleted. We want to disable seating resources and repurpose disabled ones otherwise this might become a data management nightmare */
  deleteFulfillment = async (id: string) => {
    return this.fulfillmentModel
      .findByIdAndDelete(id)
      .then((doc) => {
        this.logger.debug(`Deleted fulfillment[${id}]: ${JSON.stringify(doc)}`);
        delete this.fulfillments[id];
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error(`Error deleting fulfillment: ${JSON.stringify(err)}`);
        throw err;
      });
  };

  setSeatingResource = async (seatingResource: Omit<SeatingResource, 'id'>) => {
    const sr = new this.seatingResourceModel(seatingResource);
    const savePromise = sr
      .save()
      .then((x) => {
        this.logger.debug(`Saved new seating resource: ${JSON.stringify(x)}`);
        this.seatingResources[x.id] = x;
        return x;
      })
      .catch((err: unknown) => {
        this.logger.error(`Error saving new seating resource: ${JSON.stringify(err)}`);
        throw err;
      });
    return savePromise;
  };

  updateSeatingResource = async (id: string, seatingResource: Partial<Omit<SeatingResource, 'id'>>) => {
    return this.seatingResourceModel
      .findByIdAndUpdate(id, seatingResource, { new: true })
      .then((doc) => {
        this.logger.debug(`Updated Seating Resource[${id}]: ${JSON.stringify(doc)}`);
        this.seatingResources[id] = doc!;
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error(`Error updating Seating Resource: ${JSON.stringify(err)}`);
        throw err;
      });
  };

  /** precondition: references to this seating resource have already been removed from the catalog! */
  deleteSeatingResource = async (id: string) => {
    return this.seatingResourceModel
      .findByIdAndDelete(id)
      .then((doc) => {
        this.logger.debug(`Deleted seating resource[${id}]: ${JSON.stringify(doc)}`);
        delete this.seatingResources[id];
        return doc;
      })
      .catch((err: unknown) => {
        this.logger.error(`Error deleting seating resource: ${JSON.stringify(err)}`);
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
        this.logger.debug(`Saved key/value config ${JSON.stringify(db_key_values)}`);
      }
    } catch (err: unknown) {
      this.logger.error(`Error saving key/value config ${JSON.stringify(err)}`);
      throw err;
    }
  };
}
