import { useSnackbar } from 'notistack';
import type { ParseResult } from 'papaparse';
import { unparse } from 'papaparse';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import { Autocomplete, Grid, TextField } from '@mui/material';

import type {
  IProductModifier,
  KeyValue,
  UncommittedIProduct,
  UncommittedIProductInstance,
  UpdateIProductRequest,
  UpdateIProductUpdateIProductInstance,
  UpsertProductBatchRequest,
} from '@wcp/wario-shared';
import { PriceDisplay } from '@wcp/wario-shared';
import type { ValSetValNamed } from '@wcp/wario-ux-shared/common';
import { useCatalogSelectors, useCategoryIds } from '@wcp/wario-ux-shared/query';

import { usePrinterGroupsMap } from '@/hooks/usePrinterGroupsQuery';
import { type BatchUpsertProductResponse, useBatchUpsertProductMutation } from '@/hooks/useProductMutations';

import GenericCsvImportComponent from '../../generic_csv_import.component';
import { ToggleBooleanPropertyComponent } from '../../property-components/ToggleBooleanPropertyComponent';
import { ElementActionComponent } from '../element.action.component';

import ProductModifierComponent from './ProductModifierComponent';

interface CSVProduct {
  ID: string;
  Categories: string;
  DisplayName: string;
  Description: string;
  PosName: string;
  Shortname: string;
  Price: string;
  Disabled: string;
  [index: string]: string;
}

interface HierarchicalProductStructure {
  category: string;
  subcategories: { [index: string]: HierarchicalProductStructure };
  products: CSVProduct[];
}

type HierarchicalProductImportComponentProps = {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  isProcessing: boolean;
  disableConfirmOn: boolean;
  setFileData: Dispatch<SetStateAction<CSVProduct[]>>;
} & ValSetValNamed<string[], 'parentCategories'> &
  ValSetValNamed<boolean, 'createCategories'> &
  ValSetValNamed<boolean, 'downloadCsv'> &
  ValSetValNamed<string | null, 'printerGroup'> &
  ValSetValNamed<IProductModifier[], 'modifiers'>;

const HierarchicalProductImportComponent = (props: HierarchicalProductImportComponentProps) => {
  const catalogSelectors = useCatalogSelectors();
  const categories = useCategoryIds();
  const printerGroups = usePrinterGroupsMap();
  return (
    <ElementActionComponent
      {...props}
      body={
        <>
          <Grid size={6}>
            <Autocomplete
              multiple
              filterSelectedOptions
              options={categories}
              value={props.parentCategories.filter((x) => x)}
              onChange={(_e, v) => {
                props.setParentCategories(v);
              }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(option) => catalogSelectors?.category(option)?.category.name ?? option}
              isOptionEqualToValue={(o, v) => o === v}
              renderInput={(params) => <TextField {...params} label="Categories" />}
            />
          </Grid>
          <Grid size={6}>
            <Autocomplete
              filterSelectedOptions
              options={Object.keys(printerGroups)}
              value={props.printerGroup}
              onChange={(_e, v) => {
                props.setPrinterGroup(v);
              }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(pgId) => printerGroups[pgId].name ?? 'Undefined'}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Printer Group" />}
            />
          </Grid>
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing}
              label="Create Missing Categories"
              setValue={props.setCreateCategories}
              value={props.createCategories}
              labelPlacement="end"
            />
          </Grid>
          <Grid size={6}>
            <ToggleBooleanPropertyComponent
              disabled={props.isProcessing}
              label="Download CSV"
              setValue={props.setDownloadCsv}
              value={props.downloadCsv}
              labelPlacement="end"
            />
          </Grid>
          <Grid size={12}>
            <ProductModifierComponent
              isProcessing={props.isProcessing}
              modifiers={props.modifiers}
              setModifiers={props.setModifiers}
            />
          </Grid>
          <Grid size={12}>
            <GenericCsvImportComponent
              onAccepted={(data: ParseResult<CSVProduct>) => {
                props.setFileData(data.data);
              }}
            />
          </Grid>
        </>
      }
    />
  );
};

/**
 *  TODO: add modifier import container
 *  this allows selection of gin then picking the type of gin which would go in the same way a conversation would progress
 *  we could have product instances of Gin with As martini to start someone off in the gin martini mode for conversational ordering
 * 
Category	Subcategory I	DG_Distillery	DisplayName
Agave	Tequlia	Pueblo Viejo	Pueblo Viejo - Tequila
Agave	Tequila	Pasote	Pasote - Reposado
Agave	Tequila	Pasote	Pasote - Blanco
Agave	Tequila	Herradura	Herradura - Reposado
Agave	Tequila	Casamigos	Casamigos - Tequila Añejo
Agave	Tequila	Don Julio	Don Julio - Tequila Blanco
Agave	Tequila	Espolón	Espolón - Tequila Blanco
Agave	Tequila	Tequila Ocho	Tequila Ocho - Tequila Añejo
Agave	Tequila	Tequila Ocho	Tequila Ocho - Tequila Plata
Agave	Raicilla	Puntagave	Puntagave - Raicilla Rhodacantha
Agave	Miske	Chawar	Chawar - Blanco
Agave	Miske	Chawar	Chawar - Reposado
Agave	Mezcal	Alipus	Alipus - Santa Ana Del Rio Mezcal
Agave	Mezcal	Los Vecinos Del Campo	Los Vecinos Del Campo - Mezcal Espadin
Agave	Mezcal	Banhez	Banhez - Destilado Con Pechuga De Pavo Mezcal
Agave	Mezcal	Banhez	Banhez - Tepeztate
Agave	Mezcal	Banhez	Banhez - Ensamble
Agave	Mezcal	Bozal	Bozal - Mezcal Borrego
Agave	Mezcal	Fidencio	Fidencio - Tobalá
Agave	Bacanora	Puntagave	Puntagave - Bacanora

for each spirit TYPE, we have a category and subcategory tree with unknown depth
Categories made with products in parens: 
Agave 
  (Agave)
      -> Mezcal
      
      -> Tequila
          (Tequila) <- product class
            - (Tequila) <- base instance
            - (Don Julio Tequila Blanco) 
            - (Pasote	Reposado)
            - (Pasote	Blanco)
            - (Espolòn Tequila Blanco)
            - (Casamigos Tequila Añejo)
            - (Tequila Ocho Tequila Añejo)
            - (Tequila Ocho Tequila Plata)
      -> Bacanora
          (Puntagave Bacanora) base instance
      -> Raicilla
          (Puntagave Raicilla) base instance
      -> Miske
          (Miske)
            - (Miske) base instance
            - (Miske Blanco Chawar)
            - (Miske Reposado Chawar)

Modifiers created (min = 1, max = 1)
Agave Preference
  - Tequila
  - (Puntagave Bacanora)
  - (Puntagave Raicilla)
  - Miske
  - Mezcal
Tequila Preference
  - (Don Julio Tequila Blanco) 
  - (Pasote	Pasote Reposado)
  - (Pasote	Pasote Blanco)
  - (Espolòn Tequila Blanco)
  - (Casamigos Tequila Añejo)
  - (Tequila Ocho	Tequila Añejo)
  - (Tequila Ocho	Tequila Plata)
Miske Preference
  - (Miske Blanco Chawar)
  - (Miske Reposado Chawar)

Products Made in square:
TO TRY: see how options manifest in the Square POS, see how product variations work in Square POS
  from the most specific category, if there's multiple items in that category, make a product for the most specific category and for each of the items in the category
  if there's only one item, make a product for just the product
  Tequila
  Mezcal
  Bacanora
  Miske
  Raicilla

  Agave is NOT made in square as it doesn't support dependent modifiers

  we need to be able to keep hierarchial products up to date when we have a new product 
  and that should be done without obliterating the existing items or needing to do mass overwrites
  so this import is actually a batch upsert


  brainstorm: it could be that in wario we have a recursive idea of products instead of product class and instance
  each product could have child products that appear when a certain set of modifiers are checked.
  The set of modifiers on the child products would need to be a superset of the ones on the parent
input needed:
  DG_ attributes: CSV metadata
  Category: string;
  Category1: string;
  Category2: string
  DisplayName: string;
  Description: string;
  PosName: string;
  Shortname: string;
  Price: string;
  

  export interface IProductInstance {
  id: string;
  // reference to the WProductSchema ID for this class of item
  productId: string; //{ type: Schema.Types.ObjectId, ref: 'WProductSchema'},

  // ordinal for product matching
  ordinal: number;

  // applied modifiers for this instance of the product
  modifiers: ProductModifierEntry[];

  displayFlags: IProductDisplayFlags,

  externalIDs: KeyValue[];

  description: string;

  displayName: string;

  shortcode: string;
};
export interface IProductDisplayFlags {
  hideFromPos: boolean;
  // name override for the point of sale integration (helps avoid selling a growler to a customer since every growler fill shouldn't have the words "growler fill" in the name)
  posName: string;

  menu: {
    // ordering within this product instance's category in menu page
    ordinal: number;
    // flag to hide this from the menu
    hide: boolean;
    // governs how prices get displayed in the menu page according to the enum      
    price_display: keyof typeof PriceDisplay;
    // HTML-friendly message wrapping the display of this PI in the menu page
    adornment: string;
    // suppress the default pizza functionality where the full modifier list is surfaced on the product display
    // and instead use the templating strings to determine what is/isn't displayed
    suppress_exhaustive_modifier_list: boolean;
    // show the modifier option list as part of the menu display for this product instance
    show_modifier_options: boolean;
  };
  order: {
    // ordering within this product instance's category in order page
    ordinal: number;
    // flag to hide this from the ordering page
    hide: boolean;
    // flag to skip going right to customization when the user adds this to their order
    skip_customization: boolean;
    // governs how prices get displayed in the order page according to the enum
    price_display: keyof typeof PriceDisplay;
    // HTML-friendly message wrapping the display of this PI in the order page
    adornment: string;
    // suppress the default pizza functionality where the full modifier list is surfaced on the product display
    // and instead use the templating strings to determine what is/isn't displayed
    suppress_exhaustive_modifier_list: boolean;
  };
};

  export interface IProduct {
  id: string;
  price: IMoney;
  disabled: IWInterval | null;
  availability: IRecurringInterval | null;
  serviceDisable: string[];
  externalIDs: KeyValue[];
  displayFlags: {
    is3p: boolean;
    flavor_max: number;
    bake_max: number;
    bake_differential: number;
    show_name_of_base_product: boolean;
    singular_noun: string;
    // order guide is product instance functions that return a string if they should surface a warning or suggestion to the end user
    order_guide: {
      warnings: string[];
      suggestions: string[];
    }
  };
  timing: PrepTiming | null;
  modifiers: IProductModifier[];
  category_ids: string[];
  baseProductId: string;
  printerGroup: string | null;
};
    

 */

function GenerateHierarchicalProductStructure(
  acc: HierarchicalProductStructure,
  curr: CSVProduct,
  depth: number,
): HierarchicalProductStructure {
  const splitCats = curr.Categories.split(',');
  if (depth < splitCats.length) {
    acc.subcategories[splitCats[depth]] = GenerateHierarchicalProductStructure(
      Object.hasOwn(acc.subcategories, splitCats[depth])
        ? acc.subcategories[splitCats[depth]]
        : {
            category: splitCats[depth],
            products: [],
            subcategories: {},
          },
      curr,
      depth + 1,
    );
    return acc;
  }
  return { ...acc, products: [...acc.products, curr] } as HierarchicalProductStructure;
}

function CSVProductToProduct(
  prod: CSVProduct,
  ordinal: number,
  singularNoun: string,
  modifiers: IProductModifier[],
  parentCategories: string[],
  printerGroup: string | null,
): UpsertProductBatchRequest {
  // omit Categories to get it inside the externalIds
  const { ID, Description, DisplayName, PosName, Price, Shortname, Disabled, ...others } = prod;
  const externalIds: KeyValue[] = Object.entries(others)
    .filter(([_, value]) => value)
    .map(([key, value]) => ({ key, value }));
  const disabledValue = /true/i.test(Disabled) ? { start: 1, end: 0 } : null;
  console.log({ disabledValue, Disabled });
  if (ID) {
    const [productId, productInstanceId] = ID.split('/');
    return {
      product: {
        id: productId,
        baseProductId: productInstanceId,
        externalIDs: [],
        price: { amount: Number.parseFloat(Price) * 100, currency: 'USD' },
        category_ids: parentCategories,
        printerGroup,
        modifiers,

        // stuff below is not needed, but the current API requires it
        disabled: disabledValue,
        availability: [],
        timing: null,
        serviceDisable: [],
        displayFlags: {
          is3p: false,
          bake_differential: 100,
          show_name_of_base_product: true,
          flavor_max: 10,
          bake_max: 10,
          singular_noun: singularNoun,
          order_guide: {
            suggestions: [],
            warnings: [],
          },
        },
      } as UpdateIProductRequest,
      instances: [
        {
          id: productInstanceId,
          displayName: DisplayName,
          description: Description || '',
          externalIDs: externalIds,
          ordinal,
          shortcode: Shortname,
          modifiers: [],
          displayFlags: {
            pos: {
              hide: false,
              name: PosName,
              skip_customization: true,
            },
            menu: {
              adornment: '',
              hide: false,
              ordinal,
              show_modifier_options: false,
              price_display: PriceDisplay.ALWAYS,
              suppress_exhaustive_modifier_list: false,
            },
            order: {
              ordinal,
              adornment: '',
              hide: false,
              price_display: PriceDisplay.ALWAYS,
              skip_customization: true,
              suppress_exhaustive_modifier_list: false,
            },
          },
        } as UpdateIProductUpdateIProductInstance,
      ],
    };
  }
  return {
    product: {
      disabled: disabledValue,
      availability: [],
      timing: null,
      externalIDs: [],
      serviceDisable: [],
      price: { amount: Number.parseFloat(Price) * 100, currency: 'USD' },
      displayFlags: {
        is3p: false,
        bake_differential: 100,
        show_name_of_base_product: true,
        flavor_max: 10,
        bake_max: 10,
        singular_noun: singularNoun,
        order_guide: {
          suggestions: [],
          warnings: [],
        },
      },
      category_ids: parentCategories,
      printerGroup,
      modifiers,
    } as UncommittedIProduct,
    instances: [
      {
        displayName: DisplayName,
        modifiers: [],
        description: Description || '',
        externalIDs: externalIds,
        displayFlags: {
          pos: {
            hide: false,
            name: PosName,
            skip_customization: true,
          },
          menu: {
            adornment: '',
            hide: false,
            ordinal,
            show_modifier_options: false,
            price_display: PriceDisplay.ALWAYS,
            suppress_exhaustive_modifier_list: false,
          },
          order: {
            ordinal,
            adornment: '',
            hide: false,
            price_display: PriceDisplay.ALWAYS,
            skip_customization: true,
            suppress_exhaustive_modifier_list: false,
          },
        },
        ordinal,
        shortcode: Shortname,
      } as UncommittedIProductInstance,
    ],
  } as UpsertProductBatchRequest;
}

function GenerateProducts(
  catalog: HierarchicalProductStructure,
  modifiers: IProductModifier[],
  parentCategories: string[],
  printerGroup: string | null,
): UpsertProductBatchRequest[] {
  let ordinal = 0;
  const ProcessCat = (cat: HierarchicalProductStructure): UpsertProductBatchRequest[] => {
    // const categoryPreferenceModifierTypeRequest: Omit<IOptionType, "id"> & { options: Omit<IOption, 'modifierTypeId' | 'id'>[]; } = {
    //   name: `${cat.category} preference`,
    //   displayName: cat.category,
    //   ordinal,
    //   min_selected: 1,
    //   max_selected: 1,
    //   externalIDs: [],
    //   displayFlags: {
    //     omit_options_if_not_available: true,
    //     omit_section_if_no_available_options: true,
    //     use_toggle_if_only_two_options: false,
    //     hidden: false,
    //     empty_display_as: DISPLAY_AS.YOUR_CHOICE_OF,
    //     modifier_class: MODIFIER_CLASS.ADD,
    //     template_string: "",
    //     multiple_item_separator: "+",
    //     non_empty_group_prefix: "",
    //     non_empty_group_suffix: "",
    //     is3p: false
    //   },
    //   options: []
    // };
    const sp = Object.values(cat.subcategories).flatMap((x) => ProcessCat(x));
    return [
      ...sp,
      ...cat.products.map((prod) =>
        CSVProductToProduct(prod, ++ordinal, catalog.category, modifiers, parentCategories, printerGroup),
      ),
    ];
  };
  return ProcessCat(catalog);
}

const ResponseBodyToCSVProducts = (responseBody: BatchUpsertProductResponse): CSVProduct[] =>
  responseBody.flatMap((r) =>
    r.instances.map((i) => ({
      ID: `${r.product.id}/${i.id}`,
      Disabled: r.product.disabled && r.product.disabled.start > r.product.disabled.end ? 'TRUE' : 'FALSE',
      Categories: i.externalIDs
        .filter((x) => x.key === 'Categories')
        .map((x) => x.value)
        .join(','),
      DisplayName: i.displayName,
      Description: i.description,
      PosName: i.displayFlags.pos.name,
      Shortname: i.shortcode,
      Price: (r.product.price.amount / 100).toFixed(2),
      ...i.externalIDs.reduce(
        (acc, curr) => (curr.key.startsWith('SQID') ? acc : { ...acc, [curr.key]: curr.value }),
        {},
      ),
    })),
  );

/**
 *
 * @param data - The CSV string data to be downloaded as a CSV file.
 * @param fileName - The name of the file that will be downloaded(.csv).
 */
const DownloadCSV = (data: BatchUpsertProductResponse, fileName: string) => {
  const csvProducts = ResponseBodyToCSVProducts(data);
  const csv = unparse(csvProducts);
  const csvBlob = new Blob([csv], { type: 'text/csv' });
  const csvURL = URL.createObjectURL(csvBlob);
  const link = document.createElement('a');
  link.href = csvURL;
  link.download = `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const HierarchicalProductImportContainer = ({ onCloseCallback }: { onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [parentCategories, setParentCategories] = useState<string[]>([]);
  const [printerGroup, setPrinterGroup] = useState<string | null>(null);
  const [createCategories, setCreateCategories] = useState(true);
  const [downloadCSV, setDownloadCSV] = useState(true);
  const [modifiers, setModifiers] = useState<IProductModifier[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<CSVProduct[]>([]);
  const batchUpsertProductMutation = useBatchUpsertProductMutation();

  const addProducts = () => {
    if (batchUpsertProductMutation.isPending || isProcessing) return;
    setIsProcessing(true);
    // step 1: structure the data
    const catalog = data.reduce<HierarchicalProductStructure>(
      (acc: HierarchicalProductStructure, curr: CSVProduct) => GenerateHierarchicalProductStructure(acc, curr, 0),
      { category: '', products: [], subcategories: {} },
    );
    const products = GenerateProducts(catalog, modifiers, parentCategories, printerGroup);

    batchUpsertProductMutation.mutate(products, {
      onSuccess: (response) => {
        enqueueSnackbar(`Imported ${products.length.toString()} products.`);
        if (downloadCSV) {
          // read response body as BatchUpsertProductResponse
          DownloadCSV(response, 'import_results');
        }
      },
      onError: (error) => {
        enqueueSnackbar(`Unable to import batch. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: 'error' });
        console.error(error);
      },
      onSettled: () => {
        setIsProcessing(false);
        onCloseCallback();
      },
    });
  };

  return (
    <HierarchicalProductImportComponent
      confirmText="Import"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addProducts}
      isProcessing={isProcessing}
      disableConfirmOn={isProcessing || data.length === 0 || (createCategories && parentCategories.length > 1)}
      createCategories={createCategories}
      setCreateCategories={setCreateCategories}
      downloadCsv={downloadCSV}
      setDownloadCsv={setDownloadCSV}
      parentCategories={parentCategories}
      setParentCategories={setParentCategories}
      printerGroup={printerGroup}
      setPrinterGroup={setPrinterGroup}
      modifiers={modifiers}
      setModifiers={setModifiers}
      setFileData={setData}
    />
  );
};

export default HierarchicalProductImportContainer;
