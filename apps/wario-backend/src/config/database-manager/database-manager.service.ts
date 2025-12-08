import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { SEMVER } from '@wcp/wario-shared';

// We need to import package.json. In NestJS build, it might not be in the same relative path.
// For now, let's assume we can require it or use a const.
import PACKAGE_JSON from '../../../package.json';
import DBVersion from '../../models/DBVersionSchema';

interface IMigrationFunctionObject {
  [index: string]: [SEMVER, () => Promise<void>];
}

@Injectable()
export class DatabaseManagerService implements OnModuleInit {
  constructor(
    @InjectModel('DBVersionSchema') private dbVersionModel: typeof DBVersion,
    @InjectConnection() private connection: Connection,
    @InjectPinoLogger(DatabaseManagerService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    await this.Bootstrap();
  }

  private SetVersion = async (new_version: SEMVER) => {
    return this.dbVersionModel.findOneAndUpdate({}, new_version, {
      new: true,
      upsert: true,
    });
  };

  private UPGRADE_MIGRATION_FUNCTIONS: IMigrationFunctionObject = {

    '0.6.8': [{ major: 0, minor: 6, patch: 9 }, async () => {}],
  };

  Bootstrap = async () => {
    const [VERSION_MAJOR, VERSION_MINOR, VERSION_PATCH] = PACKAGE_JSON.version.split('.', 3).map((x) => parseInt(x));
    const VERSION_PACKAGE = {
      major: VERSION_MAJOR,
      minor: VERSION_MINOR,
      patch: VERSION_PATCH,
    };

    // load version from the DB
    this.logger.info('Running database upgrade bootstrap.');

    let current_db_version = '0.0.0';

    const db_version = await this.dbVersionModel.find({});
    if (db_version.length > 1) {
      this.logger.error({ db_version }, 'Found more than one DB version entry, deleting all');
      await this.dbVersionModel.deleteMany({});
    } else if (db_version.length === 1) {
      current_db_version = `${db_version[0].major.toString()}.${db_version[0].minor.toString()}.${db_version[0].patch.toString()}`;
    }

    // run update loop
    while (PACKAGE_JSON.version !== current_db_version) {
      if (Object.hasOwn(this.UPGRADE_MIGRATION_FUNCTIONS, current_db_version)) {
        const [next_ver, migration_function] = this.UPGRADE_MIGRATION_FUNCTIONS[current_db_version];
        const next_ver_string = `${next_ver.major.toString()}.${next_ver.minor.toString()}.${next_ver.patch.toString()}`;
        this.logger.info(`Running migration function from ${current_db_version} to ${next_ver_string}`);
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
    this.logger.info('Database upgrade checks completed.');
  };
}
