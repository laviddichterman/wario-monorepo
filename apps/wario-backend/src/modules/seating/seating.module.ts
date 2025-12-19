import { Module } from '@nestjs/common';

import { SettingsModule } from '../../infrastructure/database/mongoose/models/settings/settings.module';
import { RepositoryModule } from '../../repositories/repository.module';

import { SeatingService } from './seating.service';

@Module({
  imports: [SettingsModule, RepositoryModule],
  providers: [SeatingService],
  exports: [SeatingService],
})
export class SeatingModule {}
