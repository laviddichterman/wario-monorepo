import { Autocomplete, Grid, TextField } from "@mui/material";

import { CALL_LINE_DISPLAY, CategoryDisplay } from "@wcp/wario-shared";
import { getCategoryEntryById, getFulfillments, type ValSetValNamed } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";

import { IntNumericPropertyComponent } from "../../property-components/IntNumericPropertyComponent";
import { StringEnumPropertyComponent } from "../../property-components/StringEnumPropertyComponent";
import { StringPropertyComponent } from "../../property-components/StringPropertyComponent";
import { ElementActionComponent } from "../element.action.component";
import type { ElementActionComponentProps } from "../element.action.component";

export interface CategoryEditProps {
  categoryId: string;
  onCloseCallback: VoidFunction;
}
export type CategoryComponentProps = {
  categoryIds: string[];
  confirmText: string;
} & Pick<ElementActionComponentProps, 'onCloseCallback' | 'onConfirmClick' | 'isProcessing'> &
  ValSetValNamed<string | null, 'description'> &
  ValSetValNamed<number, 'ordinal'> &
  ValSetValNamed<string | null, 'subheading'> &
  ValSetValNamed<string | null, 'footnotes'> &
  ValSetValNamed<string, 'name'> &
  ValSetValNamed<string, 'callLineName'> &
  ValSetValNamed<CALL_LINE_DISPLAY, 'callLineDisplay'> &
  ValSetValNamed<CategoryDisplay, 'nestedDisplay'> &
  ValSetValNamed<string | null, 'parent'> &
  ValSetValNamed<string[], 'serviceDisable'>;

const CategoryComponent = (props: CategoryComponentProps) => {
  const selectCategoryById = useAppSelector(s => (id: string) => getCategoryEntryById(s.ws.categories, id));
  const fulfillments = useAppSelector(s => getFulfillments(s.ws.fulfillments));
  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={props.onConfirmClick}
      isProcessing={props.isProcessing}
      disableConfirmOn={props.name.length === 0 || props.ordinal < 0 || props.isProcessing}
      confirmText={props.confirmText}
      body={
        <>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Category Name"
              value={props.name}
              setValue={props.setName}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <Autocomplete
              options={props.categoryIds}
              value={props.parent}
              onChange={(_, v) => { props.setParent(v !== null ? v : null); }}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              getOptionLabel={(o) => selectCategoryById(o)?.category.name ?? "Undefined"}
              isOptionEqualToValue={(o, v) => o === v}
              renderInput={(params) => (
                <TextField {...params} label="Parent Category (Optional)" />
              )}
            />
          </Grid>
          <Grid size={9}>
            <TextField
              multiline
              fullWidth
              minRows={props.description ? 4 : 1}
              label="Category Description (Optional, HTML allowed)"
              type="text"
              value={props.description}
              onChange={(e) => { props.setDescription(e.target.value); }}
            />
          </Grid>
          <Grid size={3}>
            <IntNumericPropertyComponent
              disabled={props.isProcessing}
              label="Ordinal"
              value={props.ordinal}
              setValue={props.setOrdinal}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              multiline
              fullWidth
              minRows={props.subheading ? 4 : 1}
              label="Subheading (Optional, HTML allowed)"
              type="text"
              value={props.subheading}
              onChange={(e) => { props.setSubheading(e.target.value); }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              multiline
              rows={props.footnotes ? 4 : 1}
              fullWidth
              label="Footnotes (Optional, HTML allowed)"
              type="text"
              value={props.footnotes}
              onChange={(e) => { props.setFootnotes(e.target.value); }}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <StringPropertyComponent
              disabled={props.isProcessing}
              label="Call Line Name"
              value={props.callLineName}
              setValue={props.setCallLineName}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6
            }}>
            <Autocomplete
              multiple
              fullWidth
              filterSelectedOptions
              options={fulfillments.map(x => x.id)}
              value={props.serviceDisable}
              onChange={(_, v) => {
                props.setServiceDisable(v);
              }}
              getOptionLabel={(option) => fulfillments.find((v) => v.id === option)?.displayName ?? "INVALID"}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => <TextField {...params} label="Disabled Services" />}
            />
          </Grid>
          <Grid container size={6}>
            <StringEnumPropertyComponent
              disabled={props.isProcessing}
              label="Call Line Display"
              value={props.callLineDisplay}
              setValue={props.setCallLineDisplay}
              options={Object.values(CALL_LINE_DISPLAY)}
            />
          </Grid>
          <Grid container size={6}>
            <StringEnumPropertyComponent
              disabled={props.isProcessing}
              label="Nested Display"
              value={props.nestedDisplay}
              setValue={props.setNestedDisplay}
              options={Object.values(CategoryDisplay)}
            />
          </Grid>
        </>
      }
    />
  );
}


export default CategoryComponent;