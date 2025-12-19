/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-template-expressions */

import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * MongooseToNewMigrator: Migrates Mongoose database from pre-2025 schema to 2025 schema.
 *
 * Phase 1 (additive) migration:
 * - Backfills `children[]` and `products[]` on categories
 * - Backfills `options[]` on option types
 * - Backfills `instances[]` on products
 * - Normalizes displayFlags and required defaults on all entities
 * - Flattens settings.config to top-level fields
 *
 * Legacy fields are preserved for rollback safety.
 */
@Injectable()
export class MongooseToNewMigrator {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectPinoLogger(MongooseToNewMigrator.name)
    private readonly logger: PinoLogger,
  ) { }

  // ========== Helper Functions ==========

  private chunk<T>(xs: T[], size: number): T[][] {
    if (xs.length === 0) return [];
    const chunks: T[][] = [];
    for (let i = 0; i < xs.length; i += size) {
      chunks.push(xs.slice(i, i + size));
    }
    return chunks;
  }

  private normalizeId(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'toString' in value) {
      return (value as { toString(): string }).toString();
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return value.toString();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private ensureRecord(value: unknown): Record<string, unknown> {
    return this.isRecord(value) ? value : {};
  }

  private getOrInitRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> {
    const existing = obj[key];
    if (this.isRecord(existing)) return existing;
    const created: Record<string, unknown> = {};
    obj[key] = created;
    return created;
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => this.normalizeId(v)).filter(Boolean) as string[];
  }

  // ========== Main Migration ==========

  /**
   * Runs the 2025 schema migration (Phase 1: additive).
   * This adds new fields while preserving legacy fields for rollback.
   */
  async migrate2025Schema(): Promise<void> {
    this.logger.info('[2025 Migration] Starting phase-1 (additive) 2025 schema migrations.');

    const DEFAULT_ORDINAL_FALLBACK = 999999;

    // Get collection references
    const categoryCollection = this.mongoConnection.collection('wcategoryschemas');
    const productCollection = this.mongoConnection.collection('wproductschemas');
    const productInstanceCollection = this.mongoConnection.collection('wproductinstanceschemas');
    const optionTypeCollection = this.mongoConnection.collection('woptiontypeschemas');
    const optionCollection = this.mongoConnection.collection('woptionschemas');
    const settingsCollection = this.mongoConnection.collection('settingsschemas');
    const fulfillmentCollection = this.mongoConnection.collection('fulfillmentschemas');
    const orderCollection = this.mongoConnection.collection('orderinstances');

    // ============================================================
    // 1) ProductInstances: normalize required fields and gather ordering data
    // ============================================================
    type ProductInstanceSnapshot = {
      id: string;
      productId: string;
      instanceOrdinal: number;
      menuOrdinal: number;
    };

    const productInstancesRaw = await productInstanceCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            productId: 1,
            ordinal: 1,
            description: 1,
            externalIDs: 1,
            displayFlags: 1,
            modifiers: 1,
          },
        },
      )
      .toArray();

    const productInstancesByProductId = new Map<string, ProductInstanceSnapshot[]>();
    const productInstanceBulkOps: Parameters<typeof productInstanceCollection.bulkWrite>[0] = [];

    for (const pi of productInstancesRaw) {
      const piId = this.normalizeId(pi._id);
      const piProductId = this.normalizeId(pi.productId);
      if (!piId || !piProductId) {
        this.logger.warn(
          `[2025 Migration] Skipping product instance with missing _id/productId: ${JSON.stringify({ _id: piId, productId: piProductId })}`,
        );
        continue;
      }

      const instanceOrdinal = typeof pi.ordinal === 'number' ? pi.ordinal : Number.NEGATIVE_INFINITY;

      const displayFlags = this.ensureRecord(pi.displayFlags);
      const posFlags = this.getOrInitRecord(displayFlags, 'pos');
      const menuFlags = this.getOrInitRecord(displayFlags, 'menu');
      const orderFlags = this.getOrInitRecord(displayFlags, 'order');

      // Normalize POS flags
      if (typeof posFlags.hide !== 'boolean') posFlags.hide = false;
      if (typeof posFlags.name !== 'string') posFlags.name = '';
      if (typeof posFlags.skip_customization !== 'boolean') posFlags.skip_customization = false;

      // Normalize Menu flags
      if (typeof menuFlags.ordinal !== 'number') menuFlags.ordinal = DEFAULT_ORDINAL_FALLBACK;
      if (typeof menuFlags.hide !== 'boolean') menuFlags.hide = false;
      if (typeof menuFlags.price_display !== 'string') menuFlags.price_display = 'ALWAYS';
      if (typeof menuFlags.adornment !== 'string') menuFlags.adornment = '';
      if (typeof menuFlags.suppress_exhaustive_modifier_list !== 'boolean')
        menuFlags.suppress_exhaustive_modifier_list = false;
      if (typeof menuFlags.show_modifier_options !== 'boolean') menuFlags.show_modifier_options = false;

      // Normalize Order flags
      if (typeof orderFlags.ordinal !== 'number') orderFlags.ordinal = menuFlags.ordinal;
      if (typeof orderFlags.hide !== 'boolean') orderFlags.hide = false;
      if (typeof orderFlags.price_display !== 'string') orderFlags.price_display = 'ALWAYS';
      if (typeof orderFlags.adornment !== 'string') orderFlags.adornment = '';
      if (typeof orderFlags.skip_customization !== 'boolean') orderFlags.skip_customization = false;
      if (typeof orderFlags.suppress_exhaustive_modifier_list !== 'boolean')
        orderFlags.suppress_exhaustive_modifier_list = false;

      const menuOrdinal = menuFlags.ordinal as number;

      const set: Record<string, unknown> = {};
      if (pi.description === null || pi.description === undefined) set['description'] = '';
      if (!Array.isArray(pi.externalIDs)) set['externalIDs'] = [];
      if (!Array.isArray(pi.modifiers)) set['modifiers'] = [];
      set['displayFlags'] = displayFlags;

      productInstanceBulkOps.push({
        updateOne: {
          filter: { _id: pi._id },
          update: { $set: set },
        },
      });

      const arr = productInstancesByProductId.get(piProductId) ?? [];
      arr.push({ id: piId, productId: piProductId, instanceOrdinal, menuOrdinal });
      productInstancesByProductId.set(piProductId, arr);
    }

    for (const ops of this.chunk(productInstanceBulkOps, 500)) {
      await productInstanceCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(`[2025 Migration] Updated ${productInstanceBulkOps.length} product instance documents.`);

    // ============================================================
    // 2) Products: backfill `instances[]` ordered by legacy ordinal DESC
    // ============================================================
    const productsRaw = await productCollection
      .find(
        {},
        { projection: { _id: 1, baseProductId: 1, category_ids: 1, displayFlags: 1, modifiers: 1, serviceDisable: 1 } },
      )
      .toArray();

    const productMenuOrdinalByProductId = new Map<string, number>();
    const productBulkOps: Parameters<typeof productCollection.bulkWrite>[0] = [];

    for (const p of productsRaw) {
      const productId = this.normalizeId(p._id);
      if (!productId) continue;

      const instances = productInstancesByProductId.get(productId) ?? [];
      if (instances.length === 0) {
        this.logger.warn(`[2025 Migration] Product ${productId} has no instances. Skipping instances[] backfill.`);
        continue;
      }

      // Sort by instanceOrdinal DESC (highest first = base instance first)
      instances.sort((a, b) => {
        if (a.instanceOrdinal !== b.instanceOrdinal) return b.instanceOrdinal - a.instanceOrdinal;
        return a.id.localeCompare(b.id);
      });

      const instanceIds = instances.map((x) => x.id);
      const baseInstanceId = instanceIds[0];
      productMenuOrdinalByProductId.set(productId, instances[0].menuOrdinal);

      const set: Record<string, unknown> = { instances: instanceIds };

      // Keep legacy `baseProductId` aligned for rollback
      if (typeof p.baseProductId !== 'string' || p.baseProductId !== baseInstanceId) {
        set['baseProductId'] = baseInstanceId;
      }

      if (!Array.isArray(p.serviceDisable)) set['serviceDisable'] = [];

      const displayFlags = this.ensureRecord(p.displayFlags);
      const orderGuide = this.getOrInitRecord(displayFlags, 'order_guide');
      orderGuide.warnings = this.normalizeStringArray(orderGuide.warnings);
      orderGuide.suggestions = this.normalizeStringArray(orderGuide.suggestions);
      orderGuide.errors = this.normalizeStringArray(orderGuide.errors);
      if (typeof displayFlags.is3p !== 'boolean') displayFlags.is3p = false;
      set['displayFlags'] = displayFlags;

      // Ensure product modifier entries have serviceDisable arrays
      const modifiers = Array.isArray(p.modifiers) ? p.modifiers : [];
      let modifiersChanged = !Array.isArray(p.modifiers);
      for (let i = 0; i < modifiers.length; i++) {
        const mod = modifiers[i];
        if (!this.isRecord(mod)) {
          modifiers[i] = { serviceDisable: [] };
          modifiersChanged = true;
          continue;
        }
        const normalized = this.normalizeStringArray(mod.serviceDisable);
        const existing = Array.isArray(mod.serviceDisable) ? mod.serviceDisable : null;
        if (!existing || normalized.length !== existing.length) {
          mod.serviceDisable = normalized;
          modifiersChanged = true;
        }
      }
      if (modifiersChanged) set['modifiers'] = modifiers;

      productBulkOps.push({
        updateOne: { filter: { _id: p._id }, update: { $set: set } },
      });
    }

    for (const ops of this.chunk(productBulkOps, 500)) {
      await productCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(`[2025 Migration] Updated ${productBulkOps.length} product documents with instances[].`);

    // ============================================================
    // 3) Options: normalize required fields and group by modifierTypeId
    // ============================================================
    const optionsRaw = await optionCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            description: 1,
            metadata: 1,
            displayFlags: 1,
            availability: 1,
            ordinal: 1,
            modifierTypeId: 1,
            externalIDs: 1,
          },
        },
      )
      .toArray();

    const optionsByModifierTypeId = new Map<string, { id: string; ordinal: number }[]>();
    const optionBulkOps: Parameters<typeof optionCollection.bulkWrite>[0] = [];

    for (const opt of optionsRaw) {
      const optionId = this.normalizeId(opt._id);
      const modifierTypeId = this.normalizeId(opt.modifierTypeId);
      if (!optionId) continue;

      const metadata = this.ensureRecord(opt.metadata);
      if (typeof metadata.flavor_factor !== 'number') metadata.flavor_factor = 0;
      if (typeof metadata.bake_factor !== 'number') metadata.bake_factor = 0;
      if (typeof metadata.can_split !== 'boolean') metadata.can_split = false;
      if (typeof metadata.allowHeavy !== 'boolean') metadata.allowHeavy = false;
      if (typeof metadata.allowLite !== 'boolean') metadata.allowLite = false;
      if (typeof metadata.allowOTS !== 'boolean') metadata.allowOTS = false;

      const displayFlags = this.ensureRecord(opt.displayFlags);
      if (typeof displayFlags.omit_from_shortname !== 'boolean') displayFlags.omit_from_shortname = false;
      if (typeof displayFlags.omit_from_name !== 'boolean') displayFlags.omit_from_name = false;

      const set: Record<string, unknown> = { metadata, displayFlags };
      if (opt.description === null || opt.description === undefined) set['description'] = '';
      if (opt.availability === null) set['availability'] = [];
      if (!Array.isArray(opt.externalIDs)) set['externalIDs'] = [];

      optionBulkOps.push({
        updateOne: { filter: { _id: opt._id }, update: { $set: set } },
      });

      if (modifierTypeId) {
        const arr = optionsByModifierTypeId.get(modifierTypeId) ?? [];
        arr.push({ id: optionId, ordinal: typeof opt.ordinal === 'number' ? opt.ordinal : DEFAULT_ORDINAL_FALLBACK });
        optionsByModifierTypeId.set(modifierTypeId, arr);
      }
    }

    for (const ops of this.chunk(optionBulkOps, 500)) {
      await optionCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(`[2025 Migration] Updated ${optionBulkOps.length} option documents.`);

    // ============================================================
    // 4) OptionTypes: backfill `options[]` ordered by legacy ordinal ASC
    // ============================================================
    const optionTypesRaw = await optionTypeCollection
      .find({}, { projection: { _id: 1, name: 1, displayName: 1, displayFlags: 1 } })
      .toArray();

    const optionTypeBulkOps: Parameters<typeof optionTypeCollection.bulkWrite>[0] = [];

    for (const ot of optionTypesRaw) {
      const optionTypeId = this.normalizeId(ot._id);
      if (!optionTypeId) continue;

      const opts = optionsByModifierTypeId.get(optionTypeId) ?? [];
      opts.sort((a, b) => {
        if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
        return a.id.localeCompare(b.id);
      });
      const optionIds = opts.map((x) => x.id);

      const displayFlags = this.ensureRecord(ot.displayFlags);
      if (typeof displayFlags.is3p !== 'boolean') displayFlags.is3p = false;
      if (typeof displayFlags.omit_section_if_no_available_options !== 'boolean')
        displayFlags.omit_section_if_no_available_options = false;
      if (typeof displayFlags.omit_options_if_not_available !== 'boolean')
        displayFlags.omit_options_if_not_available = false;
      if (typeof displayFlags.use_toggle_if_only_two_options !== 'boolean')
        displayFlags.use_toggle_if_only_two_options = false;
      if (typeof displayFlags.hidden !== 'boolean') displayFlags.hidden = false;
      if (typeof displayFlags.empty_display_as !== 'string') displayFlags.empty_display_as = 'OMIT';
      if (typeof displayFlags.modifier_class !== 'string') displayFlags.modifier_class = 'ADD';
      if (typeof displayFlags.template_string !== 'string') displayFlags.template_string = '';
      if (typeof displayFlags.multiple_item_separator !== 'string') displayFlags.multiple_item_separator = ' + ';
      if (typeof displayFlags.non_empty_group_prefix !== 'string') displayFlags.non_empty_group_prefix = '';
      if (typeof displayFlags.non_empty_group_suffix !== 'string') displayFlags.non_empty_group_suffix = '';

      optionTypeBulkOps.push({
        updateOne: {
          filter: { _id: ot._id },
          update: {
            $set: {
              options: optionIds,
              displayName: typeof ot.displayName === 'string' ? ot.displayName : (ot.name ?? ''),
              displayFlags,
            },
          },
        },
      });
    }

    for (const ops of this.chunk(optionTypeBulkOps, 500)) {
      await optionTypeCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(`[2025 Migration] Updated ${optionTypeBulkOps.length} option type documents with options[].`);

    // ============================================================
    // 5) Categories: backfill `children[]` and `products[]`
    // ============================================================
    const categoriesRaw = await categoryCollection
      .find({}, { projection: { _id: 1, parent_id: 1, ordinal: 1, display_flags: 1, serviceDisable: 1 } })
      .toArray();

    const categoryIds = new Set(categoriesRaw.map((c) => this.normalizeId(c._id)).filter(Boolean) as string[]);

    type CatChild = { id: string; ordinal: number };
    const childrenByParent = new Map<string | null, CatChild[]>();

    for (const c of categoriesRaw) {
      const id = this.normalizeId(c._id);
      if (!id) continue;

      let parentId = this.normalizeId(c.parent_id);
      if (parentId && !categoryIds.has(parentId)) {
        this.logger.warn(`[2025 Migration] Category ${id} has missing parent_id ${parentId}; setting to null.`);
        parentId = null;
      }
      const ord = typeof c.ordinal === 'number' ? c.ordinal : DEFAULT_ORDINAL_FALLBACK;
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push({ id, ordinal: ord });
      childrenByParent.set(parentId, arr);
    }

    // Map products to categories
    const productsForCategories = new Map<string, { id: string; menuOrdinal: number }[]>();
    for (const p of productsRaw) {
      const pid = this.normalizeId(p._id);
      if (!pid) continue;

      const menuOrdinal = productMenuOrdinalByProductId.get(pid) ?? DEFAULT_ORDINAL_FALLBACK;
      const categoryIdsForProduct = Array.isArray(p.category_ids)
        ? (p.category_ids.map((cid: unknown) => this.normalizeId(cid)).filter(Boolean) as string[])
        : [];

      for (const cid of categoryIdsForProduct) {
        const arr = productsForCategories.get(cid) ?? [];
        arr.push({ id: pid, menuOrdinal });
        productsForCategories.set(cid, arr);
      }
    }

    const categoryBulkOps: Parameters<typeof categoryCollection.bulkWrite>[0] = [];

    for (const c of categoriesRaw) {
      const cid = this.normalizeId(c._id);
      if (!cid) continue;

      const childEntries = childrenByParent.get(cid) ?? [];
      childEntries.sort((a, b) => {
        if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal;
        return a.id.localeCompare(b.id);
      });

      const productEntries = productsForCategories.get(cid) ?? [];
      productEntries.sort((a, b) => {
        if (a.menuOrdinal !== b.menuOrdinal) return a.menuOrdinal - b.menuOrdinal;
        return a.id.localeCompare(b.id);
      });

      const displayFlags = this.ensureRecord(c.display_flags);
      if (typeof displayFlags.call_line_name !== 'string') displayFlags.call_line_name = '';
      if (typeof displayFlags.call_line_display !== 'string') displayFlags.call_line_display = 'SHORTCODE';
      if (typeof displayFlags.nesting !== 'string') displayFlags.nesting = 'FLAT';

      categoryBulkOps.push({
        updateOne: {
          filter: { _id: c._id },
          update: {
            $set: {
              children: childEntries.map((x) => x.id),
              products: productEntries.map((x) => x.id),
              display_flags: displayFlags,
              serviceDisable: this.normalizeStringArray(c.serviceDisable),
            },
          },
        },
      });
    }

    for (const ops of this.chunk(categoryBulkOps, 500)) {
      await categoryCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(
      `[2025 Migration] Updated ${categoryBulkOps.length} category documents with children[] + products[].`,
    );

    // ============================================================
    // 6) Settings: flatten config fields to top-level
    // ============================================================
    const settingsDocs = await settingsCollection
      .find(
        {},
        {
          projection: {
            _id: 1,
            config: 1,
            LOCATION_NAME: 1,
            SQUARE_LOCATION: 1,
            SQUARE_LOCATION_ALTERNATE: 1,
            SQUARE_APPLICATION_ID: 1,
            DEFAULT_FULFILLMENTID: 1,
            TAX_RATE: 1,
            ALLOW_ADVANCED: 1,
            TIP_PREAMBLE: 1,
            LOCATION_PHONE_NUMBER: 1,
          },
        },
      )
      .toArray();

    const settingsBulkOps: Parameters<typeof settingsCollection.bulkWrite>[0] = [];

    for (const s of settingsDocs) {
      const config = this.ensureRecord(s.config);
      const set: Record<string, unknown> = {};

      const setIfMissing = (key: string) => {
        const current = (s as Record<string, unknown>)[key];
        if (current === undefined || current === null || current === '') {
          const v = config[key];
          if (v !== undefined) set[key] = v;
        }
      };

      setIfMissing('LOCATION_NAME');
      setIfMissing('SQUARE_LOCATION');
      setIfMissing('SQUARE_LOCATION_ALTERNATE');
      setIfMissing('SQUARE_APPLICATION_ID');
      setIfMissing('DEFAULT_FULFILLMENTID');
      setIfMissing('TAX_RATE');
      setIfMissing('ALLOW_ADVANCED');
      setIfMissing('TIP_PREAMBLE');
      setIfMissing('LOCATION_PHONE_NUMBER');

      if (Object.keys(set).length > 0) {
        settingsBulkOps.push({ updateOne: { filter: { _id: s._id }, update: { $set: set } } });
      }
    }

    for (const ops of this.chunk(settingsBulkOps, 200)) {
      await settingsCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(`[2025 Migration] Updated ${settingsBulkOps.length} settings documents.`);

    // ============================================================
    // 7) Fulfillments: add missing leadTimeOffset
    // ============================================================
    const fulfillmentUpdate = await fulfillmentCollection.updateMany(
      { leadTimeOffset: { $exists: false } },
      { $set: { leadTimeOffset: 0 } },
    );
    this.logger.info(
      `[2025 Migration] Backfilled leadTimeOffset on fulfillments: ${JSON.stringify(fulfillmentUpdate)}`,
    );

    // ============================================================
    // 8) Orders: ensure required nested strings exist
    // ============================================================
    const orders = await orderCollection
      .find({}, { projection: { _id: 1, customerInfo: 1, fulfillment: 1 } })
      .toArray();
    const orderBulkOps: Parameters<typeof orderCollection.bulkWrite>[0] = [];

    for (const o of orders) {
      const customerInfo = this.ensureRecord(o.customerInfo);
      const fulfillment = this.ensureRecord(o.fulfillment);
      const deliveryInfo = fulfillment.deliveryInfo;

      const set: Record<string, unknown> = {};
      if (typeof customerInfo.referral !== 'string') set['customerInfo.referral'] = '';
      if (this.isRecord(deliveryInfo)) {
        if (typeof deliveryInfo.address2 !== 'string') set['fulfillment.deliveryInfo.address2'] = '';
        if (typeof deliveryInfo.deliveryInstructions !== 'string')
          set['fulfillment.deliveryInfo.deliveryInstructions'] = '';
      }

      if (Object.keys(set).length > 0) {
        orderBulkOps.push({ updateOne: { filter: { _id: o._id }, update: { $set: set } } });
      }
    }

    for (const ops of this.chunk(orderBulkOps, 500)) {
      await orderCollection.bulkWrite(ops, { ordered: false });
    }
    this.logger.info(`[2025 Migration] Updated ${orderBulkOps.length} order documents.`);

    this.logger.info('[2025 Migration] Completed phase-1 (additive) 2025 schema migrations.');
  }
}
