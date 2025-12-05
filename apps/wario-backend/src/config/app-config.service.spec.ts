import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('database configuration', () => {
    it('should return dbTable from config', () => {
      mockConfigService.get.mockReturnValue('testdb');
      expect(service.dbTable).toBe('testdb');
      expect(configService.get).toHaveBeenCalledWith('DBTABLE');
    });

    it('should return empty string for missing dbTable', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.dbTable).toBe('');
    });

    it('should return dbEndpoint with default', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.dbEndpoint).toBe('127.0.0.1:27017');
    });

    it('should build mongoUri correctly', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DBENDPOINT') return 'localhost:27017';
        if (key === 'DBTABLE') return 'mydb';
        return undefined;
      });
      expect(service.mongoUri).toBe('mongodb://localhost:27017/mydb');
    });
  });

  describe('Square API configuration', () => {
    it('should return squareBatchChunkSize with default', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.squareBatchChunkSize).toBe(25);
    });

    it('should parse squareBatchChunkSize from env', () => {
      mockConfigService.get.mockReturnValue('50');
      expect(service.squareBatchChunkSize).toBe(50);
    });

    it('should return suppressSquareInitSync as false by default', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.suppressSquareInitSync).toBe(false);
    });

    it('should return suppressSquareInitSync as true when set to "1"', () => {
      mockConfigService.get.mockReturnValue('1');
      expect(service.suppressSquareInitSync).toBe(true);
    });

    it('should return suppressSquareInitSync as true when set to "true"', () => {
      mockConfigService.get.mockReturnValue('true');
      expect(service.suppressSquareInitSync).toBe(true);
    });

    it('should return forceSquareCatalogRebuildOnLoad when suppressSquareInitSync is true', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'WARIO_SUPPRESS_SQUARE_INIT_SYNC') return '1';
        return undefined;
      });
      expect(service.forceSquareCatalogRebuildOnLoad).toBe(true);
    });
  });

  describe('environment configuration', () => {
    it('should return timezone with default', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.timezone).toBe('UTC');
    });

    it('should return configured timezone', () => {
      mockConfigService.get.mockReturnValue('America/Chicago');
      expect(service.timezone).toBe('America/Chicago');
    });

    it('should return isProduction as true when NODE_ENV is not development', () => {
      mockConfigService.get.mockReturnValue('production');
      expect(service.isProduction).toBe(true);
    });

    it('should return isProduction as false when NODE_ENV is development', () => {
      mockConfigService.get.mockReturnValue('development');
      expect(service.isProduction).toBe(false);
    });

    it('should return port with default', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.port).toBe(3000);
    });

    it('should return configured port', () => {
      mockConfigService.get.mockReturnValue(8080);
      expect(service.port).toBe(8080);
    });
  });
});
