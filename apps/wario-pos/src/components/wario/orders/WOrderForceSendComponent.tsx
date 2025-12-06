import { useForceSendOrderMutation } from "@/hooks/useOrdersQuery";

import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";

type WOrderForceSendComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderForceSendComponent = (props: WOrderForceSendComponentProps) => {
  const forceSendMutation = useForceSendOrderMutation();

  const submitToWario = (e: React.MouseEvent<HTMLButtonElement>) => {
    forceSendMutation.mutate(
      { orderId: props.orderId },
      {
        onSuccess: () => {
          if (props.onCloseCallback) {
            props.onCloseCallback(e);
          }
        }
      }
    );
  }

  return (<ElementActionComponent
    onCloseCallback={props.onCloseCallback}
    onConfirmClick={submitToWario}
    isProcessing={forceSendMutation.isPending}
    disableConfirmOn={forceSendMutation.isPending}
    confirmText={'Force Send Order (BE CAREFUL WITH THIS)'}
    body={<></>
    }
  />)
};

export default WOrderForceSendComponent;
