import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Central configuration service providing typed access to environment variables.
 * Eliminates scattered process.env usage throughout the codebase.
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) { }

  // ============ Database Configuration ============

  get dbTable(): string {
    return this.configService.get<string>('DBTABLE') ?? '';
  }

  get dbUser(): string | undefined {
    return this.configService.get<string>('DBUSER');
  }

  get dbPass(): string | undefined {
    return this.configService.get<string>('DBPASS');
  }

  get dbEndpoint(): string {
    return this.configService.get<string>('DBENDPOINT') ?? '127.0.0.1:27017';
  }

  get mongoUri(): string {
    return `mongodb://${this.dbEndpoint}/${this.dbTable}`;
  }

  // ============ Square API Configuration ============

  get squareBatchChunkSize(): number {
    const value = this.configService.get<string>('WARIO_SQUARE_BATCH_CHUNK_SIZE');
    return value ? parseInt(value, 10) : 25;
  }

  get suppressSquareInitSync(): boolean {
    const value = this.configService.get<string>('WARIO_SUPPRESS_SQUARE_INIT_SYNC');
    return value === '1' || value === 'true';
  }

  get forceSquareCatalogRebuildOnLoad(): boolean {
    const value = this.configService.get<string>('WARIO_FORCE_SQUARE_CATALOG_REBUILD_ON_LOAD');
    return value === '1' || value === 'true' || this.suppressSquareInitSync;
  }

  // ============ Environment Configuration ============

  get timezone(): string {
    return this.configService.get<string>('TZ') ?? 'UTC';
  }

  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'development';
  }

  get port(): number {
    return this.configService.get<number>('PORT') ?? 3000;
  }

  // ============ CORS Configuration ============

  /**
   * Returns allowed CORS origins for both HTTP and WebSocket connections.
   * In development, allows localhost origins.
   * In production, reads from CORS_ORIGINS env var (comma-separated).
   */
  get corsOrigins(): (string | RegExp)[] {
    const envOrigins = this.configService.get<string>('CORS_ORIGINS');
    if (envOrigins) {
      return envOrigins.split(',').map(origin => origin.trim());
    }

    // Default development origins
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173', // Vite default
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      /https:\/\/.*\.windycitypie\.com$/,
      /https:\/\/windycitypie\.com$/,
      /https:\/\/.*\.breezytownpizza\.com$/,
      /https:\/\/breezytownpizza\.com$/,
    ];
  }
}
