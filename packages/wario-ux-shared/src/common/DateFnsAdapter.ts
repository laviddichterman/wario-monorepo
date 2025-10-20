import type { DateBuilderReturnType } from '@mui/x-date-pickers/models';

import { toDate as toDateBase } from 'date-fns';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';

export const AdapterCurrentTimeOverrideUtils = (now: Date | number) =>
  class AdapterDateFnsWrapper extends AdapterDateFns {
    public date = <T extends string | null | undefined>(
      value?: T,
    ): DateBuilderReturnType<T, Date> => {
      type R = DateBuilderReturnType<T, Date>;
      if (typeof value === 'undefined') {
        return <R>toDateBase(now);
      }

      if (value === null) {
        return <R>null;
      }

      return <R>new Date(value);
    };
  };