import { TabPanel } from '@mui/lab';
import { Grid, TextField } from '@mui/material';

import { useProductInstanceFunctionForm } from '@/atoms/forms/productInstanceFunctionFormAtoms';

import AbstractExpressionFunctionalContainer from './abstract_expression_functional.container';

export const ProductInstanceFunctionFormBody = () => {
  const { form, updateField } = useProductInstanceFunctionForm();

  if (!form) return null;

  return (
    <>
      <TabPanel value="identity">
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label="Function Name"
              type="text"
              slotProps={{
                htmlInput: { size: 40 },
              }}
              value={form.functionName}
              size="small"
              onChange={(e) => {
                updateField('functionName', e.target.value);
              }}
            />
          </Grid>
        </Grid>
      </TabPanel>
      <TabPanel value="logic">
        <Grid container spacing={2}>
          <Grid size={12}>
            <AbstractExpressionFunctionalContainer
              value={form.expression}
              setValue={(val) => {
                updateField('expression', val);
              }}
            />
          </Grid>
        </Grid>
      </TabPanel>
    </>
  );
};
