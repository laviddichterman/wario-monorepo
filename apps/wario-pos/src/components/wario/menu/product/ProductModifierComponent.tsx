import { Autocomplete, Card, CardContent, CardHeader, Grid, TextField } from '@mui/material';

import { type IProductModifier } from '@wcp/wario-shared';
import { useCatalogQuery, useFulfillmentsQuery } from '@wcp/wario-ux-shared/query';

interface ProductModifierComponentProps {
  isProcessing: boolean;
  modifiers: IProductModifier[];
  setModifiers: (modifiers: IProductModifier[]) => void;
}

const ProductModifierComponent = (props: ProductModifierComponentProps) => {
  const { data: catalog } = useCatalogQuery();
  const { data: fulfillments } = useFulfillmentsQuery();

  if (!catalog || !fulfillments) {
    return null;
  }

  const handleSetModifiers = (mods: string[]) => {
    const oldModsAsRecord = props.modifiers.reduce<Record<string, IProductModifier>>(
      (acc, m) => ({ ...acc, [m.mtid]: m }),
      {},
    );
    const sorted: IProductModifier[] = mods
      .sort((a, b) => {
        const modKeys = Object.keys(catalog.modifiers);
        return modKeys.indexOf(a) - modKeys.indexOf(b);
      })

      .map((x) => ({
        mtid: x,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        serviceDisable: oldModsAsRecord[x]?.serviceDisable ?? [],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        enable: oldModsAsRecord[x]?.enable ?? null,
      }));
    props.setModifiers(sorted);
  };

  return (
    <Grid container>
      <Grid size={12}>
        <Autocomplete
          multiple
          disabled={props.isProcessing}
          filterSelectedOptions
          options={Object.keys(catalog.modifiers)}
          value={props.modifiers.map((x) => x.mtid)}
          onChange={(_e, v) => {
            handleSetModifiers(v);
          }}
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          getOptionLabel={(option) => catalog.modifiers[option].name ?? 'CORRUPT DATA'}
          isOptionEqualToValue={(o, v) => o === v}
          renderInput={(params) => <TextField {...params} label="Modifiers" />}
        />
      </Grid>
      {props.modifiers.map((modifier, idx) => (
        <Grid
          key={idx}
          size={{
            xs: 12,
            md: props.modifiers.length - 1 === idx && props.modifiers.length % 2 === 1 ? 12 : 6,
          }}
        >
          <Card>
            <CardHeader title={`Modifier Details: ${catalog.modifiers[modifier.mtid].name}`} />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Autocomplete
                    fullWidth
                    disabled={props.isProcessing}
                    options={Object.keys(catalog.productInstanceFunctions)}
                    value={modifier.enable}
                    // this makes a copy of the modifiers array with the updated enable function value
                    onChange={(_, v) => {
                      props.setModifiers(Object.assign([], props.modifiers, { [idx]: { ...modifier, enable: v } }));
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    getOptionLabel={(option) => catalog.productInstanceFunctions[option].name ?? 'CORRUPT DATA'}
                    isOptionEqualToValue={(option, value) => option === value}
                    renderInput={(params) => <TextField {...params} label="Enable Function Name" />}
                  />
                </Grid>
                <Grid size={12}>
                  <Autocomplete
                    fullWidth
                    multiple
                    disabled={props.isProcessing}
                    filterSelectedOptions
                    options={fulfillments.map((x) => x.id)}
                    value={modifier.serviceDisable}
                    onChange={(_, v) => {
                      props.setModifiers(
                        Object.assign([], props.modifiers, { [idx]: { ...modifier, serviceDisable: v } }),
                      );
                    }}
                    getOptionLabel={(option) => fulfillments.find((v) => v.id === option)?.displayName ?? 'INVALID'}
                    isOptionEqualToValue={(option, value) => option === value}
                    renderInput={(params) => <TextField {...params} label="Disabled Services" />}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ProductModifierComponent;
