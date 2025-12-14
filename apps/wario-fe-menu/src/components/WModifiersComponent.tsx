import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import {
  DISABLE_REASON,
  type ICatalogSelectors,
  type IOption,
  type IOptionType,
  type IProductModifier,
  IsSomethingDisabledForFulfillment,
  MoneyToDisplayString,
  SortAndFilterModifierOptions,
} from '@wcp/wario-shared/logic';
import {
  useCatalogSelectors,
  useModifierTypeById,
  useOptionById,
  type VisibleProductItem,
} from '@wcp/wario-ux-shared/query';
import { ProductDescription, ProductPrice, ProductTitle } from '@wcp/wario-ux-shared/styled';

import { useCurrentTimeForDefaultFulfillment } from '@/hooks/useQuery';

import { ModifierOptionTooltip } from './ModifierOptionTooltip';

function ModifierOptionComponent({ mtId, moId, item }: { mtId: string; moId: string; item: VisibleProductItem }) {
  const modifierOption = useOptionById(moId) as IOption;
  const modifierOptionMetadata = useMemo(
    () => item.metadata.modifier_map[mtId].options[moId],
    [item.metadata, mtId, moId],
  );
  return (
    <Grid
      sx={{ pl: 3, pt: 1 }}
      size={{
        xs: 12,
        md: 6,
        lg: 4,
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <ModifierOptionTooltip
          enableState={modifierOptionMetadata.enable_whole}
          option={modifierOption}
          product={{ productId: item.product.id, modifiers: item.productInstance.modifiers }}
        >
          <ProductDescription
            sx={{
              textDecoration:
                modifierOptionMetadata.enable_whole.enable === DISABLE_REASON.ENABLED ? 'none' : 'line-through',
            }}
          >
            {modifierOption.displayName}
          </ProductDescription>
          <ProductPrice
            sx={{
              textDecoration:
                modifierOptionMetadata.enable_whole.enable === DISABLE_REASON.ENABLED ? 'none' : 'line-through',
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 1,
            }}
          >
            {modifierOption.price.amount !== 0 ? MoneyToDisplayString(modifierOption.price, false) : 'No Charge'}
          </ProductPrice>
        </ModifierOptionTooltip>
      </Box>
    </Grid>
  );
}

function ModifierTypeComponent({
  modifierDefinition,
  item,
}: {
  modifierDefinition: IProductModifier;
  item: VisibleProductItem;
}) {
  const modifierTypeEntry = useModifierTypeById(modifierDefinition.mtid) as IOptionType;
  const modifierOptionSelector = useCatalogSelectors()?.option as (id: string) => IOption;
  const serviceDateTime = useCurrentTimeForDefaultFulfillment();
  const modifierOptions = useMemo(() => {
    const sortedVisibleOptions = SortAndFilterModifierOptions(
      item.metadata,
      modifierTypeEntry,
      modifierOptionSelector,
      serviceDateTime,
    );
    return sortedVisibleOptions.map((x) => x.id);
  }, [item, modifierTypeEntry, modifierOptionSelector, serviceDateTime]);

  return (
    <Grid container sx={{ py: 2 }}>
      <Grid sx={{ pb: 1 }} size={12}>
        <ProductTitle>
          {modifierTypeEntry.displayName ? modifierTypeEntry.displayName : modifierTypeEntry.name}
        </ProductTitle>
      </Grid>
      {modifierOptions.map((optId, j) => {
        return <ModifierOptionComponent key={j} mtId={modifierDefinition.mtid} moId={optId} item={item} />;
      })}
    </Grid>
  );
}

export function WModifiersComponent({ item, fulfillmentId }: { item: VisibleProductItem; fulfillmentId: string }) {
  const catalogSelector = useCatalogSelectors() as ICatalogSelectors;
  const modifiers = useMemo(() => {
    return (
      item.product.modifiers
        .filter((x) => !IsSomethingDisabledForFulfillment(x, fulfillmentId))
        .map((x) => {
          return { md: x, mt: catalogSelector.modifierEntry(x.mtid) };
        })
        .filter(
          (x) =>
            x.mt &&
            !x.mt.displayFlags.hidden &&
            (!x.mt.displayFlags.omit_section_if_no_available_options ||
              item.metadata.modifier_map[x.mt.id].has_selectable),
        )
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .sort((a, b) => a.mt!.ordinal - b.mt!.ordinal)
        .map((x) => x.md)
    );
  }, [item.product.modifiers, item.metadata.modifier_map, fulfillmentId, catalogSelector]);
  return (
    <>
      {modifiers.map((mod_def, i) => {
        return <ModifierTypeComponent key={i} modifierDefinition={mod_def} item={item} />;
      })}
    </>
  );
}
