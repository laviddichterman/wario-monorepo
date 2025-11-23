import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import type { UseSetStateReturn } from '@/hooks/useSetState';

import { fDateRangeShortLabel } from '@/utils/dateFunctions';

import type { FiltersResultProps } from '@/components/filters-result';
import { chipProps, FiltersBlock, FiltersResult } from '@/components/filters-result';

import type { ICalendarFilters } from './types';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  filters: UseSetStateReturn<ICalendarFilters>;
};

const isFiltered = (filters: ICalendarFilters) => {
  return !!filters.startDate && !!filters.endDate;
}

export function CalendarFiltersResult({ filters, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

  const handleRemoveDate = useCallback(() => {
    updateFilters({ startDate: null, endDate: null });
  }, [updateFilters]);

  return (
    isFiltered(currentFilters) && (
      <FiltersResult totalResults={totalResults} onReset={() => { resetFilters(); }} sx={sx}>
        <FiltersBlock
          label="Date:"
          isShow={Boolean(currentFilters.startDate && currentFilters.endDate)}
        >
          <Chip
            {...chipProps}
            label={fDateRangeShortLabel(currentFilters.startDate, currentFilters.endDate)}
            onDelete={handleRemoveDate}
          />
        </FiltersBlock>
      </FiltersResult>
    )
  );
}
