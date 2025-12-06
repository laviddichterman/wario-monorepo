import { Grid, TextField } from '@mui/material';

import { useProductInstanceFunctionForm } from '@/atoms/forms/productInstanceFunctionFormAtoms';

import { ElementActionComponent, type ElementActionComponentProps } from '../element.action.component';

import AbstractExpressionFunctionalContainer from './abstract_expression_functional.container';

// =============================================================================
// FORM COMPONENT
// =============================================================================

type ProductInstanceFunctionFormComponentProps = Omit<ElementActionComponentProps, 'disableConfirmOn' | 'body'>;

const ProductInstanceFunctionFormComponent = ({
  isProcessing,
  ...forwardRefs
}: ProductInstanceFunctionFormComponentProps) => {
  const { form, updateField, isValid } = useProductInstanceFunctionForm();

  if (!form) return null;

  return (
    <ElementActionComponent
      {...forwardRefs}
      isProcessing={isProcessing}
      disableConfirmOn={!isValid || isProcessing}
      body={
        <>
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
          <Grid size={12}>
            <AbstractExpressionFunctionalContainer
              value={form.expression}
              setValue={(val) => {
                updateField('expression', val);
              }}
            />
          </Grid>
        </>
      }
    />
  );
};

export default ProductInstanceFunctionFormComponent;
