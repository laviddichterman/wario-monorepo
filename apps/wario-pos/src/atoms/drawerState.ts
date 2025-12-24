import { atom } from 'jotai';

export interface OrderDrawerState {
  orderId: string | null;
  isOpen: boolean;
}

export const orderDrawerAtom = atom<OrderDrawerState>({
  orderId: null,
  isOpen: false,
});
