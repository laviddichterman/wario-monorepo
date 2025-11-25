import { useAuth0 } from '@auth0/auth0-react';

import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { forceSendOrder } from "../../../redux/slices/OrdersSlice";
import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";

type WOrderForceSendComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderForceSendComponent = (props: WOrderForceSendComponentProps) => {
  const { getAccessTokenSilently } = useAuth0();
  const dispatch = useAppDispatch();
  const orderSliceState = useAppSelector(s => s.orders.requestStatus);

  const submitToWario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (orderSliceState !== 'PENDING') {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order" } });
      await dispatch(forceSendOrder({ orderId: props.orderId, token: token }));
      if (props.onCloseCallback) {
        props.onCloseCallback(e); return;
      }
    }
  }

  return (<ElementActionComponent
    onCloseCallback={props.onCloseCallback}
    onConfirmClick={(e) => void submitToWario(e)}
    isProcessing={orderSliceState === 'PENDING'}
    disableConfirmOn={orderSliceState === 'PENDING'}
    confirmText={'Force Send Order (BE CAREFUL WITH THIS)'}
    body={<></>
    }
  />)
};

export default WOrderForceSendComponent;
