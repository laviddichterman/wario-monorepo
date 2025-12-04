import { type TestingModule } from '@nestjs/testing';

import { createTestingModuleWithMocks } from '../test/utils';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    const module: TestingModule = await createTestingModuleWithMocks({
      controllers: [AppController],
      mocks: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      appService.getHello.mockReturnValue('Hello World!');
      expect(appController.getHello()).toBe('Hello World!');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(appService.getHello).toHaveBeenCalled();
    });
  });
});
