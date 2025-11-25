import React, { useMemo, useState } from "react";

import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import { Box, Button, Card, CardActions, CardContent, CardHeader, Grid, Paper, Popper, TextField, Typography } from "@mui/material";
import { GridActionsCellItem, type GridColDef, type GridRenderCellParams, type GridRowParams } from "@mui/x-data-grid-premium";

import { TableWrapperComponent } from "./table_wrapper.component";

function isOverflown(element: HTMLElement) {
  return element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth;
}

interface GridCellExpandProps {
  value: string;
  width: number;
};

const GridCellExpand = React.memo(({ width, value }: GridCellExpandProps) => {
  const wrapper = React.useRef<HTMLDivElement>(null);
  const cellDiv = React.useRef<HTMLDivElement>(null);
  const cellValue = React.useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);
  const [showFullCell, setShowFullCell] = React.useState(false);
  const [showPopper, setShowPopper] = React.useState(false);

  const handleMouseEnter = () => {
    const isCurrentlyOverflown = cellValue.current ? isOverflown(cellValue.current) : false;
    setShowPopper(isCurrentlyOverflown);
    setAnchorEl(cellDiv.current);
    setShowFullCell(true);
  };

  const handleMouseLeave = () => {
    setShowFullCell(false);
  };

  React.useEffect(() => {
    if (!showFullCell) {
      return undefined;
    }

    function handleKeyDown(nativeEvent: KeyboardEvent) {
      // IE11, Edge (prior to using Bink?) use 'Esc'
      if (nativeEvent.key === 'Escape' || nativeEvent.key === 'Esc') {
        setShowFullCell(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setShowFullCell, showFullCell]);

  return (
    <Box
      ref={wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        alignItems: 'center',
        lineHeight: '24px',
        width: 1,
        height: 1,
        position: 'relative',
        display: 'flex',
      }}
    >
      <Box
        ref={cellDiv}
        sx={{
          height: 1,
          width,
          display: 'block',
          position: 'absolute',
          top: 0,
        }}
      />
      <Box
        ref={cellValue}
        sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {value}
      </Box>
      {showPopper && (
        <Popper
          open={showFullCell && anchorEl !== null}
          anchorEl={anchorEl}
          style={{ width, offset: -17 }}
        >
          <Paper
            elevation={1}
            style={{ minHeight: (wrapper.current as HTMLDivElement).offsetHeight - 3 }}
          >
            <Typography variant="body2" style={{ padding: 8 }}>
              {value}
            </Typography>
          </Paper>
        </Popper>
      )}
    </Box>
  );
});

type renderCellExpandProps = {
  colDef: { computedWidth: number; };
  value: string;
} & GridRenderCellParams<any, any, any>

function renderCellExpand(params: renderCellExpandProps) {
  return (
    <GridCellExpand value={params.value || ''} width={params.colDef.computedWidth} />
  );
}

export interface KeyValuesRowType<T> { key: string; value: T; };
interface RowTypeNullable<T> { key: string; value: T | null; };

export type KeyValuesContainerProps<T> = {
  values: KeyValuesRowType<T>[];
  onSubmit?: (values: KeyValuesRowType<T>[]) => void;
  setValues?: (values: KeyValuesRowType<T>[]) => void;
  canAdd?: boolean;
  canEdit?: boolean;
  canRemove?: boolean;
  title?: React.ReactNode;
  isProcessing: boolean;
}


export const KeyValuesContainer = function <T>(props: KeyValuesContainerProps<T>) {
  // localValues keeps track of new and dirty values, everything else we should get from props.values
  const [localValues, setLocalValues] = useState<Record<string, RowTypeNullable<T> | KeyValuesRowType<T>>>({});
  const valuesAsRecord = useMemo(() => props.values.reduce((acc: Record<string, KeyValuesRowType<T>>, x) => ({ ...acc, [x.key]: x }), {}), [props.values]);
  const mergedRecord = useMemo(() => ({ ...valuesAsRecord, ...localValues }), [valuesAsRecord, localValues]);
  const mergedValues = useMemo(() => Object.values(mergedRecord).filter(x => x.value !== null) as KeyValuesRowType<T>[], [mergedRecord]);
  const [newkey, setNewkey] = useState("");
  const [newvalue, setNewvalue] = useState<string | number | boolean>("");


  const onAddNewKeyValuePair = () => {
    const newLocalValues = { ...localValues, [newkey]: { key: newkey, value: newvalue } as KeyValuesRowType<T> };
    setLocalValues(newLocalValues);
    if (props.setValues) {
      // @ts-ignore
      props.setValues(Object.values({ ...valuesAsRecord, ...newLocalValues }).filter(x => x.value !== null));
    }
    setNewkey("");
    setNewvalue("");
  }

  return (
    <div>
      <Card>
        {props.title && <CardHeader title={props.title} />}
        <CardContent>
          {props.canAdd &&
            <Grid container spacing={3} justifyContent="center">
              <Grid size={4}>
                <TextField
                  label="Key"
                  type="text"
                  size="small"
                  onChange={e => { setNewkey(e.target.value); }}
                  value={newkey}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Value"
                  type="text"
                  value={newvalue}
                  size="small"
                  onChange={e => { setNewvalue(e.target.value); }}
                />
              </Grid>
              <Grid size={2}>
                <Button disabled={props.isProcessing || newkey === "" || newvalue === null} onClick={onAddNewKeyValuePair}>Add</Button>
              </Grid>
            </Grid>
          }
          <div style={{ height: "100%", overflow: "auto" }}>
            <TableWrapperComponent

              /* TODO: FIX!! editing a row doesn't work right now. At the moment we need to add a row with the same key and an updated value */
              processRowUpdate={(newRow: KeyValuesRowType<T>) => {
                setLocalValues({ ...localValues, [newRow.key]: newRow });
                return newRow;
              }}
              disableToolbar
              columns={[
                { headerName: "Key", field: "key", valueGetter: (_v, row) => row.key, flex: 1 },
                { headerName: "Value", editable: props.canEdit, field: "value", valueGetter: (_v, row) => row.value, flex: 4, renderCell: renderCellExpand },
                ...(props.canRemove ? [{
                  field: 'actions',
                  type: 'actions',
                  getActions: (params: GridRowParams) => {
                    return [
                      // FIX ME! this doesn't work right now
                      <GridActionsCellItem
                        key={"delete"}
                        icon={<HighlightOffIcon />}
                        label={"Delete"}
                        onClick={() => {
                          const valueCopy = { ...localValues };
                          delete valueCopy[params.id.toString()];
                          setLocalValues(valueCopy);
                        }} />
                    ];
                  }
                }] satisfies GridColDef[] : [])
              ]}
              getRowId={(row) => row.key}
              rows={mergedValues} toolbarActions={[]} />
          </div>
        </CardContent>
        {props.onSubmit && <CardActions>
          <Button disabled={props.isProcessing} onClick={() => { props.onSubmit!(mergedValues); }}>PUSH CHANGES</Button>
        </CardActions>}
      </Card>
    </div>
  );
};
export default KeyValuesContainer;
