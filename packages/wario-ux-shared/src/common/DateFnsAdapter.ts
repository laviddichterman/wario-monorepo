import { toDate as toDateBase } from 'date-fns';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { DateBuilderReturnType } from '@mui/x-date-pickers/models';

export const AdapterCurrentTimeOverrideUtils = (now: Date | number) =>
  class AdapterDateFnsWrapper extends AdapterDateFns {
    public date = <T extends string | null | undefined>(
      value?: T,
    ): DateBuilderReturnType<T> => {
      type R = DateBuilderReturnType<T>;
      if (typeof value === 'undefined') {
        return <R>toDateBase(now);
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (value === null) {
        return <R>null;
      }

      return <R>new Date(value);
    };
  };