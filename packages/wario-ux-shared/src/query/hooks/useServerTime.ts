/**
 * Server time synchronization hook
 * Maintains accurate server time client-side using periodic polling
 */

import { toDate as toDateBase } from 'date-fns';
import { parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { DateBuilderReturnType } from '@mui/x-date-pickers/models';

import type { TimeSyncState } from '../types';
import { TIME_POLLING_INTERVAL } from '../types';

import { useServerTimeQuery } from './useServerTimeQuery';

/**
 * Hook for managing server time synchronization
 * serverTimeData - Server time data from socket.io (null or undefined until received)
 * @returns Current time sync state
 */
export function useServerTime(): TimeSyncState {
  const { data: serverTimeData } = useServerTimeQuery();
  const [timeSyncState, setTimeSyncState] = useState<TimeSyncState>({
    pageLoadTime: 0,
    pageLoadTimeLocal: 0,
    roughTicksSinceLoad: 0,
    currentTime: 0,
    currentLocalTime: 0,
    serverTime: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize time sync when server time is first received
  useEffect(() => {
    if (serverTimeData && !timeSyncState.serverTime) {
      const pageLoadTime = parseISO(serverTimeData.time).valueOf();
      const pageLoadTimeLocal = Date.now();

      setTimeSyncState({
        pageLoadTime,
        pageLoadTimeLocal,
        roughTicksSinceLoad: 0,
        currentTime: pageLoadTime,
        currentLocalTime: pageLoadTimeLocal,
        serverTime: serverTimeData,
      });
    }
  }, [serverTimeData, timeSyncState.serverTime]);

  // Update current time estimate
  const updateCurrentTime = useCallback(() => {
    setTimeSyncState((prev) => {
      if (!prev.serverTime) {
        return prev;
      }

      const currentLocalTime = Date.now();
      const ticksBetweenLocalTimeThisAndPreviousCall = currentLocalTime - prev.currentLocalTime;
      const totalTicksBetweenLocalTime = currentLocalTime - prev.pageLoadTimeLocal;
      const computedTicksElapsedBetweenCalls = Math.max(
        TIME_POLLING_INTERVAL,
        ticksBetweenLocalTimeThisAndPreviousCall
      );
      const computedTicksSinceLoad = prev.roughTicksSinceLoad + computedTicksElapsedBetweenCalls;
      const ticks = Math.max(computedTicksSinceLoad, totalTicksBetweenLocalTime);

      const currentTime = parseISO(prev.serverTime.time).valueOf() + ticks;

      return {
        ...prev,
        currentLocalTime,
        currentTime,
        roughTicksSinceLoad: ticks,
      };
    });
  }, []);

  // Set up polling interval when server time is available
  useEffect(() => {
    if (timeSyncState.serverTime && !intervalRef.current) {
      // Start polling
      intervalRef.current = setInterval(updateCurrentTime, TIME_POLLING_INTERVAL);

      // Cleanup on unmount
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [timeSyncState.serverTime, updateCurrentTime]);

  return timeSyncState;
}

/**
 * Hook for getting a date-fns adapter that uses server time instead of local time.
 * Consumes useServerTimeQuery internally and manages time sync via a ref,
 * so the adapter class is stable and doesn't cause rerenders when server time updates.
 * 
 * @returns Stable AdapterDateFns class that reads current server time on each date() call
 * 
 * Usage:
 * ```tsx
 * const DateAdapter = useDateFnsAdapter();
 * 
 * <LocalizationProvider dateAdapter={DateAdapter}>
 *   <DatePicker />
 * </LocalizationProvider>
 * ```
 */
export const useDateFnsAdapter = () => {
  const { currentTime } = useServerTime();

  const timeRef = useRef(currentTime);
  timeRef.current = currentTime;

  return useMemo(() => {
    return class ServerTimeAdapter extends AdapterDateFns {
      public date = <T extends string | null | undefined>(
        value?: T
      ): DateBuilderReturnType<T> => {
        type R = DateBuilderReturnType<T>;
        if (typeof value === 'undefined') {
          // Read from ref - always gets latest value without causing rerender
          return <R>toDateBase(timeRef.current || Date.now());
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (value === null) {
          return <R>null;
        }
        return <R>new Date(value);
      };
    };
  }, []); // Empty deps - adapter is stable, reads from ref
};