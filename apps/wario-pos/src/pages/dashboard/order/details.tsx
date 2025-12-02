import { useParams } from 'src/routes/hooks';

import { useOrderById } from '@/hooks/useOrdersQuery';

import { OrderDetailsView } from '@/sections/order/view';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Order details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();
  const currentOrder = useOrderById(id);

  return (
    <>
      <title>{metadata.title}</title>
      <OrderDetailsView order={currentOrder ?? undefined} />
    </>
  );
}
