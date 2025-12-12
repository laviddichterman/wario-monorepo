import { ReduceArrayToMapByKey } from '../common';
import type {
  ICatalog,
  ICategory,
  IOption,
  IOptionType,
  IProduct,
  IProductInstance,
  RecordOrderInstanceFunctions,
  RecordProductInstanceFunctions,
  SEMVER,
} from '../derived-types';
import type { ICatalogSelectors, IdOrdinalMap } from '../types';
import type { Selector } from '../utility-types';


/** 
 * GenerateCategoryOrderList
 *
 * Generate a list of a category id to its overall ordinal position in the catalog hierarchy.
 *
 * @param id - id of the category to generate the order list for
 * @param selector - selector function to fetch the catalog object by id
 * @param filter - optional filter function to filter out objects, if not provided, no filtering is done (usefull to pass a function that checks for a pre-set fulfillment ID in a category service disable array)
 * @returns string[] - list of catalog object ids in order
 */
export const GenerateCategoryOrderList = (id: string, selector: Selector<ICategory>, filter?: (obj: ICategory) => boolean) => {
  const GenerateOrderedArray = (inner_id: string): string[] => {
    const cat = selector(inner_id);
    if (!cat || (filter && !filter(cat))) {
      console.error(`ID ${inner_id} not found!`);
      return [];
    }
    return [...cat.children.flatMap((childId: string) => GenerateOrderedArray(childId)), inner_id];
  }
  return GenerateOrderedArray(id);
}

/**
 * GenerateCategoryOrderMap
 *
 * Generate a map of a category id to its overall ordinal position in the category hierarchy.
 *
 * @param id - id of the category to generate the order map for
 * @param selector - selector function to fetch the catalog object by id
 * @returns Record<string, number> - object mapping catalog object id to its overall ordinal position
 */
export const GenerateCategoryOrderMap = (id: string, selector: Selector<ICategory>) => {
  return Object.fromEntries(GenerateCategoryOrderList(id, selector).map((x, i) => ([x, i] as [string, number])));
}

export const SortByOrdinalMap = <T extends { id: string }>(xs: T[], idOrdinalMap: IdOrdinalMap) => xs.sort((a, b) => idOrdinalMap[a.id] - idOrdinalMap[b.id]);

export const CatalogGenerator = (
  categories: ICategory[],
  modifier_types: IOptionType[],
  options: IOption[],
  products: IProduct[],
  product_instances: IProductInstance[],
  productInstanceFunctions: RecordProductInstanceFunctions,
  orderInstanceFunctions: RecordOrderInstanceFunctions,
  api: SEMVER,
): ICatalog => {
  return {
    options: ReduceArrayToMapByKey(options, 'id'),
    productInstances: ReduceArrayToMapByKey(product_instances, 'id'),
    modifiers: ReduceArrayToMapByKey(modifier_types, 'id'),
    categories: ReduceArrayToMapByKey(categories, 'id'),
    products: ReduceArrayToMapByKey(products, 'id'),
    productInstanceFunctions: { ...productInstanceFunctions },
    orderInstanceFunctions: { ...orderInstanceFunctions },
    api,
    version: Date.now().toString(36).toUpperCase(),
  };
};

export const ICatalogSelectorWrapper = (catalog: ICatalog): ICatalogSelectors => ({
  categories: () => Object.keys(catalog.categories),
  category: (id) => catalog.categories[id],
  modifierEntries: () => Object.keys(catalog.modifiers),
  modifierEntry: (id) => catalog.modifiers[id],
  option: (id) => catalog.options[id],
  options: () => Object.keys(catalog.options),
  productEntry: (id) => catalog.products[id],
  productEntries: () => Object.keys(catalog.products),
  productInstance: (id) => catalog.productInstances[id],
  productInstances: () => Object.keys(catalog.productInstances),
  productInstanceFunction: (id) => catalog.productInstanceFunctions[id],
  productInstanceFunctions: () => Object.keys(catalog.productInstanceFunctions),
  orderInstanceFunction: (id) => catalog.orderInstanceFunctions[id],
  orderInstanceFunctions: () => Object.keys(catalog.orderInstanceFunctions),
});
