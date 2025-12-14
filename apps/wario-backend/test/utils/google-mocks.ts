import type { calendar_v3 } from 'googleapis';

/**
 * Creates a mock Google Calendar Event.
 * Provides sensible defaults for required fields while allowing overrides.
 */
export const createMockCalendarEvent = (
  overrides: Partial<calendar_v3.Schema$Event> = {},
): calendar_v3.Schema$Event => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    id: `event_${Math.random().toString(36).substring(2, 9)}`,
    summary: 'Test Event',
    description: 'This is a mock event for testing.',
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com/calendar/event?eid=mock',
    created: now.toISOString(),
    updated: now.toISOString(),
    start: {
      dateTime: now.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: oneHourLater.toISOString(),
      timeZone: 'UTC',
    },
    ...overrides,
  };
};

/**
 * Creates a mock Google Date object (Schema$EventDateTime).
 */
export const createMockGoogleDate = (date: Date = new Date(), timeZone = 'UTC'): calendar_v3.Schema$EventDateTime => ({
  dateTime: date.toISOString(),
  timeZone,
});

/**
 * Creates a mock 2D array of values for Google Sheets.
 *
 * @param rows Number of rows to generate
 * @param cols Number of columns to generate
 * @param fillValue (Optional) Value to fill cells with. If a function, it receives (row, col) indices.
 */
export const createMockSheetValues = (
  rows: number,
  cols: number,
  fillValue: string | number | ((r: number, c: number) => string | number) = (r, c) => `R${String(r)}C${String(c)}`,
): (string | number)[][] => {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (typeof fillValue === 'function' ? fillValue(r, c) : fillValue)),
  );
};
