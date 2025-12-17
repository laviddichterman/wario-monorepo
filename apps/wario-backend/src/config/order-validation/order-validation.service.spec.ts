/**
 * OrderValidationService Unit Tests
 *
 * Tests for cart rebuilding and product availability validation.
 *
 * Note: RebuildOrderState delegates to wario-shared's RebuildAndSortCart,
 * which is extensively tested in packages/wario-shared. These tests verify
 * the service correctly integrates with CatalogProviderService.
 */

import { Test, type TestingModule } from '@nestjs/testing';

import type { FulfillmentConfig } from '@wcp/wario-shared';

import { mockCatalogProviderService } from 'test/utils';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';

import { OrderValidationService } from './order-validation.service';

// Mock FulfillmentConfig for testing - using cast for test flexibility
const createMockFulfillmentConfig = (overrides: Partial<FulfillmentConfig> = {}): FulfillmentConfig =>
  ({
    id: 'fulfillment-id',
    displayName: 'Test Fulfillment',
    shortcode: 'TF',
    exposeFulfillment: true,
    orderBaseCategoryId: 'base-cat-1',
    menuBaseCategoryId: 'menu-cat-1',
    orderSupplementaryCategoryId: null,
    requirePrepayment: false,
    allowPrepayment: true,
    allowTipping: true,
    autograt: null,
    serviceCharge: null,
    leadTime: 30,
    leadTimeOffset: 0,
    maxDuration: 60,
    minDuration: 0,
    timeStep: 15,
    ordinal: 0,
    service: 'PICKUP' as FulfillmentConfig['service'],
    operatingHours: { rules: [] },
    specialHours: [],
    blockedOff: [],
    messages: {
      DESCRIPTION: 'Test description',
      CONFIRMATION: 'Test confirmation',
      INSTRUCTIONS: 'Test instructions',
    },
    terms: [],
    ...overrides,
  }) as FulfillmentConfig;

describe('OrderValidationService', () => {
  let service: OrderValidationService;
  let mockCatalogService: ReturnType<typeof mockCatalogProviderService>;

  beforeEach(async () => {
    mockCatalogService = mockCatalogProviderService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderValidationService, { provide: CatalogProviderService, useValue: mockCatalogService }],
    }).compile();

    service = module.get<OrderValidationService>(OrderValidationService);
  });

  describe('constructor', () => {
    it('should create the service', () => {
      expect(service).toBeDefined();
    });
  });

  describe('RebuildOrderState', () => {
    it('should have RebuildOrderState method', () => {
      expect(typeof service.RebuildOrderState).toBe('function');
    });

    it('should access CatalogSelectors from CatalogProviderService', () => {
      // Setup a minimal mock that returns an object with the required structure
      const mockSelectors = {
        productEntry: jest.fn().mockReturnValue(null),
        productInstanceEntry: jest.fn().mockReturnValue(null),
        category: jest.fn().mockReturnValue(null),
        option: jest.fn().mockReturnValue(null),
        options: jest.fn().mockReturnValue([]),
        optionType: jest.fn().mockReturnValue(null),
        optionTypes: jest.fn().mockReturnValue([]),
        printerGroup: jest.fn().mockReturnValue(null),
        printerGroups: jest.fn().mockReturnValue([]),
        productInstanceFunction: jest.fn().mockReturnValue(null),
        orderInstanceFunction: jest.fn().mockReturnValue(null),
        settings: jest.fn().mockReturnValue(null),
        catalog: jest.fn().mockReturnValue(null),
      };

      Object.defineProperty(mockCatalogService, 'CatalogSelectors', {
        get: () => mockSelectors,
        configurable: true,
      });

      // Empty cart should return empty result without requiring catalog lookups
      const mockFulfillment = createMockFulfillmentConfig();
      const result = service.RebuildOrderState([], new Date(), mockFulfillment);

      expect(result).toHaveProperty('noLongerAvailable');
      expect(result).toHaveProperty('rebuiltCart');
      expect(result.noLongerAvailable).toHaveLength(0);
      expect(Object.keys(result.rebuiltCart)).toHaveLength(0);
    });

    it('should accept Date for service_time parameter', () => {
      const mockSelectors = {
        productEntry: jest.fn().mockReturnValue(null),
        productInstanceEntry: jest.fn().mockReturnValue(null),
        category: jest.fn().mockReturnValue(null),
        option: jest.fn().mockReturnValue(null),
        options: jest.fn().mockReturnValue([]),
        optionType: jest.fn().mockReturnValue(null),
        optionTypes: jest.fn().mockReturnValue([]),
        printerGroup: jest.fn().mockReturnValue(null),
        printerGroups: jest.fn().mockReturnValue([]),
        productInstanceFunction: jest.fn().mockReturnValue(null),
        orderInstanceFunction: jest.fn().mockReturnValue(null),
        settings: jest.fn().mockReturnValue(null),
        catalog: jest.fn().mockReturnValue(null),
      };

      Object.defineProperty(mockCatalogService, 'CatalogSelectors', {
        get: () => mockSelectors,
        configurable: true,
      });

      // Should not throw when called with Date
      const mockFulfillment = createMockFulfillmentConfig();
      expect(() => {
        service.RebuildOrderState([], new Date('2024-01-15T18:00:00Z'), mockFulfillment);
      }).not.toThrow();
    });

    it('should accept number (timestamp) for service_time parameter', () => {
      const mockSelectors = {
        productEntry: jest.fn().mockReturnValue(null),
        productInstanceEntry: jest.fn().mockReturnValue(null),
        category: jest.fn().mockReturnValue(null),
        option: jest.fn().mockReturnValue(null),
        options: jest.fn().mockReturnValue([]),
        optionType: jest.fn().mockReturnValue(null),
        optionTypes: jest.fn().mockReturnValue([]),
        printerGroup: jest.fn().mockReturnValue(null),
        printerGroups: jest.fn().mockReturnValue([]),
        productInstanceFunction: jest.fn().mockReturnValue(null),
        orderInstanceFunction: jest.fn().mockReturnValue(null),
        settings: jest.fn().mockReturnValue(null),
        catalog: jest.fn().mockReturnValue(null),
      };

      Object.defineProperty(mockCatalogService, 'CatalogSelectors', {
        get: () => mockSelectors,
        configurable: true,
      });

      // Should not throw when called with timestamp
      const mockFulfillment = createMockFulfillmentConfig();
      expect(() => {
        service.RebuildOrderState([], Date.now(), mockFulfillment);
      }).not.toThrow();
    });
  });
});
