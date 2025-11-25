/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React, { useEffect, useMemo, useState } from "react";

import { Autocomplete, Card, CardContent, CardHeader, FormControl, FormControlLabel, FormLabel, Grid, List, ListItem, Radio, RadioGroup, Switch, TextField } from "@mui/material";

import type { IAbstractExpression, IConstLiteralExpression, IHasAnyOfModifierExpression, IIfElseExpression, ILogicalExpression, IModifierPlacementExpression, IOption, ProductMetadataExpression } from "@wcp/wario-shared";
import { ConstLiteralDiscriminator, formatDecimal, LogicalFunctionOperator, MetadataField, OptionPlacement, OptionQualifier, parseDecimal, PRODUCT_LOCATION, ProductInstanceFunctionType, WFunctional } from "@wcp/wario-shared";
import { getModifierOptionById, getModifierTypeEntryById } from "@wcp/wario-ux-shared";
import { CheckedNumericInput, type ValSetVal } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";


export interface DiscriminatedFunctionalComponentProps<T> {
  expression_types: Record<string, React.ReactNode>;
  discriminator: T | null;
  setDiscriminator: (value: T | null) => void;
}


export interface AbstractExpressionFunctionalComponentProps {
  title: string | null;
  expression_types: Record<keyof typeof ProductInstanceFunctionType, React.ReactNode>;
  discriminator: ProductInstanceFunctionType | null;
  setDiscriminator: (value: ProductInstanceFunctionType | null) => void;
}

const AbstractExpressionFunctionalComponent = ({
  title,
  expression_types,
  discriminator,
  setDiscriminator,
}: AbstractExpressionFunctionalComponentProps) => (
  <div>
    <List>
      <ListItem>
        <Card>
          {title !== null ? <CardHeader title={title} /> : ""}
          <CardContent>
            <FormControl component="fieldset">
              <FormLabel>Expression Type</FormLabel>
              <RadioGroup
                aria-label="Expression Type"
                name="Expression Type"
                row
                value={discriminator}
                onChange={(e) => { setDiscriminator(ProductInstanceFunctionType[e.target.value as ProductInstanceFunctionType]); }}
              >
                {Object.keys(ProductInstanceFunctionType).map((val, idx) => (
                  <FormControlLabel
                    key={idx}
                    control={<Radio disableRipple />}
                    value={val}
                    label={val}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>
      </ListItem>
      {discriminator !== null &&
        <ListItem>
          <List>
            {expression_types[discriminator]}
          </List>
        </ListItem>
      }
    </List>
  </div>
);

/* eslint-disable prefer-const */
let ConstLiteralFunctionalComponent: ({ value, setValue }: ValSetVal<IConstLiteralExpression | null>) => React.JSX.Element;
let LogicalFunctionalComponent: ({ value, setValue }: ValSetVal<ILogicalExpression<IAbstractExpression> | null>) => React.JSX.Element;
let IfElseFunctionalComponent: ({ value, setValue }: ValSetVal<IIfElseExpression<IAbstractExpression> | null>) => React.JSX.Element;
let ModifierPlacementFunctionalComponent: ({ value, setValue }: ValSetVal<IModifierPlacementExpression | null>) => React.JSX.Element;
let HasAnyOfModifierTypeFunctionalComponent: ({ value, setValue }: ValSetVal<IHasAnyOfModifierExpression | null>) => React.JSX.Element;
let ProductMetadataFunctionalComponent: ({ value, setValue }: ValSetVal<ProductMetadataExpression | null>) => React.JSX.Element;
/* eslint-enable prefer-const */

const AbstractExpressionFunctionalContainer = ({
  value,
  setValue
}: ValSetVal<IAbstractExpression | null>) => {
  const modifierTypeSelector = useAppSelector(s => (id: string) => getModifierTypeEntryById(s.ws.modifierEntries, id));
  const modifierOptionSelector = useAppSelector(s => (id: string) => getModifierOptionById(s.ws.modifierOptions, id));
  const [discriminator, setDiscriminator] = useState<ProductInstanceFunctionType | null>(value?.discriminator ?? null);
  const [expr, setExpr] = useState<IAbstractExpression['expr'] | null>(value?.expr ?? null);
  useEffect(() => {
    if (discriminator !== null && expr !== null) {
      setValue({ discriminator, expr } as IAbstractExpression);
    }
  }, [discriminator, expr, setValue]);
  const updateDiscriminator = (val: ProductInstanceFunctionType | null) => {
    setDiscriminator(val);
    setExpr(null);
  }
  const expression_types = {
    Logical: (
      <LogicalFunctionalComponent
        value={expr as ILogicalExpression<IAbstractExpression>}
        setValue={setExpr}
      />
    ),
    ConstLiteral: (
      <ConstLiteralFunctionalComponent
        value={expr as IConstLiteralExpression}
        setValue={setExpr}
      />
    ),
    IfElse: (
      <IfElseFunctionalComponent
        value={expr as IIfElseExpression<IAbstractExpression>}
        setValue={setExpr}
      />
    ),
    ModifierPlacement: (
      <ModifierPlacementFunctionalComponent
        value={expr as IModifierPlacementExpression}
        setValue={setExpr}
      />
    ),
    HasAnyOfModifierType: (
      <HasAnyOfModifierTypeFunctionalComponent
        value={expr as IHasAnyOfModifierExpression}
        setValue={setExpr}
      />
    ),
    ProductMetadata: (
      <ProductMetadataFunctionalComponent
        value={expr as ProductMetadataExpression}
        setValue={setExpr}
      />
    ),
  };
  return (
    <AbstractExpressionFunctionalComponent
      title={value !== null ? WFunctional.AbstractExpressionStatementToString(value, { modifierEntry: modifierTypeSelector, option: modifierOptionSelector }) : null}
      expression_types={expression_types}
      discriminator={discriminator}
      setDiscriminator={updateDiscriminator}
    />
  );
};

LogicalFunctionalComponent = ({
  value,
  setValue,
}) => {
  const [operator, setOperator] = useState(value?.operator ?? null);
  const [operandA, setOperandA] = useState(value?.operandA ?? null);
  const [operandB, setOperandB] = useState(value?.operandB ?? null);
  useEffect(() => {
    if (operator !== null) {
      if (operandA !== null) {
        if (operator === LogicalFunctionOperator.NOT) {
          setValue({ operator, operandA });
        } else if (operandB !== null) {
          setValue({ operator, operandA, operandB });
        }
      }
    }
  }, [operator, operandA, operandB, setValue])
  const updateOperator = (val: string) => {
    const value = LogicalFunctionOperator[val as keyof typeof LogicalFunctionOperator];
    if (operator === LogicalFunctionOperator.NOT) {
      setOperandB(null);
    }
    setOperator(value);
  };
  return (
    <div>
      <List>
        <ListItem>
          <Card>
            <CardContent>
              <FormControl component="fieldset">
                <FormLabel>Operator</FormLabel>
                <RadioGroup
                  aria-label="Operator"
                  name="Operator"
                  row
                  value={operator}
                  onChange={(_, value) => { updateOperator(value); }}
                >
                  {Object.keys(LogicalFunctionOperator).map((val, idx) => (
                    <FormControlLabel
                      key={idx}
                      control={<Radio disableRipple />}
                      value={val}
                      label={val}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        </ListItem>
        <ListItem>
          <Card>
            <CardHeader title="Left Operand" />
            <CardContent>
              <AbstractExpressionFunctionalContainer
                value={operandA}
                setValue={setOperandA}
              />
            </CardContent>
          </Card>
        </ListItem>
      </List>
      {operator !== LogicalFunctionOperator.NOT ? (
        <ListItem>
          <Card>
            <CardHeader title="Right Operand" />
            <CardContent>
              <AbstractExpressionFunctionalContainer
                value={operandB}
                setValue={setOperandB}
              />
            </CardContent>
          </Card>
        </ListItem>
      ) : (
        ""
      )}
    </div>
  );
};

IfElseFunctionalComponent = ({
  value,
  setValue,
}) => {
  const [testExpr, setTestExpr] = useState<IAbstractExpression | null>(value?.test ?? null);
  const [trueBranchExpr, setTrueBranchExpr] = useState<IAbstractExpression | null>(
    value?.true_branch ?? null
  );
  const [falseBranchExpr, setFalseBranchExpr] = useState<IAbstractExpression | null>(
    value?.false_branch ?? null
  );
  useEffect(() => {
    if (testExpr !== null && trueBranchExpr !== null && falseBranchExpr !== null) {
      setValue({ test: testExpr, true_branch: trueBranchExpr, false_branch: falseBranchExpr });
    }
  }, [testExpr, trueBranchExpr, falseBranchExpr, setValue]);
  return (
    <div>
      <List>
        <ListItem>
          <Card>
            <CardHeader title="Test Expression" />
            <CardContent>
              <AbstractExpressionFunctionalContainer
                value={testExpr}
                setValue={setTestExpr}
              />
            </CardContent>
          </Card>
        </ListItem>
        <ListItem>
          <Card>
            <CardHeader title="True Branch Expression" />
            <CardContent>
              <AbstractExpressionFunctionalContainer
                value={trueBranchExpr}
                setValue={setTrueBranchExpr}
              />
            </CardContent>
          </Card>
        </ListItem>
        <ListItem>
          <Card>
            <CardHeader title="False Branch Expression" />
            <CardContent>
              <AbstractExpressionFunctionalContainer
                value={falseBranchExpr}
                setValue={setFalseBranchExpr}
              />
            </CardContent>
          </Card>
        </ListItem>
      </List>
    </div>
  );
};

HasAnyOfModifierTypeFunctionalComponent = ({
  value,
  setValue,
}) => {
  const modifier_types = useAppSelector(s => s.ws.catalog?.modifiers ?? {});
  const [modifier, setModifier] = useState(value?.mtid ?? null);
  useEffect(() => {
    if (modifier !== null) {
      setValue({ mtid: modifier });
    }
  }, [modifier, setValue]);
  return (
    <Grid container>
      <Grid>
        <Autocomplete
          style={{ width: 200 }}
          options={Object.keys(modifier_types)}
          value={modifier}
          onChange={(_, v) => { setModifier(v); }}
          getOptionLabel={(o) => modifier_types[o].modifierType.name ?? "CORRUPTED DATA"}
          isOptionEqualToValue={(o, v) => o === v}
          renderInput={(params) => <TextField {...params} label="Modifier" />}
        />
      </Grid>
    </Grid>
  );
};


ModifierPlacementFunctionalComponent = ({
  value,
  setValue,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const catalog = useAppSelector(s => s.ws.catalog!);
  const [modifier, setModifier] = useState(value?.mtid ?? null);
  const modifierOptionsForType = useMemo(() => modifier !== null ?
    catalog.modifiers[modifier].options.reduce((acc: Record<string, IOption>, o) => ({ ...acc, [o]: catalog.options[o] }), {}) :
    {}, [modifier, catalog.options, catalog.modifiers])
  const [modifierOption, setModifierOption] = useState(value?.moid ?? null);
  useEffect(() => {
    if (modifier !== null && modifierOption !== null) {
      setValue({ mtid: modifier, moid: modifierOption });
    }
  }, [modifier, modifierOption, setValue]);
  return (
    <Grid container>
      <Grid>
        <Autocomplete
          style={{ width: 200 }}
          options={Object.keys(catalog.modifiers)}
          value={modifier}
          onChange={(_, v) => { setModifier(v); }}
          getOptionLabel={(o) => catalog.modifiers[o].modifierType.name ?? "CORRUPTED DATA"}
          isOptionEqualToValue={(o, v) => o === v}
          renderInput={(params) => <TextField {...params} label="Modifier" />}
        />
      </Grid>
      {modifier !== null && catalog.modifiers[modifier].options.length && (
        <Grid size={6}>
          <Autocomplete
            style={{ width: 200 }}
            options={Object.keys(modifierOptionsForType)}
            value={modifierOption}
            onChange={(_, v) => { setModifierOption(v); }}
            getOptionLabel={(o) => modifierOptionsForType[o].displayName ?? "CORRUPT DATA"}
            isOptionEqualToValue={(o, v) => o === v}
            renderInput={(params) => <TextField {...params} label="Option" />}
          />
        </Grid>
      )}
    </Grid>
  );
};

ProductMetadataFunctionalComponent = ({
  value,
  setValue,
}) => {
  const [fieldValue, setFieldValue] = useState<MetadataField | null>(value?.field ?? null);
  const [locationValue, setLocationValue] = useState<PRODUCT_LOCATION | null>(value?.location ?? null);
  useEffect(() => {
    if (fieldValue !== null && locationValue !== null) {
      setValue({ field: fieldValue, location: locationValue });
    }
  }, [fieldValue, locationValue, setValue]);
  return (
    <Grid container>
      <Grid size={12}>
        <FormControl component="fieldset">
          <FormLabel>Field Value</FormLabel>
          <RadioGroup
            aria-label="Field Value"
            name="Field Value"
            row
            value={fieldValue}
            onChange={(_, value) => { setFieldValue(value as unknown as MetadataField); }}
          >
            {[MetadataField.FLAVOR, MetadataField.WEIGHT].map((val, idx) => (
              <FormControlLabel
                key={idx}
                control={<Radio disableRipple />}
                value={val}
                label={MetadataField[val]}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid size={12}>
        <FormControl component="fieldset">
          <FormLabel>Location</FormLabel>
          <RadioGroup
            aria-label="Location"
            name="Location"
            row
            value={locationValue}
            onChange={(_, value) => { setLocationValue(value as unknown as PRODUCT_LOCATION); }}
          >
            {[PRODUCT_LOCATION.LEFT, PRODUCT_LOCATION.RIGHT].map((val, idx) => (
              <FormControlLabel
                key={idx}
                control={<Radio disableRipple />}
                value={val}
                label={PRODUCT_LOCATION[val]}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
};



export interface ConstLiteralFunctionalComponentInnerProps {
  expression_types: Record<keyof typeof ConstLiteralDiscriminator, React.ReactNode>;
  discriminator: ConstLiteralDiscriminator | null;
  setDiscriminator: (value: ConstLiteralDiscriminator | null) => void;
}

const ConstLiteralFunctionalComponentInner = ({
  expression_types,
  discriminator,
  setDiscriminator,
}: ConstLiteralFunctionalComponentInnerProps) => (
  <List>
    <ListItem>
      <Card>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel>Literal Type</FormLabel>
            <RadioGroup
              aria-label="Literal Type"
              name="Literal Type"
              row
              value={discriminator}
              onChange={(e) => { setDiscriminator(ConstLiteralDiscriminator[e.target.value as keyof typeof ConstLiteralDiscriminator]); }}
            >
              {Object.keys(ConstLiteralDiscriminator).map((val, idx) => (
                <FormControlLabel
                  key={idx}
                  control={<Radio disableRipple />}
                  value={val}
                  label={val}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>
    </ListItem>
    {discriminator !== null &&
      <ListItem>
        <List>
          {expression_types[discriminator]}
        </List>
      </ListItem>
    }
  </List>
);

const LITERAL_TYPES = {
  [ConstLiteralDiscriminator.STRING]: (x: unknown) => String(x),
  [ConstLiteralDiscriminator.NUMBER]: parseFloat,
  [ConstLiteralDiscriminator.MODIFIER_PLACEMENT]: (x: unknown) => OptionPlacement[x as keyof typeof OptionPlacement],
  [ConstLiteralDiscriminator.MODIFIER_QUALIFIER]: (x: unknown) => OptionQualifier[x as keyof typeof OptionQualifier],
  [ConstLiteralDiscriminator.BOOLEAN]: (x: unknown) => x ? true : false
}

const ConstStringLiteralComponent = ({ value, setValue }: ValSetVal<string | null>) => {
  const [local_value, setLocalValue] = useState<string>(value ?? "");
  const [dirty, setDirty] = useState(false);
  const onFinishChangingLocal = () => {
    setDirty(false);
    setValue(local_value);
  }
  const onChangeLocal = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDirty(true);
    setLocalValue(e.target.value);
  }
  return <TextField
    label="Literal Value"
    type="text"
    value={dirty ? local_value : (value ?? "")}
    size="small"
    fullWidth
    onChange={(e) => { onChangeLocal(e); }}
    onBlur={() => { onFinishChangingLocal(); }}
  />
};

const ConstNumberLiteralComponent = ({ value, setValue }: ValSetVal<number | null>) =>
  <CheckedNumericInput
    type="number"
    size="small"
    fullWidth
    label={"Literal Value"}
    numberProps={{
      allowEmpty: false,
      defaultValue: 0,
      formatFunction: (i) => formatDecimal(i),
      parseFunction: parseDecimal,
    }}
    inputMode="decimal"
    pattern="[0-9]+([.,][0-9]+)?"
    value={value ?? 0}
    onChange={setValue}
  />


const ConstModifierPlacementLiteralComponent = function ({ value, setValue }: ValSetVal<number | null>) {
  return (
    <FormControl component="fieldset">
      <FormLabel>Placement Value</FormLabel>
      <RadioGroup
        aria-label="Placement Value"
        name="Placement Value"
        row
        value={value}
        onChange={(e) => { setValue(parseInt(e.target.value as OptionPlacement)); }}
      >
        {[OptionPlacement.NONE, OptionPlacement.LEFT, OptionPlacement.RIGHT, OptionPlacement.WHOLE].map((val, idx) => (
          <FormControlLabel
            key={idx}
            control={<Radio disableRipple />}
            value={val}
            label={OptionPlacement[val]}
          />
        ))}
      </RadioGroup>
    </FormControl>);
};

const ConstModifierQualifierLiteralComponent = function ({ value, setValue }: ValSetVal<number | null>) {
  return (
    <FormControl component="fieldset">
      <FormLabel>Qualifier Value</FormLabel>
      <RadioGroup
        aria-label="Qualifier Value"
        name="Qualifier Value"
        row
        value={value}
        onChange={(e) => { setValue(parseInt(e.target.value as OptionQualifier)); }}
      >
        {[OptionQualifier.REGULAR, OptionQualifier.HEAVY, OptionQualifier.LITE, OptionQualifier.OTS].map((val, idx) => (
          <FormControlLabel
            key={idx}
            control={<Radio disableRipple />}
            value={val}
            label={val}
          />
        ))}
      </RadioGroup>
    </FormControl>);
};

const ConstBooleanLiteralComponent = function ({ value, setValue }: ValSetVal<boolean | null>) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={value || false}
          onChange={e => { setValue(e.target.checked); }}
          name="Boolean Literal"
        />
      }
      label="Can Split"
    />);
};

ConstLiteralFunctionalComponent = ({
  value,
  setValue
}) => {
  const [discriminator, setDiscriminator] = useState<ConstLiteralDiscriminator | null>(value?.discriminator ?? null);
  const [innerValue, setInnerValue] = useState<IConstLiteralExpression['value'] | null>(value?.value ?? null);
  useEffect(() => {
    if (discriminator !== null && innerValue !== null) {
      setValue({ discriminator, value: innerValue } as IConstLiteralExpression);
    }
  }, [discriminator, innerValue, setValue]);
  const updateDiscriminator = (val: ConstLiteralDiscriminator | null) => {
    setDiscriminator(val);
    // try to convert to new descrim'd value
    try {
      if (val !== null && innerValue !== null) {
        const attemptedConversion = LITERAL_TYPES[val](String(innerValue));
        setInnerValue(attemptedConversion);
        return;
      }
    }
    catch {
      // eat it
    }
    setInnerValue(null);
  }
  const literal_type_map = {
    [ConstLiteralDiscriminator.STRING]: (
      <ConstStringLiteralComponent
        value={innerValue as string}
        setValue={setInnerValue}
      />
    ),
    [ConstLiteralDiscriminator.NUMBER]: (
      <ConstNumberLiteralComponent
        value={innerValue as number}
        setValue={setInnerValue}
      />
    ),
    [ConstLiteralDiscriminator.BOOLEAN]: (
      <ConstBooleanLiteralComponent
        value={innerValue as boolean}
        setValue={setInnerValue}
      />
    ),
    [ConstLiteralDiscriminator.MODIFIER_PLACEMENT]: (
      <ConstModifierPlacementLiteralComponent
        // <ConstNumberLiteralComponent
        value={innerValue as number}
        setValue={setInnerValue}
      />
    ),
    [ConstLiteralDiscriminator.MODIFIER_QUALIFIER]: (
      <ConstModifierQualifierLiteralComponent
        // <ConstNumberLiteralComponent
        value={innerValue as number}
        setValue={setInnerValue}
      />
    )
  };
  return (
    <ConstLiteralFunctionalComponentInner
      expression_types={literal_type_map}
      discriminator={discriminator}
      setDiscriminator={updateDiscriminator}
    />
  );
};

export default AbstractExpressionFunctionalContainer;
