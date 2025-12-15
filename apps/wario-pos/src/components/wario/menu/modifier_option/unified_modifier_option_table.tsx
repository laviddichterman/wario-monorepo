import { useAtom } from 'jotai';

import { AddBox, ContentCopy, Delete, Edit } from '@mui/icons-material';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';

import { modifierOptionFormFamily, type ModifierOptionFormState } from '@/atoms/forms/modifierOptionFormAtoms';

import { IMoneyPropertyComponent } from '../../property-components/IMoneyPropertyComponent';
import { StringPropertyComponent } from '../../property-components/StringPropertyComponent';

export type UnifiedModifierOptionTableProps = {
  optionIds: string[];
  onAddOption: () => void;
  onEditOption: (id: string) => void;
  onDeleteOption: (id: string) => void;
  onCopyOption: (id: string) => void;
};

// Reactive Cell Components
const StringCell = ({ id, field }: { id: string; field: keyof ModifierOptionFormState }) => {
  const [form, setForm] = useAtom(modifierOptionFormFamily(id));
  if (!form) return null;
  return (
    <StringPropertyComponent
      label=""
      value={form[field] as string}
      setValue={(v) => {
        setForm({ ...form, [field]: v });
      }}
      disabled={false}
      size="small"
      sx={{ mt: 1 }}
    />
  );
};

const MoneyCell = ({ id }: { id: string }) => {
  const [form, setForm] = useAtom(modifierOptionFormFamily(id));
  if (!form) return null;
  return (
    <IMoneyPropertyComponent
      label=""
      value={form.price}
      setValue={(v) => {
        setForm({ ...form, price: v });
      }}
      disabled={false}
      size="small"
    />
  );
};

export const UnifiedModifierOptionTable = ({
  optionIds,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onCopyOption,
}: UnifiedModifierOptionTableProps) => {
  const columns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => <StringCell id={params.id as string} field="displayName" />,
    },
    {
      field: 'shortcode',
      headerName: 'Shortcode',
      width: 120,
      renderCell: (params: GridRenderCellParams) => <StringCell id={params.id as string} field="shortcode" />,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => <MoneyCell id={params.id as string} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const id = params.id as string;
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit Details">
              <IconButton
                onClick={() => {
                  onEditOption(id);
                }}
                size="small"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy">
              <IconButton
                onClick={() => {
                  onCopyOption(id);
                }}
                size="small"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                onClick={() => {
                  onDeleteOption(id);
                }}
                size="small"
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddBox />}
          onClick={() => {
            onAddOption();
          }}
          size="small"
        >
          Add Option
        </Button>
      </Box>
      <DataGrid
        rows={optionIds.map((id) => ({ id }))}
        columns={columns}
        rowHeight={60}
        disableRowSelectionOnClick
        hideFooter
      />
    </Box>
  );
};
