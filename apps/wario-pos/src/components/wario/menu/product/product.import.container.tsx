import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from 'notistack';
import { type ParseResult } from 'papaparse';
import { type Dispatch, type SetStateAction, useState } from 'react';

import { Autocomplete, Grid, TextField } from '@mui/material';

import {
  type CreateProductBatchRequest,
  type ICatalogSelectors,
  type IProductModifier,
  type KeyValue,
  PriceDisplay,
} from '@wcp/wario-shared';
import { type ValSetValNamed } from '@wcp/wario-ux-shared/common';
import { useCatalogSelectors, useCategoryIds } from '@wcp/wario-ux-shared/query';

import { usePrinterGroupsMap } from '@/hooks/usePrinterGroupsQuery';

import { HOST_API } from '@/config';

import GenericCsvImportComponent from '../../generic_csv_import.component';

import { ElementActionComponent } from './../element.action.component';
import ProductModifierComponent from './ProductModifierComponent';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface CSVProduct {
  Name: string;
  Description: string;
  Shortname: string;
  Price: string;
  [index: string]: string;
}

type ProductImportComponentProps = {
  confirmText: string;
  onCloseCallback: VoidFunction;
  onConfirmClick: VoidFunction;
  isProcessing: boolean;
  disableConfirmOn: boolean;
  setFileData: Dispatch<SetStateAction<CSVProduct[]>>;
} & ValSetValNamed<string[], 'parentCategories'> &
  ValSetValNamed<string | null, 'printerGroup'> &
  ValSetValNamed<IProductModifier[], 'modifiers'>;

const ProductImportComponent = (props: ProductImportComponentProps) => {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const categories = useCategoryIds();
  const { data: printerGroups } = usePrinterGroupsMap();
  return (
    <ElementActionComponent
      {...props}
      body={
        <>
          <Grid size={6}>
            <Autocomplete
              multiple
              filterSelectedOptions
              options={Object.keys(categories)}
              value={props.parentCategories.filter((x) => x)}
              onChange={(_e, v) => {
                props.setParentCategories(v);
              }}
              getOptionLabel={(option) => catalogSelectors.category(option)?.category.name ?? option}
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
 */
const ProductImportContainer = ({ onCloseCallback }: { onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [parentCategories, setParentCategories] = useState<string[]>([]);
  const [printerGroup, setPrinterGroup] = useState<string | null>(null);
  const [modifiers, setModifiers] = useState<IProductModifier[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<CSVProduct[]>([]);
  const { getAccessTokenSilently } = useAuth0();

  const addProducts = async () => {
    const products = data.map((x, i) => {
      const { Name, Description, Shortname, Price, ...others } = x;
      const externalIds: KeyValue[] = Object.entries(others)
        .filter(([_, value]) => value)
        .map(([key, value]) => ({ key, value }));
      return {
        product: {
          availability: [],
          timing: null,
          disabled: null,
          externalIDs: [],
          serviceDisable: [],
          price: { amount: Number.parseFloat(Price) * 100, currency: 'USD' },
          displayFlags: {
            is3p: false,
            bake_differential: 100,
            show_name_of_base_product: true,
            flavor_max: 10,
            bake_max: 10,
            singular_noun: '',
            order_guide: {
              suggestions: [],
              warnings: [],
            },
          },
          category_ids: parentCategories,
          printerGroup,
          modifiers,
        },
        instances: [
          {
            displayName: Name,
            modifiers: [],
            description: Description || '',
            externalIDs: externalIds,
            displayFlags: {
              pos: {
                hide: false,
                name: '',
                skip_customization: true,
              },
              menu: {
                adornment: '',
                hide: false,
                ordinal: i * 10,
                show_modifier_options: false,
                price_display: PriceDisplay.ALWAYS,
                suppress_exhaustive_modifier_list: false,
              },
              order: {
                ordinal: i * 10,
                adornment: '',
                hide: false,
                price_display: PriceDisplay.ALWAYS,
                skip_customization: true,
                suppress_exhaustive_modifier_list: false,
              },
            },
            ordinal: i * 10,
            shortcode: Shortname,
          },
        ],
      };
    });
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
        const body: CreateProductBatchRequest[] = products;
        const response = await fetch(`${HOST_API}/api/v1/menu/product/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Imported ${products.length.toString()} products.`);
          await delay(1000);
        }
      } catch (error) {
        enqueueSnackbar(`Unable to import batch. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
        onCloseCallback();
        return;
      }
    }
    setIsProcessing(false);
    onCloseCallback();
  };

  return (
    <ProductImportComponent
      confirmText="Import"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void addProducts()}
      isProcessing={isProcessing}
      disableConfirmOn={isProcessing || data.length === 0}
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

export default ProductImportContainer;
