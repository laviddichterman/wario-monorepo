/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import type { ParseResult } from 'papaparse';
import { useEffect, useState } from 'react';

import { Autocomplete, Grid, TextField } from '@mui/material';

import { type CreateProductBatchRequest, type KeyValue, PriceDisplay } from '@wcp/wario-shared';
import { useCatalogSelectors, useCategoryIds } from '@wcp/wario-ux-shared/query';

import { usePrinterGroupsMap } from '@/hooks/usePrinterGroupsQuery';
import { useBatchUpsertProductMutation } from '@/hooks/useProductMutations';

import {
  DEFAULT_PRODUCT_FORM,
  productFormAtom,
  productFormProcessingAtom,
  type ProductFormState,
} from '@/atoms/forms/productFormAtoms';

import GenericCsvImportComponent from '../../generic_csv_import.component';
import { ElementActionComponent } from '../element.action.component';

import ProductModifierComponent from './ProductModifierComponent';

interface CSVProduct {
  Name: string;
  Description: string;
  Shortname: string;
  Price: string;
  [index: string]: string;
}

export const ProductImportContainer = ({ onCloseCallback }: { onCloseCallback: VoidFunction }) => {
  const { enqueueSnackbar } = useSnackbar();

  // Use Product Form Atoms for global settings
  const setProductForm = useSetAtom(productFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(productFormProcessingAtom);
  const productForm = useAtomValue(productFormAtom);
  const batchUpsertProductMutation = useBatchUpsertProductMutation();

  const [data, setData] = useState<CSVProduct[]>([]);

  // Initialize form and reset data on mount
  useEffect(() => {
    setProductForm(DEFAULT_PRODUCT_FORM);
    setData([]); // Reset any stale CSV data from previous session
    return () => {
      setProductForm(null);
    };
  }, [setProductForm]);

  const addProducts = () => {
    if (!productForm || batchUpsertProductMutation.isPending || isProcessing) return;

    setIsProcessing(true);
    const products: CreateProductBatchRequest[] = data.map((x, i) => {
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
          // Use price from CSV
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
          // Use global settings from Atom
          category_ids: productForm.parentCategories,
          printerGroup: productForm.printerGroup,
          modifiers: productForm.modifiers,
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

    batchUpsertProductMutation.mutate(products, {
      onSuccess: () => {
        enqueueSnackbar(`Imported ${products.length.toString()} products.`);
      },
      onError: (error: unknown) => {
        enqueueSnackbar(`Unable to import batch. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: 'error' });
        console.error(error);
      },
      onSettled: () => {
        setIsProcessing(false);
        onCloseCallback();
      },
    });
  };

  if (!productForm) return null;

  return (
    <ProductImportForm
      isProcessing={isProcessing}
      data={data}
      setData={setData}
      addProducts={addProducts}
      onCloseCallback={onCloseCallback}
    />
  );
};

// Separated component to consume atoms cleanly via hooks if needed, or just keep pure.
const ProductImportForm = ({
  isProcessing,
  data,
  setData,
  addProducts,
  onCloseCallback,
}: {
  isProcessing: boolean;
  data: CSVProduct[];
  setData: (d: CSVProduct[]) => void;
  addProducts: () => void;
  onCloseCallback: VoidFunction;
}) => {
  const [form, setForm] = useAtom(productFormAtom);
  const catalogSelectors = useCatalogSelectors();
  const categories = useCategoryIds();
  const printerGroups = usePrinterGroupsMap();

  if (!form || !catalogSelectors) return null;

  const updateField = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <ElementActionComponent
      confirmText="Import"
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => {
        addProducts();
      }}
      isProcessing={isProcessing}
      disableConfirmOn={isProcessing || data.length === 0}
      body={
        <>
          <Grid size={6}>
            <Autocomplete
              multiple
              filterSelectedOptions
              options={Object.keys(categories)}
              value={form.parentCategories}
              onChange={(_e, v) => {
                updateField('parentCategories', v);
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
              value={form.printerGroup}
              onChange={(_e, v) => {
                updateField('printerGroup', v);
              }}
              getOptionLabel={(pgId) => printerGroups[pgId].name ?? 'Undefined'}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Printer Group" />}
            />
          </Grid>
          <Grid size={12}>
            <ProductModifierComponent
              isProcessing={isProcessing}
              modifiers={form.modifiers}
              setModifiers={(v) => {
                updateField('modifiers', v);
              }}
            />
          </Grid>
          <Grid size={12}>
            <GenericCsvImportComponent
              onAccepted={(parsedData: ParseResult<CSVProduct>) => {
                setData(parsedData.data);
              }}
            />
          </Grid>
        </>
      }
    />
  );
};

export default ProductImportContainer;
