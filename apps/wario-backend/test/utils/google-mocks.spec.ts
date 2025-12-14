import {
  createMockCalendarEvent,
  createMockGoogleDate,
  createMockSheetValues,
} from './google-mocks';

describe('Google Mocks Utilities', () => {
  describe('createMockCalendarEvent', () => {
    it('should create a valid event with defaults', () => {
      const event = createMockCalendarEvent();
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('summary', 'Test Event');
      expect(event.start?.dateTime).toBeDefined();
      expect(event.end?.dateTime).toBeDefined();
    });

    it('should allow overrides', () => {
      const event = createMockCalendarEvent({
        summary: 'Overridden Summary',
        description: 'New Description',
      });
      expect(event.summary).toBe('Overridden Summary');
      expect(event.description).toBe('New Description');
    });
  });

  describe('createMockGoogleDate', () => {
    it('should create a valid date object', () => {
      const date = new Date('2023-01-01T10:00:00Z');
      const googleDate = createMockGoogleDate(date, 'America/New_York');
      expect(googleDate).toEqual({
        dateTime: '2023-01-01T10:00:00.000Z',
        timeZone: 'America/New_York',
      });
    });
  });

  describe('createMockSheetValues', () => {
    it('should create a 2D array with default values', () => {
      const values = createMockSheetValues(2, 3);
      expect(values).toHaveLength(2);
      expect(values[0]).toHaveLength(3);
      expect(values[1]).toHaveLength(3);
      expect(values[0][0]).toBe('R0C0');
      expect(values[1][2]).toBe('R1C2');
    });

    it('should support static fill value', () => {
      const values = createMockSheetValues(1, 2, 'Fill');
      expect(values[0][0]).toBe('Fill');
      expect(values[0][1]).toBe('Fill');
    });

    it('should support dynamic fill value', () => {
      const values = createMockSheetValues(2, 2, (r: number, c: number) => r + c);
      expect(values[0][0]).toBe(0); // 0+0
      expect(values[1][1]).toBe(2); // 1+1
    });
  });
});
