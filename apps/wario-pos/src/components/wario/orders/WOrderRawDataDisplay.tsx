import { CardContent } from '@mui/material';

import { useOrderById } from '@/hooks/useOrdersQuery';

import { type ElementActionComponentProps } from '../menu/element.action.component';

type WOrderRawDataDisplayProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderRawDataDisplayComponent = (props: WOrderRawDataDisplayProps) => {
  const order = useOrderById(props.orderId);
  return <CardContent>{JSON.stringify(order, null, 2)}</CardContent>;
};

export default WOrderRawDataDisplayComponent;
