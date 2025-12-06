import { SetMetadata } from '@nestjs/common';

export const LOCK_ORDER_KEY = 'lock_order';
export const LockOrder = () => SetMetadata(LOCK_ORDER_KEY, true);
