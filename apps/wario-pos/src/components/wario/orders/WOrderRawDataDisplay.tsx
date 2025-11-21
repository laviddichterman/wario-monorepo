import { CardContent } from '@mui/material';

import { useAppSelector } from "../../../hooks/useRedux";
import { getWOrderInstanceById } from "../../../redux/slices/OrdersSlice";
import { type ElementActionComponentProps } from "../menu/element.action.component";

type WOrderRawDataDisplayProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderRawDataDisplayComponent = (props: WOrderRawDataDisplayProps) => {
  const order = useAppSelector(s => getWOrderInstanceById(s.orders.orders, props.orderId));
  return (<CardContent>
    {JSON.stringify(order, null, 2)}
  </CardContent>)
};

export default WOrderRawDataDisplayComponent;
