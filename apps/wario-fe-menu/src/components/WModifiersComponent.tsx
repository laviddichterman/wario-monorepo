import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import {
  type CatalogModifierEntry,
  DISABLE_REASON,
  type IOption,
  type IProductInstance,
  type IProductModifier,
  MoneyToDisplayString,
} from '@wcp/wario-shared';
import { useModifierEntryById, useOptionById, useProductInstanceById } from '@wcp/wario-ux-shared/query';
import { ProductDescription, ProductPrice, ProductTitle } from '@wcp/wario-ux-shared/styled';

import {
  useMenuOrderedModifiersVisibleForProductInstanceId,
  useMenuSelectMetadataModifierOptionMapEntryFromProductInstanceIdAndModifierOptionId,
  useMenuSelectVisibleModifierOptions,
} from '@/hooks/useQuery';

import { ModifierOptionTooltip } from './ModifierOptionTooltip';

function ModifierOptionComponent({ moId, productInstanceId }: { moId: string; productInstanceId: string }) {
  const product = useProductInstanceById(productInstanceId) as IProductInstance;
  const modifierOption = useOptionById(moId) as IOption;
  const modifierOptionMetadata = useMenuSelectMetadataModifierOptionMapEntryFromProductInstanceIdAndModifierOptionId(
    productInstanceId,
    moId,
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
          product={product}
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
  productInstanceId,
}: {
  modifierDefinition: IProductModifier;
  productInstanceId: string;
}) {
  const modifierTypeEntry = useModifierEntryById(modifierDefinition.mtid) as CatalogModifierEntry;
  const modifierOptions = useMenuSelectVisibleModifierOptions(productInstanceId, modifierDefinition.mtid);
  return (
    <Grid container sx={{ py: 2 }}>
      <Grid sx={{ pb: 1 }} size={12}>
        <ProductTitle>
          {modifierTypeEntry.modifierType.displayName
            ? modifierTypeEntry.modifierType.displayName
            : modifierTypeEntry.modifierType.name}
        </ProductTitle>
      </Grid>
      {modifierOptions.map((optId, j) => {
        return <ModifierOptionComponent key={j} moId={optId} productInstanceId={productInstanceId} />;
      })}
    </Grid>
  );
}

export function WModifiersComponent({ productInstanceId }: { productInstanceId: string }) {
  const modifiers = useMenuOrderedModifiersVisibleForProductInstanceId(productInstanceId);
  return (
    <>
      {modifiers.map((mod_def, i) => {
        return <ModifierTypeComponent key={i} modifierDefinition={mod_def} productInstanceId={productInstanceId} />;
      })}
    </>
  );
}
