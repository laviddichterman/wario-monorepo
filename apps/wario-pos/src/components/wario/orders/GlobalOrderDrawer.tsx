import { useAtom } from 'jotai';

import { Box, Drawer, IconButton, Typography } from '@mui/material';

import { useEventTitleStringForOrder, useOrderById } from '@/hooks/useOrdersQuery';

import { Iconify } from '@/components/iconify';

import { orderDrawerAtom } from '@/atoms/drawerState';

import { WOrderDrawerContent } from './WOrderDrawerContent';

// Component that computes the event title using hooks for drawer header
function OrderDrawerTitle({ orderId }: { orderId: string }) {
  const order = useOrderById(orderId);
  const title = useEventTitleStringForOrder(order);
  return <>{title || 'Loading...'}</>;
}

export function GlobalOrderDrawer() {
  const [{ isOpen, orderId }, setDrawerState] = useAtom(orderDrawerAtom);

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 480 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
      ModalProps={{
        keepMounted: true, // Better open performance and helps with focus management
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">{orderId && <OrderDrawerTitle orderId={orderId} />}</Typography>
        <IconButton onClick={handleClose} edge="end">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      {/* Drawer Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {orderId && <WOrderDrawerContent orderId={orderId} onClose={handleClose} />}
      </Box>
    </Drawer>
  );
}
