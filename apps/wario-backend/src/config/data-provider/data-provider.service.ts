import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
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

import { DatabaseManagerService } from 'src/modules/database-manager/database-manager.service';
import {
  FULFILLMENT_REPOSITORY,
  KEY_VALUE_REPOSITORY,
  SEATING_RESOURCE_REPOSITORY,
  SETTINGS_REPOSITORY,
} from '../../repositories/interfaces';
import type { IFulfillmentRepository } from '../../repositories/interfaces/fulfillment.repository.interface';
import type { IKeyValueRepository, KeyValueEntry } from '../../repositories/interfaces/key-value.repository.interface';
import type { ISeatingResourceRepository } from '../../repositories/interfaces/seating-resource.repository.interface';
import type { ISettingsRepository } from '../../repositories/interfaces/settings.repository.interface';

@Injectable()
export class DataProviderService implements OnModuleInit {
  private settings: IWSettings | null;
  private fulfillments: Record<string, FulfillmentConfig>;
  private keyvalueconfig: { [key: string]: string };
  private seatingResources: Record<string, SeatingResource>;

  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private settingsRepository: ISettingsRepository,
    @Inject(KEY_VALUE_REPOSITORY)
    private keyValueRepository: IKeyValueRepository,
    @Inject(FULFILLMENT_REPOSITORY)
    private fulfillmentRepository: IFulfillmentRepository,
    @Inject(SEATING_RESOURCE_REPOSITORY)
    private seatingResourceRepository: ISeatingResourceRepository,
    // injected for the dependency bootstrap requirement
    @Inject(DatabaseManagerService)
    private _databaseManager: DatabaseManagerService,
    @InjectPinoLogger(DataProviderService.name)
    private readonly logger: PinoLogger,
  ) {
    this.fulfillments = {};
    this.seatingResources = {};
    this.settings = null;
    this.keyvalueconfig = {};
  }

  async onModuleInit() {
    await this.Bootstrap();
  }

  public syncFulfillments = async () => {
    this.logger.debug(`Syncing Fulfillments.`);
    try {
      const fulfillments = await this.fulfillmentRepository.findAll();
      this.fulfillments = ReduceArrayToMapByKey(fulfillments, 'id');
    } catch (err: unknown) {
      this.logger.error({ err }, 'Failed fetching fulfillments');
    }
  };

  public syncSeatingResources = async () => {
    this.logger.debug(`Syncing Seating Resources.`);
    try {
      const resources = await this.seatingResourceRepository.findAll();
      this.seatingResources = ReduceArrayToMapByKey(resources, 'id');
    } catch (err: unknown) {
      this.logger.error({ err }, 'Failed fetching seating resources');
    }
  };

  private Bootstrap = async () => {
    this.logger.info('DataProvider: Loading from and bootstrapping to database.');

    await this.syncFulfillments();
    await this.syncSeatingResources();

    // look for key value config area:
    const keyValueEntries = await this.keyValueRepository.findAll();
    if (keyValueEntries.length === 0) {
      this.keyvalueconfig = {};
      this.logger.info('No key value config found, using empty config');
    } else {
      this.logger.debug({ keyValueCount: keyValueEntries.length }, 'Found KeyValue entries in database');
      for (const entry of keyValueEntries) {
        if (Object.hasOwn(this.keyvalueconfig, entry.key)) {
          this.logger.error(`Clobbering key: ${entry.key} containing ${this.keyvalueconfig[entry.key]}`);
        }
        this.keyvalueconfig[entry.key] = entry.value;
      }
    }

    // check for and populate settings, including operating hours
    const foundSettings = await this.settingsRepository.get();
    this.logger.info({ settings: foundSettings }, 'Found settings');
    this.settings = foundSettings ?? null;

    this.logger.debug('Done Bootstrapping DataProvider');
  };

  getSettings(): IWSettings | null {
    return this.settings;
  }

  getFulfillments(): Record<string, FulfillmentConfig> {
    return this.fulfillments;
  }

  getSeatingResources(): Record<string, SeatingResource> {
    return this.seatingResources;
  }

  getKeyValueConfig(): Record<string, string> {
    return this.keyvalueconfig;
  }

  /**
   * Update settings in memory and persist to database.
   */
  updateSettings = async (da: IWSettings) => {
    this.settings = da;
    try {
      await this.settingsRepository.save(da);
      this.logger.debug({ settings: da }, 'Saved settings');
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
        return this.fulfillmentRepository.update(fId, { blockedOff: newBlockedOff });
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
        return this.fulfillmentRepository.update(fId, { blockedOff: newBlockedOff });
      }),
    );
  };

  setLeadTimes = async (request: SetLeadTimesRequest) => {
    return await Promise.all(
      Object.entries(request).map(async ([fId, leadTime]) => {
        return this.fulfillmentRepository.update(fId, { leadTime });
      }),
    );
  };

  setFulfillment = async (fulfillment: Omit<FulfillmentConfig, 'id'>) => {
    try {
      const created = await this.fulfillmentRepository.create(fulfillment);
      this.logger.debug({ fulfillment: created }, 'Saved new fulfillment');
      this.fulfillments[created.id] = created;
      return created;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error saving new fulfillment');
      throw err;
    }
  };

  // TODO: does this properly handle partial updates?
  updateFulfillment = async (id: string, fulfillment: Partial<Omit<FulfillmentConfig, 'id'>>) => {
    try {
      const updated = await this.fulfillmentRepository.update(id, fulfillment);
      this.logger.debug({ fulfillmentId: id, fulfillment: updated }, 'Updated fulfillment');
      if (updated) {
        this.fulfillments[id] = updated;
      }
      return updated;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error updating fulfillment');
      throw err;
    }
  };

  /** this probably should get deleted. We want to disable seating resources and repurpose disabled ones otherwise this might become a data management nightmare */
  deleteFulfillment = async (id: string) => {
    try {
      const deleted = await this.fulfillmentRepository.delete(id);
      this.logger.debug({ fulfillmentId: id, deleted }, 'Deleted fulfillment');
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.fulfillments[id];
      return deleted;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error deleting fulfillment');
      throw err;
    }
  };

  setSeatingResource = async (seatingResource: Omit<SeatingResource, 'id'>) => {
    try {
      const created = await this.seatingResourceRepository.create(seatingResource);
      this.logger.debug({ seatingResource: created }, 'Saved new seating resource');
      this.seatingResources[created.id] = created;
      return created;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error saving new seating resource');
      throw err;
    }
  };

  updateSeatingResource = async (id: string, seatingResource: Partial<Omit<SeatingResource, 'id'>>) => {
    try {
      const updated = await this.seatingResourceRepository.update(id, seatingResource);
      this.logger.debug({ seatingResourceId: id, seatingResource: updated }, 'Updated Seating Resource');
      if (updated) {
        this.seatingResources[id] = updated;
      }
      return updated;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error updating Seating Resource');
      throw err;
    }
  };

  /** precondition: references to this seating resource have already been removed from the catalog! */
  deleteSeatingResource = async (id: string) => {
    try {
      const deleted = await this.seatingResourceRepository.delete(id);
      this.logger.debug({ seatingResourceId: id, deleted }, 'Deleted seating resource');
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.seatingResources[id];
      return deleted;
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error deleting seating resource');
      throw err;
    }
  };

  updateKeyValueConfig = async (da: { [key: string]: string }) => {
    this.keyvalueconfig = da;
    try {
      const entries: KeyValueEntry[] = Object.entries(da).map(([key, value]) => ({ key, value }));
      await this.keyValueRepository.setAll(entries);
      this.logger.debug({ keyValueConfig: da }, 'Saved key/value config');
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error saving key/value config');
      throw err;
    }
  };
}
