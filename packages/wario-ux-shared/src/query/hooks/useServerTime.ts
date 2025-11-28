/**
 * Server time synchronization hook
 * Maintains accurate server time client-side using periodic polling
 */

import { parseISO } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ServerTimeData, TimeSyncState } from '../types';
import { TIME_POLLING_INTERVAL } from '../types';

/**
 * Hook for managing server time synchronization
 * @param serverTimeData - Server time data from socket.io (null or undefined until received)
 * @returns Current time sync state
 */
export function useServerTime(serverTimeData: ServerTimeData | null | undefined): TimeSyncState {
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
