import { useParams } from 'src/routes/hooks';

import { useAppSelector } from '@/hooks/useRedux';

import { OrderDetailsView } from '@/sections/order/view';

import { CONFIG } from '@/config';
import { getWOrderInstanceById } from '@/redux/slices/OrdersSlice';

// ----------------------------------------------------------------------

const metadata = { title: `Order details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();
  const currentOrder = useAppSelector(s => getWOrderInstanceById(s.orders.orders, id));

  return (
    <>
      <title>{metadata.title}</title>
      <OrderDetailsView order={currentOrder} />
    </>
  );
}
