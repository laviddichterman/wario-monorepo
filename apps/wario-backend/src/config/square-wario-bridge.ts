/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { formatRFC3339 } from 'date-fns';
import { type PinoLogger } from 'nestjs-pino';
import {
  type CatalogIdMapping,
  type CatalogItemModifierListInfo,
  type CatalogObject,
  type Money,
  type Order,
  type OrderFulfillment,
  type OrderLineItem,
  type OrderLineItemDiscount,
  type OrderLineItemModifier,
} from 'square/legacy';

import {
  CartByPrinterGroup,
  type CoreCartEntry,
  CURRENCY,
  DiscountMethod,
  type ICatalog,
  type ICatalogSelectors,
  type IMoney,
  type IOption,
  type IOptionInstance,
  type IOptionType,
  type IProduct,
  type IProductInstance,
  type IProductModifier,
  type KeyValue,
  OptionPlacement,
  OptionQualifier,
  type OrderLineDiscount,
  type OrderTax,
  type PrinterGroup,
  PRODUCT_LOCATION,
  type ProductInstanceModifierEntry,
  TenderBaseStatus,
  type WCPProductV2Dto,
  type WProduct,
} from '@wcp/wario-shared';

// Interface to replace direct dependency on CatalogProviderInstance
export interface ICatalogContext {
  getCatalog(): ICatalog;
  // TODO: investigate if we can also store the product ID along with the product Instance ID to speed up lookups
  getReverseMappings(): Record<string, string>;
  getPrinterGroups(): Record<string, PrinterGroup>;
  getCatalogSelectors(): ICatalogSelectors;
  getLogger(): PinoLogger | undefined;
}

// * add note to payment or whatever so the SQ receipt makes some sense, see https://squareup.com/receipt/preview/jXnAjUa3wdk6al0EofHUg8PUZzFZY
// this all needs to be stored as part of the square configuration for the merchant. it should be bootstrapped and managed via the catalog sync process
// TODO: all these need to be config based and part of the square bootstrap process on a new location
//    const SQUARE_TAX_RATE_CATALOG_ID = isProduction ? 'TMG7E3E5E45OXHJTBOHG2PMS' : 'LOFKVY5UC3SLKPT2WANSBPZQ';
//    const SQUARE_WARIO_EXTERNAL_ID = isProduction ? 'L75RYR2NI3ED7VM7VKXO2DKO' : 'NDV2QHR54XWVXCKOHXK43ZLE';
//    const SQUARE_BANKERS_ADJUSTED_TAX_RATE_CATALOG_ID = isProduction
//   ? 'R77FWA4SNHB4RWNY4KNNQHJD'
//   : 'HIUHEOWWVR6MB3PP7ORCUVZW';
// const VARIABLE_PRICE_STORE_CREDIT_CATALOG_ID = isProduction
//   ? 'DNP5YT6QDIWTB53H46F3ECIN'
//   : 'RBYUD52HGFHPL4IG55LBHQAG';
// const DISCOUNT_CATALOG_ID = isProduction ? 'AKIYDPB5WJD2HURCWWZSAIF5' : 'PAMEV3WAZYEBJKFUAVQATS3K';

export const WARIO_SQUARE_ID_METADATA_KEY = 'SQID_';

/**
 * Constants for Square external ID key specifiers.
 * Used with GetSquareIdFromExternalIds and GetSquareIdIndexFromExternalIds.
 */
export const SquareExternalIdKey = {
  // Catalog object types
  CATEGORY: 'CATEGORY',
  ITEM: 'ITEM',
  ITEM_VARIATION: 'ITEM_VARIATION',
  MODIFIER_LIST: 'MODIFIER_LIST',
  MODIFIER: 'MODIFIER',

  // Modifier placement variants
  MODIFIER_WHOLE: 'MODIFIER_WHOLE',
  MODIFIER_LEFT: 'MODIFIER_LEFT',
  MODIFIER_RIGHT: 'MODIFIER_RIGHT',
  MODIFIER_HEAVY: 'MODIFIER_HEAVY',
  MODIFIER_LITE: 'MODIFIER_LITE',
  MODIFIER_OTS: 'MODIFIER_OTS',
} as const;

export type SquareExternalIdKeyType = (typeof SquareExternalIdKey)[keyof typeof SquareExternalIdKey];

export const BigIntMoneyToIntMoney = (bigIntMoney: Money): IMoney => ({
  amount: Number(bigIntMoney.amount),
  currency: bigIntMoney.currency!,
});

export const IMoneyToBigIntMoney = (money: IMoney): Money => ({
  amount: BigInt(money.amount),
  currency: money.currency,
});

export const GetSquareExternalIds = (externalIds: KeyValue[] | undefined) =>
  (externalIds ?? []).filter((x) => x.key.startsWith(WARIO_SQUARE_ID_METADATA_KEY));
export const GetNonSquareExternalIds = (externalIds: KeyValue[] | undefined) =>
  (externalIds ?? []).filter((x) => !x.key.startsWith(WARIO_SQUARE_ID_METADATA_KEY));

export const GetSquareIdIndexFromExternalIds = (externalIds: KeyValue[] | undefined, specifier: string) =>
  (externalIds ?? []).findIndex((x) => x.key === `${WARIO_SQUARE_ID_METADATA_KEY}${specifier}`);
export const GetSquareIdFromExternalIds = (externalIds: KeyValue[], specifier: string): string | null => {
  const kvIdx = GetSquareIdIndexFromExternalIds(externalIds, specifier);
  return kvIdx === -1 ? null : externalIds[kvIdx].value;
};
export interface SquareOrderFulfillmentInfo {
  displayName: string;
  emailAddress: string;
  phoneNumber: string;
  pickupAt: Date | number;
  note?: string;
}

/**
 * Generates a mapping from Square Catalog Object ID to WARIO ID.
 * Multiple square objects might map to the same WARIO ID due to feature emulation
 * @param catalog
 * @returns mapping from Square Catalog Object ID to WARIO ID
 */
export const GenerateSquareReverseMapping = (catalog: ICatalog): Record<string, string> => {
  const acc: Record<string, string> = {};
  Object.values(catalog.modifiers).forEach((modEntry) => {
    if (modEntry.options.length >= 1) {
      GetSquareExternalIds(modEntry.externalIDs).forEach((kv) => {
        acc[kv.value] = modEntry.id;
      });
      modEntry.options.forEach((oId) => {
        GetSquareExternalIds(catalog.options[oId].externalIDs).forEach((kv) => {
          acc[kv.value] = oId;
        });
      });
    }
  });
  Object.values(catalog.products).forEach((productEntry) => {
    productEntry.instances.forEach((pIId) => {
      GetSquareExternalIds(catalog.productInstances[pIId].externalIDs).forEach((kv) => {
        acc[kv.value] = pIId;
      });
    });
  });
  return acc;
};

export const LineItemsToOrderInstanceCart = (
  lineItems: OrderLineItem[],
  catalogContext: ICatalogContext,
): CoreCartEntry<WCPProductV2Dto>[] => {
  try {
    return lineItems
      .filter((line) => line.itemType === 'ITEM')
      .map((line) => {
        const pIId = catalogContext.getReverseMappings()[line.catalogObjectId!];
        if (!pIId) {
          catalogContext.getLogger()?.error('Unable to find matching product instance ID for square item variation');
        }

        // Thankfully this is only used on 3p integrations. But this is very slow now that we don't store a direct mapping back to the product ID from the instance.
        const _warioProductInstance = catalogContext.getCatalog().productInstances[pIId];
        // Find the product that contains this instance
        const productId = Object.keys(catalogContext.getCatalog().products).find((pid) =>
          catalogContext.getCatalog().products[pid].instances.includes(pIId),
        );
        if (!productId) {
          catalogContext.getLogger()?.error('Unable to find matching product ID for product instance');
          throw new Error('Product not found for instance');
        }

        const _warioProduct = catalogContext.getCatalog().products[productId];
        const modifiers: ProductInstanceModifierEntry[] = Object.values(
          (line.modifiers ?? []).reduce((acc: Record<string, ProductInstanceModifierEntry>, lineMod) => {
            const oId = catalogContext.getReverseMappings()[lineMod.catalogObjectId!];

            const _warioModifierOption = catalogContext.getCatalog().options[oId];
            // Find the modifier type that contains this option
            const mTId = Object.keys(catalogContext.getCatalog().modifiers).find((mtid) =>
              catalogContext.getCatalog().modifiers[mtid].options.includes(oId),
            );
            if (!mTId) {
              catalogContext.getLogger()?.error('Unable to find matching modifier type ID for option');
              throw new Error('Modifier type not found for option');
            }
            return {
              ...acc,
              [mTId]: {
                modifierTypeId: mTId,
                options: [
                  {
                    optionId: oId,
                    placement: OptionPlacement.WHOLE,
                    qualifier: OptionQualifier.REGULAR,
                  },
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  ...(acc[mTId]?.options ?? []),
                ],
              },
            };
          }, {}),
        )
          // now sort it by the order of modifier types in the catalog (using index in Object.keys as ordinal)
          .sort((a, b) => {
            const modifierTypeIds = Object.keys(catalogContext.getCatalog().modifiers);
            return modifierTypeIds.indexOf(a.modifierTypeId) - modifierTypeIds.indexOf(b.modifierTypeId);
          })
          .map((x) => ({
            ...x,
            options: x.options.sort((a, b) => {
              // Sort by position in the modifier type's options array
              const modifierType = catalogContext.getCatalog().modifiers[x.modifierTypeId];
              return modifierType.options.indexOf(a.optionId) - modifierType.options.indexOf(b.optionId);
            }),
          }));
        // Find a category that contains this product
        const category = Object.keys(catalogContext.getCatalog().categories).find((cid) =>
          catalogContext.getCatalog().categories[cid].products.includes(productId),
        );
        return {
          categoryId: category ?? '',
          product: {
            pid: productId,
            modifiers: modifiers,
          },
          quantity: parseInt(line.quantity),
        };
      });
  } catch (err: unknown) {
    const errorDetail = `Got error when attempting to ingest 3p line items (${JSON.stringify(lineItems)}) got error: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`;
    catalogContext.getLogger()?.error({ err, lineItems }, 'Got error when attempting to ingest 3p line items');
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw errorDetail;
  }
  return [];
};

export const CreateFulfillment = (info: SquareOrderFulfillmentInfo): OrderFulfillment => {
  return {
    type: 'PICKUP',
    pickupDetails: {
      scheduleType: 'SCHEDULED',
      recipient: {
        displayName: info.displayName.slice(0, 254),
        emailAddress: info.emailAddress,
        phoneNumber: info.phoneNumber,
      },
      pickupAt: formatRFC3339(info.pickupAt),
      ...(info.note ? { note: info.note.slice(0, 499) } : {}),
    },
  };
};

const OptionInstanceToSquareIdSpecifier = (
  optionInstance: IOptionInstance,
  logger?: PinoLogger,
): SquareExternalIdKeyType => {
  switch (optionInstance.placement) {
    case OptionPlacement.LEFT:
      return SquareExternalIdKey.MODIFIER_LEFT;
    case OptionPlacement.RIGHT:
      return SquareExternalIdKey.MODIFIER_RIGHT;
    case OptionPlacement.WHOLE:
      switch (optionInstance.qualifier) {
        case OptionQualifier.REGULAR:
          return SquareExternalIdKey.MODIFIER_WHOLE;
        case OptionQualifier.HEAVY:
          return SquareExternalIdKey.MODIFIER_HEAVY;
        case OptionQualifier.LITE:
          return SquareExternalIdKey.MODIFIER_LITE;
        case OptionQualifier.OTS:
          return SquareExternalIdKey.MODIFIER_OTS;
      }
  }
  logger?.error({ optionInstance }, 'UNHANDLED OPTION INSTANCE');
  return SquareExternalIdKey.MODIFIER_WHOLE;
};

// const CreateWarioCustomAttribute = (locationIds: string[]): CatalogObject => {
//   return {
//     id: '#WARIOID',
//     type: 'CUSTOM_ATTRIBUTE_DEFINITION',
//     presentAtAllLocations: false,
//     presentAtLocationIds: locationIds,
//     customAttributeDefinitionData: {
//       allowedObjectTypes: ['ITEM', 'ITEM_VARIATION'],
//       name: 'WARIO External ID',
//       type: 'STRING',
//       appVisibility: 'APP_VISIBILITY_HIDDEN',
//       key: 'WARIO_',
//       stringConfig: {
//         enforceUniqueness: false,
//       },
//     },
//   };
// };

/**
 *
 * @param mappings
 * @param batch ALL BATCHES MUST BE THE SAME LENGTH IN A CALL
 * @returns
 */
export const IdMappingsToExternalIds = (mappings: CatalogIdMapping[] | undefined, batch: string): KeyValue[] =>
  mappings
    ?.filter((x) => x.clientObjectId!.startsWith(`#${batch}_`))
    .map((x) => ({
      key: `${WARIO_SQUARE_ID_METADATA_KEY}${x.clientObjectId!.substring(2 + batch.length)}`,
      value: x.objectId!,
    })) ?? [];

export const MapPaymentStatus = (sqStatus: string) => {
  switch (sqStatus) {
    case 'APPROVED':
    case 'PENDING':
      return TenderBaseStatus.AUTHORIZED;
    case 'COMPLETED':
      return TenderBaseStatus.COMPLETED;
    case 'CANCELED':
    case 'FAILED':
      return TenderBaseStatus.CANCELED;
  }
  return TenderBaseStatus.CANCELED;
};

export const CreateOrderStoreCredit = (
  isProduction: boolean,
  locationId: string,
  referenceId: string,
  amount: IMoney,
  note: string,
): Order => {
  const VARIABLE_PRICE_STORE_CREDIT_CATALOG_ID = isProduction ? 'DNP5YT6QDIWTB53H46F3ECIN' : 'RBYUD52HGFHPL4IG55LBHQAG';

  return {
    referenceId: referenceId,
    lineItems: [
      {
        quantity: '1',
        catalogObjectId: VARIABLE_PRICE_STORE_CREDIT_CATALOG_ID,
        basePriceMoney: IMoneyToBigIntMoney(amount),
        note: note,
      },
    ],
    locationId,
    state: 'OPEN',
  };
};

export const CreateOrderStoreCreditForRefund = (
  isProduction: boolean,
  locationId: string,
  referenceId: string,
  amount: IMoney,
  note: string,
): Order => {
  return {
    ...CreateOrderStoreCredit(isProduction, locationId, referenceId, amount, note),
    discounts: [
      {
        type: 'FIXED_AMOUNT',
        scope: 'ORDER',
        name: 'Refund',
        amountMoney: IMoneyToBigIntMoney(amount),
        appliedMoney: IMoneyToBigIntMoney(amount),
      },
    ],
    pricingOptions: {
      autoApplyDiscounts: true,
      autoApplyTaxes: false,
    },
  };
};

export const CreateOrdersForPrintingFromCart = (
  isProduction: boolean,
  locationId: string,
  referenceId: string,
  ticketName: string,
  cart: CoreCartEntry<WProduct>[],
  fulfillmentInfo: SquareOrderFulfillmentInfo,
  catalogContext: ICatalogContext,
): Order[] => {
  const carts: CoreCartEntry<WProduct>[][] = [];
  // split out the items we need to get printed
  const cartEntriesByPrinterGroup = CartByPrinterGroup(cart, catalogContext.getCatalogSelectors().productEntry);
  // this checks if there's anything left in the queue
  while (Object.values(cartEntriesByPrinterGroup).reduce((acc, x) => acc || x.length > 0, false)) {
    const orderEntries: CoreCartEntry<WProduct>[] = [];
    Object.entries(cartEntriesByPrinterGroup).forEach(([pgId, cartEntryList]) => {
      if (catalogContext.getPrinterGroups()[pgId].singleItemPerTicket) {
        const { product, categoryId, quantity } = cartEntryList[cartEntryList.length - 1];
        if (quantity === 1) {
          orderEntries.push(cartEntryList.pop()!);
        } else {
          // multiple items in the entry
          orderEntries.push({ categoryId, product, quantity: 1 });
          cartEntryList[cartEntryList.length - 1] = {
            product,
            categoryId,
            quantity: cartEntryList[cartEntryList.length - 1].quantity - 1,
          };
        }
      } else {
        orderEntries.push(...cartEntryList.splice(0));
      }
      if (cartEntryList.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete cartEntriesByPrinterGroup[pgId];
      }
    });
    carts.push(orderEntries);
  }
  return carts.map((cart) => {
    return CreateOrderFromCart(
      isProduction,
      locationId,
      referenceId,
      [
        {
          t: DiscountMethod.ManualPercentage,
          createdAt: Date.now(),
          discount: {
            reason: 'PrintOrder',
            amount: {
              currency: CURRENCY.USD,
              amount: cart.reduce((acc, x) => acc + x.product.m.price.amount * x.quantity, 0),
            },
            percentage: 1,
          },
          status: TenderBaseStatus.AUTHORIZED,
        },
      ],
      [{ amount: { currency: CURRENCY.USD, amount: 0 } }],
      cart,
      false,
      ticketName,
      fulfillmentInfo,
      catalogContext,
    );
  });
};

export const CreateOrderForMessages = (
  locationId: string,
  referenceId: string,
  ticketName: string,
  messages: { squareItemVariationId: string; message: string[] }[],
  fulfillmentInfo: SquareOrderFulfillmentInfo,
): Order => {
  const truncatedTicketName = ticketName.slice(0, 29);
  return {
    lineItems: messages.map((x) => ({
      quantity: '1',
      catalogObjectId: x.squareItemVariationId,
      itemType: 'ITEM',
      modifiers: x.message.map((msg) => ({
        basePriceMoney: { currency: 'USD', amount: 0n },
        name: msg,
      })),
    })),
    referenceId,
    pricingOptions: {
      autoApplyDiscounts: true,
      autoApplyTaxes: true,
    },
    taxes: [],
    locationId,
    state: 'OPEN',
    ...(truncatedTicketName.length > 0 ? { ticketName: truncatedTicketName } : {}),
    fulfillments: [CreateFulfillment(fulfillmentInfo)],
  };
};
const WProductModifiersToSquareModifiers = (
  product: WProduct,
  catalogContext: ICatalogContext,
): OrderLineItemModifier[] => {
  const acc: OrderLineItemModifier[] = [];
  // NOTE: only supports whole pizzas, needs work to support split pizzas
  product.p.modifiers.forEach((mod) => {
    const modifierType = catalogContext.getCatalog().modifiers[mod.modifierTypeId];
    const baseProductInstanceSelectedOptionsForModifierType =
      catalogContext
        .getCatalog()
        .productInstances[product.m.pi[0]].modifiers.find((x) => x.modifierTypeId === mod.modifierTypeId)?.options ??
      [];
    mod.options.forEach((option) => {
      const catalogOption = catalogContext.getCatalog().options[option.optionId];
      const squareModifierId = GetSquareIdFromExternalIds(
        catalogOption.externalIDs,
        OptionInstanceToSquareIdSpecifier(option, catalogContext.getLogger()),
      );
      if (
        modifierType.max_selected === 1 ||
        baseProductInstanceSelectedOptionsForModifierType.findIndex(
          (x) => x.optionId === option.optionId && x.placement === option.placement && x.qualifier === option.qualifier,
        ) === -1
      ) {
        acc.push(
          squareModifierId === null
            ? {
                basePriceMoney: IMoneyToBigIntMoney(catalogOption.price),
                name: catalogOption.displayName,
              }
            : {
                catalogObjectId: squareModifierId,
                quantity: '1',
              },
        );
      }
    });
  });
  return acc;
};

export const CreateOrderFromCart = (
  isProduction: boolean,
  locationId: string,
  referenceId: string,
  discounts: OrderLineDiscount[],
  taxes: OrderTax[],
  cart: CoreCartEntry<WProduct>[],
  hasBankersRoundingTaxSkew: boolean,
  ticketName: string,
  fulfillmentInfo: SquareOrderFulfillmentInfo | null,
  catalogContext: ICatalogContext,
): Order => {
  const SQUARE_TAX_RATE_CATALOG_ID = isProduction ? 'TMG7E3E5E45OXHJTBOHG2PMS' : 'LOFKVY5UC3SLKPT2WANSBPZQ';
  const SQUARE_BANKERS_ADJUSTED_TAX_RATE_CATALOG_ID = isProduction
    ? 'R77FWA4SNHB4RWNY4KNNQHJD'
    : 'HIUHEOWWVR6MB3PP7ORCUVZW';
  return {
    referenceId,
    lineItems: Object.values(cart).map((x) => {
      const catalogProductInstance =
        catalogContext.getCatalog().productInstances[x.product.m.pi[PRODUCT_LOCATION.LEFT]];
      const catalogProduct = catalogContext.getCatalogSelectors().productEntry(x.product.p.productId)!;
      const squareItemVariationId = GetSquareIdFromExternalIds(catalogProductInstance.externalIDs, 'ITEM_VARIATION');
      // // left and right catalog product instance are the same,
      // if (x.product.m.pi[PRODUCT_LOCATION.LEFT] === x.product.m.pi[PRODUCT_LOCATION.RIGHT]) {

      //   const wholeModifiers: OrderLineItemModifier[] = x.product.m.exhaustive_modifiers.whole.map(mtid_moid => {
      //     const catalogOption = catalogContext.getCatalog().options[mtid_moid[1]];
      //     return { basePriceMoney: IMoneyToBigIntMoney(catalogOption.price), name: catalogOption.displayName }
      //   })
      // } else {
      //   // left and right catalog product instance aren't the same. this isn't really supported by square, so we'll do our best
      //   // TODO: need to create a split product item that just bypasses square's lack of support here
      //
      // }
      const retVal: OrderLineItem = {
        quantity: x.quantity.toString(10),
        ...(squareItemVariationId === null
          ? {
              name: x.product.m.name,
              variationName: x.product.m.name,
              basePriceMoney: IMoneyToBigIntMoney(catalogProduct.price),
            }
          : {
              catalogObjectId: squareItemVariationId,
            }),
        itemType: 'ITEM',
        modifiers: WProductModifiersToSquareModifiers(x.product, catalogContext),
      };
      return retVal;
    }),
    discounts: [
      ...discounts.map((discount): OrderLineItemDiscount => {
        switch (discount.t) {
          case DiscountMethod.CreditCodeAmount:
            return {
              type: 'VARIABLE_AMOUNT',
              scope: 'ORDER',
              //catalogObjectId: DISCOUNT_CATALOG_ID,
              name: `Discount Code: ${discount.discount.code}`,
              amountMoney: IMoneyToBigIntMoney(discount.discount.balance),
              appliedMoney: IMoneyToBigIntMoney(discount.discount.amount),
              metadata: {
                enc: discount.discount.lock.enc,
                iv: discount.discount.lock.iv,
                auth: discount.discount.lock.auth,
                code: discount.discount.code,
              },
            };
          case DiscountMethod.ManualAmount: {
            return {
              type: 'FIXED_AMOUNT',
              scope: 'ORDER',
              name: discount.discount.reason,
              amountMoney: IMoneyToBigIntMoney(discount.discount.amount),
              appliedMoney: IMoneyToBigIntMoney(discount.discount.amount),
            };
          }
          case DiscountMethod.ManualPercentage: {
            return {
              type: 'FIXED_PERCENTAGE',
              scope: 'ORDER',
              name: discount.discount.reason,
              percentage: (discount.discount.percentage * 100).toFixed(2),
            };
          }
        }
      }),
    ],
    pricingOptions: {
      autoApplyDiscounts: true,
      autoApplyTaxes: false,
    },
    taxes: taxes.map((tax) => ({
      catalogObjectId: hasBankersRoundingTaxSkew
        ? SQUARE_BANKERS_ADJUSTED_TAX_RATE_CATALOG_ID
        : SQUARE_TAX_RATE_CATALOG_ID,
      appliedMoney: IMoneyToBigIntMoney(tax.amount),
      scope: 'ORDER',
    })),
    locationId,
    state: 'OPEN',
    ...(ticketName.length > 0 ? { ticketName: ticketName.slice(0, 29) } : {}),
    fulfillments: fulfillmentInfo ? [CreateFulfillment(fulfillmentInfo)] : [],
  };
};

/**
 * BEGIN CATALOG SECTION
 */

export const PrinterGroupToSquareCatalogObjectPlusDummyProduct = (
  locationIds: string[],
  printerGroup: Omit<PrinterGroup, 'id'>,
  currentObjects: Pick<CatalogObject, 'id' | 'version'>[],
  batch: string,
): CatalogObject[] => {
  const squareCategoryId = GetSquareIdFromExternalIds(printerGroup.externalIDs, 'CATEGORY') ?? `#${batch}_CATEGORY`;
  const versionCategoryId = currentObjects.find((x) => x.id === squareCategoryId)?.version ?? null;
  const squareItemId = GetSquareIdFromExternalIds(printerGroup.externalIDs, 'ITEM') ?? `#${batch}_ITEM`;
  const versionItem = currentObjects.find((x) => x.id === squareItemId)?.version ?? null;
  const squareItemVariationId =
    GetSquareIdFromExternalIds(printerGroup.externalIDs, 'ITEM_VARIATION') ?? `#${batch}_ITEM_VARIATION`;
  const versionItemVariation = currentObjects.find((x) => x.id === squareItemVariationId)?.version ?? null;

  return [
    {
      id: squareCategoryId,
      ...(versionCategoryId !== null ? { version: versionCategoryId } : {}),
      type: 'CATEGORY',
      // categories have to go to all locations
      // presentAtAllLocations: false,
      // presentAtLocationIds: locationIds,
      categoryData: {
        name: printerGroup.name,
      },
    },
    {
      id: squareItemId,
      type: 'ITEM',
      presentAtAllLocations: false,
      presentAtLocationIds: locationIds,
      ...(versionItem !== null ? { version: versionItem } : {}),
      itemData: {
        categories: [{ id: squareCategoryId }],
        reportingCategory: { id: squareCategoryId },
        availableElectronically: true,
        availableForPickup: true,
        availableOnline: true,
        descriptionHtml: 'MESSAGE',
        name: 'MESSAGE',
        productType: 'REGULAR',
        skipModifierScreen: true,
        variations: [
          {
            id: squareItemVariationId,
            type: 'ITEM_VARIATION',
            presentAtAllLocations: false,
            presentAtLocationIds: locationIds,
            ...(versionItemVariation !== null ? { version: versionItemVariation } : {}),
            itemVariationData: {
              itemId: squareItemId,
              //name: "MESSAGE",
              pricingType: 'FIXED_PRICING',
              priceMoney: IMoneyToBigIntMoney({
                currency: CURRENCY.USD,
                amount: 0,
              }),
              sellable: true,
              stockable: true,
              availableForBooking: false,
            },
          },
        ],
      },
    },
  ];
};

export interface ExistingSquareCatalogObjectInfoForProduct {
  squareItemId: string;
  squareItem: Pick<CatalogObject, 'id' | 'version' | 'itemData'> | undefined;
  squareItemVariationId: string;
  squareItemVariation: Pick<CatalogObject, 'id' | 'version' | 'itemData'> | undefined;
}

export const GetExistingSquareCatalogObjectInfoForProduct = (
  productInstance: Omit<IProductInstance, 'id'>,
  currentObjects: Pick<CatalogObject, 'id' | 'version' | 'itemData'>[],
  batch: string,
): ExistingSquareCatalogObjectInfoForProduct => {
  const squareItemId = GetSquareIdFromExternalIds(productInstance.externalIDs, 'ITEM');
  const foundSquareItem = squareItemId ? currentObjects.find((x) => x.id === squareItemId) : undefined;
  const squareItemVariationId =
    GetSquareIdFromExternalIds(productInstance.externalIDs, 'ITEM_VARIATION') ?? `#${batch}_ITEM_VARIATION`;
  const foundSquareItemVariation = squareItemVariationId
    ? currentObjects.find((x) => x.id === squareItemVariationId)
    : undefined;
  const hasSquareCatalogData = foundSquareItem !== undefined && foundSquareItemVariation !== undefined;

  return {
    squareItemId: hasSquareCatalogData ? (squareItemId as string) : `#${batch}_ITEM`,
    squareItem: foundSquareItem,
    squareItemVariationId: hasSquareCatalogData ? squareItemVariationId : `#${batch}_ITEM_VARIATION`,
    squareItemVariation: foundSquareItemVariation,
  };
};

export const ProductInstanceToSquareCatalogHelper = (
  isProduction: boolean,
  locationIds: string[],
  product: Pick<IProduct, 'modifiers' | 'price' | 'disabled'>,
  productInstance: Omit<IProductInstance, 'id'>,
  printerGroup: PrinterGroup | null,
  catalogSelectors: ICatalogSelectors,
  currentObjects: Pick<CatalogObject, 'id' | 'version' | 'itemData'>[],
  batch: string,
  logger: PinoLogger,
): {
  catalogObject: CatalogObject;
  squareItemsToDelete: string[];
} => {
  const existingSquareCatalogObjectInfo = GetExistingSquareCatalogObjectInfoForProduct(
    productInstance,
    currentObjects,
    batch,
  );
  const existingSquareIDs = GetSquareExternalIds(productInstance.externalIDs).map((x) => x.value);
  const catalogObject = ProductInstanceToSquareCatalogObject(
    isProduction,
    locationIds,
    product,
    productInstance,
    printerGroup,
    catalogSelectors,
    existingSquareCatalogObjectInfo,
    logger,
  );
  if (
    existingSquareIDs.length > 0 &&
    (!existingSquareCatalogObjectInfo.squareItem || !existingSquareCatalogObjectInfo.squareItemVariation)
  ) {
    logger.warn(
      {
        existingSquareIDs,
        squareItem: existingSquareCatalogObjectInfo.squareItem,
        squareItemVariation: existingSquareCatalogObjectInfo.squareItemVariation,
      },
      'Square item or item variation for product instance not found. Deleting the old IDs (for insurance) and creating new square item and item variation',
    );
    const squareItemsToDelete = [...existingSquareIDs];
    return { catalogObject, squareItemsToDelete };
  }
  return { catalogObject, squareItemsToDelete: [] };
};
// todo: we need a way to handle naming of split/super custom product instances

export const ProductInstanceToSquareCatalogObject = (
  isProduction: boolean,
  locationIds: string[],
  product: Pick<IProduct, 'modifiers' | 'price' | 'disabled'>,
  productInstance: Omit<IProductInstance, 'id'>,
  printerGroup: PrinterGroup | null,
  catalogSelectors: ICatalogSelectors,
  existingSquareCatalogObjectInfo: ExistingSquareCatalogObjectInfoForProduct,
  logger: PinoLogger,
): CatalogObject => {
  // todo: we need a way to handle naming of split/super custom product instances
  // do we need to add an additional variation on the square item corresponding to the base product instance for split and otherwise unruly product instances likely with pricingType: VARIABLE?
  // maybe we add variations for each half and half combo?
  // maybe we can just set variationName on the line item and call it good?
  // TODO: when we transition off the square POS, if we're still using the finance or employee management or whatever, we'll need to pull pre-selected modifiers off of the ITEM_VARIATIONs for a product instance
  //
  const SQUARE_TAX_RATE_CATALOG_ID = isProduction ? 'TMG7E3E5E45OXHJTBOHG2PMS' : 'LOFKVY5UC3SLKPT2WANSBPZQ';

  const { squareItem, squareItemId, squareItemVariationId, squareItemVariation } = existingSquareCatalogObjectInfo;
  const versionItem = squareItem?.version ?? null;
  const productTypeItem = squareItem?.itemData?.productType ?? 'REGULAR';
  const versionItemVariation = squareItemVariation?.version ?? null;
  const isBlanketDisabled = product.disabled && product.disabled.start > product.disabled.end;
  let instancePriceWithoutSingleSelectModifiers = product.price.amount;
  const modifierListInfo: CatalogItemModifierListInfo[] = [];
  product.modifiers.forEach((mtspec) => {
    const modifierEntry = catalogSelectors.modifierEntry(mtspec.mtid)!;
    const selectedOptionsForModifierType =
      productInstance.modifiers.find((x) => x.modifierTypeId === mtspec.mtid)?.options ?? [];
    if (modifierEntry.max_selected === 1) {
      // single select modifiers get added to the square product
      const squareModifierListId = GetSquareIdFromExternalIds(modifierEntry.externalIDs, 'MODIFIER_LIST');
      if (squareModifierListId === null) {
        logger.error({ externalIDs: modifierEntry.externalIDs }, 'Missing MODIFIER_LIST');
        return;
      }
      if (selectedOptionsForModifierType.length > 1) {
        logger.error(
          {
            selectedOptions: selectedOptionsForModifierType,
            modifierType: mtspec,
          },
          'Multiple selected modifier options found for single select modifier',
        );
        return;
      }
      modifierListInfo.push({
        modifierListId: squareModifierListId,
        minSelectedModifiers: modifierEntry.min_selected,
        maxSelectedModifiers: 1,
        ...(selectedOptionsForModifierType.length > 0
          ? {
              modifierOverrides: selectedOptionsForModifierType.map((optionInstance) => ({
                modifierId: GetSquareIdFromExternalIds(
                  catalogSelectors.option(optionInstance.optionId)!.externalIDs,
                  OptionInstanceToSquareIdSpecifier(optionInstance, logger),
                )!,
                onByDefault: true,
              })),
            }
          : {}),
      });
    } else {
      // add the modifier to the list
      const squareModifierListId = GetSquareIdFromExternalIds(modifierEntry.externalIDs, 'MODIFIER_LIST');
      if (squareModifierListId === null) {
        logger.error({ externalIDs: modifierEntry.externalIDs }, 'Missing MODIFIER_LIST');
        return;
      }
      modifierListInfo.push({
        modifierListId: squareModifierListId,
        minSelectedModifiers: modifierEntry.min_selected,
        maxSelectedModifiers: modifierEntry.max_selected ?? -1,
      });
      // multi select modifiers, if pre-selected get added to the built in price
      modifierEntry.options.forEach((oId) => {
        const option = catalogSelectors.option(oId)!;
        const optionInstance = selectedOptionsForModifierType.find((x) => x.optionId === option.id) ?? null;
        if (optionInstance && optionInstance.placement !== OptionPlacement.NONE) {
          instancePriceWithoutSingleSelectModifiers +=
            optionInstance.qualifier === OptionQualifier.HEAVY ? option.price.amount * 2 : option.price.amount;
        }
      });
    }
  });

  // we need to pass the categories otherwise square will overwrite them with empty categories, so we need to pull out non-reporting categories
  // won't be needed once we address https://app.asana.com/1/961497487611345/project/1189134071799993/task/1210817402795310?focus=true
  const currentItemCategories = squareItem?.itemData?.categories ?? [];
  const newPrinterGroupCategory = printerGroup
    ? GetSquareIdFromExternalIds(printerGroup.externalIDs, 'CATEGORY')!
    : null;
  const oldPrinterGroupCategory = squareItem?.itemData?.reportingCategory?.id ?? null;
  const otherCategories = currentItemCategories.filter((x) => x.id !== oldPrinterGroupCategory);

  return {
    id: squareItemId,
    type: 'ITEM',
    presentAtAllLocations: false,
    presentAtLocationIds: locationIds,
    ...(versionItem !== null ? { version: versionItem } : {}),
    itemData: {
      ...(printerGroup
        ? {
            categories: [...otherCategories, { id: newPrinterGroupCategory! }],
            reportingCategory: { id: newPrinterGroupCategory! },
          }
        : { categories: otherCategories }),
      abbreviation: productInstance.shortcode.slice(0, 24),
      availableElectronically: true,
      availableForPickup: true,
      availableOnline: true,
      isArchived: isBlanketDisabled,
      descriptionHtml: productInstance.description,
      name: productInstance.displayFlags.pos.name ? productInstance.displayFlags.pos.name : productInstance.displayName,
      productType: productTypeItem,
      taxIds: [SQUARE_TAX_RATE_CATALOG_ID],
      skipModifierScreen: product.modifiers.length === 0 || productInstance.displayFlags.pos.skip_customization,
      modifierListInfo,
      variations: [
        {
          id: squareItemVariationId,
          type: 'ITEM_VARIATION',
          presentAtAllLocations: false,
          presentAtLocationIds: locationIds,
          ...(versionItemVariation !== null ? { version: versionItemVariation } : {}),
          itemVariationData: {
            itemId: squareItemId,
            // name: productInstance.displayName, We omit this variation name so the tickets and receipts are shorter
            pricingType: 'FIXED_PRICING',
            priceMoney: IMoneyToBigIntMoney({
              currency: product.price.currency,
              amount: instancePriceWithoutSingleSelectModifiers,
            }),
            sellable: true,
            stockable: true,
            availableForBooking: false,
          },
        },
      ],
    },
  };
};

export const ModifierOptionPlacementsAndQualifiersToSquareCatalogObjects = (
  locationIds: string[],
  modifierListId: string,
  option: Omit<IOption, 'id'>,
  optionOrdinal: number,
  currentObjects: Pick<CatalogObject, 'id' | 'version'>[],
  batch: string,
): CatalogObject[] => {
  const squareIdLeft = GetSquareIdFromExternalIds(option.externalIDs, 'MODIFIER_LEFT') ?? `#${batch}_MODIFIER_LEFT`;
  const versionLeft = currentObjects.find((x) => x.id === squareIdLeft)?.version ?? null;
  const squareIdWhole = GetSquareIdFromExternalIds(option.externalIDs, 'MODIFIER_WHOLE') ?? `#${batch}_MODIFIER_WHOLE`;
  const versionWhole = currentObjects.find((x) => x.id === squareIdWhole)?.version ?? null;
  const squareIdRight = GetSquareIdFromExternalIds(option.externalIDs, 'MODIFIER_RIGHT') ?? `#${batch}_MODIFIER_RIGHT`;
  const versionRight = currentObjects.find((x) => x.id === squareIdRight)?.version ?? null;
  const squareIdHeavy = GetSquareIdFromExternalIds(option.externalIDs, 'MODIFIER_HEAVY') ?? `#${batch}_MODIFIER_HEAVY`;
  const versionHeavy = currentObjects.find((x) => x.id === squareIdHeavy)?.version ?? null;
  const squareIdLite = GetSquareIdFromExternalIds(option.externalIDs, 'MODIFIER_LITE') ?? `#${batch}_MODIFIER_LITE`;
  const versionLite = currentObjects.find((x) => x.id === squareIdLite)?.version ?? null;
  const squareIdOts = GetSquareIdFromExternalIds(option.externalIDs, 'MODIFIER_OTS') ?? `#${batch}_MODIFIER_OTS`;
  const versionOts = currentObjects.find((x) => x.id === squareIdOts)?.version ?? null;
  const baseOrdinal = optionOrdinal * 6;
  const modifierLite: CatalogObject[] = option.metadata.allowLite
    ? [
        {
          id: squareIdLite,
          type: 'MODIFIER',
          presentAtAllLocations: false,
          presentAtLocationIds: locationIds,
          ...(versionLite !== null ? { version: versionLite } : {}),
          modifierData: {
            name: `LITE ${option.displayName}`,
            // todo kitchenName: `LITE ${option.shortcode}`,
            ordinal: baseOrdinal + 4,
            modifierListId: modifierListId,
            priceMoney: IMoneyToBigIntMoney(option.price),
          },
        },
      ]
    : [];
  const modifierHeavy: CatalogObject[] = option.metadata.allowHeavy
    ? [
        {
          id: squareIdHeavy,
          type: 'MODIFIER',
          presentAtAllLocations: false,
          presentAtLocationIds: locationIds,
          ...(versionHeavy !== null ? { version: versionHeavy } : {}),
          modifierData: {
            name: `HEAVY ${option.displayName}`,
            // todo kitchenName: `HEAVY ${option.shortcode}`,
            ordinal: baseOrdinal + 5,
            modifierListId: modifierListId,
            priceMoney: IMoneyToBigIntMoney({
              currency: option.price.currency,
              amount: option.price.amount * 2,
            }),
          },
        },
      ]
    : [];
  const modifierOts: CatalogObject[] = option.metadata.allowOTS
    ? [
        {
          id: squareIdOts,
          type: 'MODIFIER',
          presentAtAllLocations: false,
          presentAtLocationIds: locationIds,
          ...(versionOts !== null ? { version: versionOts } : {}),
          modifierData: {
            name: `OTS ${option.displayName}`,
            // todo kitchenName: `OTS ${option.shortcode}`,
            ordinal: baseOrdinal + 6,
            modifierListId: modifierListId,
            priceMoney: IMoneyToBigIntMoney(option.price),
          },
        },
      ]
    : [];
  const modifiersSplit: CatalogObject[] = option.metadata.can_split
    ? [
        {
          id: squareIdLeft,
          type: 'MODIFIER',

          presentAtAllLocations: false,
          presentAtLocationIds: locationIds,
          ...(versionLeft !== null ? { version: versionLeft } : {}),
          modifierData: {
            name: `L) ${option.displayName}`,
            // todo kitchenName: `L) ${option.shortcode}`,
            ordinal: baseOrdinal + 1,
            modifierListId: modifierListId,
            priceMoney: IMoneyToBigIntMoney(option.price),
          },
        },
        {
          id: squareIdRight,
          type: 'MODIFIER',
          presentAtAllLocations: false,
          presentAtLocationIds: locationIds,
          ...(versionRight !== null ? { version: versionRight } : {}),
          modifierData: {
            name: `R) ${option.displayName}`,
            // todo kitchenName: `R) ${option.shortcode}`,
            ordinal: baseOrdinal + 3,
            modifierListId: modifierListId,
            priceMoney: IMoneyToBigIntMoney(option.price),
          },
        },
      ]
    : [];
  const modifierWhole: CatalogObject = {
    id: squareIdWhole,
    type: 'MODIFIER',

    presentAtAllLocations: false,
    presentAtLocationIds: locationIds,
    ...(versionWhole !== null ? { version: versionWhole } : {}),
    modifierData: {
      name: option.displayName,
      // todo kitchenName: `${option.shortcode}`,
      ordinal: baseOrdinal + 2,
      modifierListId: modifierListId,
      priceMoney: IMoneyToBigIntMoney(option.price),
    },
  };
  return [...modifiersSplit, modifierWhole, ...modifierHeavy, ...modifierLite, ...modifierOts].sort(
    (a, b) => a.modifierData!.ordinal! - b.modifierData!.ordinal!,
  );
};

export const ModifierTypeToSquareCatalogObject = (
  locationIds: string[],
  modifierType: Pick<
    IOptionType,
    'name' | 'displayName' | 'externalIDs' | 'max_selected' | 'min_selected' | 'displayFlags'
  >,
  modifierTypeOrdinal: number,
  options: Omit<IOption, 'id'>[],
  currentObjects: Pick<CatalogObject, 'id' | 'version'>[],
  batch: string,
): CatalogObject => {
  const modifierListId =
    GetSquareIdFromExternalIds(modifierType.externalIDs, 'MODIFIER_LIST') ?? `#${batch}_MODIFIER_LIST`;
  const version = currentObjects.find((x) => x.id === modifierListId)?.version ?? null;
  const displayName = modifierType.displayName.length > 0 ? modifierType.displayName : modifierType.name;
  const squareName = modifierType.displayFlags.is3p
    ? displayName
    : `${(modifierTypeOrdinal * 100).toString().padStart(4, '0')}| ${displayName}`;
  return {
    id: modifierListId,
    ...(version !== null ? { version } : {}),
    type: 'MODIFIER_LIST',
    presentAtAllLocations: false,
    presentAtLocationIds: locationIds,
    modifierListData: {
      name: squareName,
      ordinal: modifierTypeOrdinal * 1024,
      selectionType: 'MULTIPLE', // this should always be MULTIPLE otherwise square autoselects a modifier
      // Options are already in order from the parent entity's options array
      modifiers: options
        .map((o, i) =>
          ModifierOptionPlacementsAndQualifiersToSquareCatalogObjects(
            locationIds,
            modifierListId,
            o,
            i, // pass index as ordinal
            currentObjects,
            `${batch}S${i.toString().padStart(3, '0')}S`,
          ),
        )
        .flat(),
    },
  };
};

/**
 * checks that a passed instance doesn't explicitly declare a modifier that isn't allowed
 * TODO: move this to wario-shared
 */
export const ValidateModifiersForInstance = function (
  productModifierSpecification: IProductModifier[],
  instanceModifierSpecification: ProductInstanceModifierEntry[],
) {
  const mtidsInInstanceSpec = new Set(...instanceModifierSpecification.map((x) => x.modifierTypeId));
  const mtidsInProductSpec = new Set(...productModifierSpecification.map((x) => x.mtid));
  return new Array(...mtidsInInstanceSpec).filter((x) => !mtidsInProductSpec.has(x)).length === 0;
};
