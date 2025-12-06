import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { calendar_v3 } from 'googleapis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { GoogleService } from '../google/google.service';

/**
 * Service responsible for managing Google Calendar events for orders.
 */
@Injectable()
export class OrderCalendarService {
  constructor(
    @Inject(forwardRef(() => GoogleService))
    private googleService: GoogleService,
    @InjectPinoLogger(OrderCalendarService.name)
    private readonly logger: PinoLogger,
  ) { }

  /**
   * Creates a calendar event for an order.
   * @param eventJson - The calendar event data
   * @returns The created event ID or null on failure
   */
  async CreateCalendarEvent(eventJson: calendar_v3.Schema$Event): Promise<string | null> {
    try {
      const result = await this.googleService.CreateCalendarEvent(eventJson);
      if (result?.id) {
        this.logger.info(`Created calendar event with ID: ${result.id}`);
        return result.id;
      }
      return null;
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Failed to create calendar event');
      return null;
    }
  }

  /**
   * Modifies an existing calendar event.
   * @param eventId - The ID of the event to modify
   * @param eventJson - The updated event data
   */
  async ModifyCalendarEvent(eventId: string, eventJson: calendar_v3.Schema$Event): Promise<void> {
    try {
      await this.googleService.ModifyCalendarEvent(eventId, eventJson);
      this.logger.info(`Modified calendar event: ${eventId}`);
    } catch (error: unknown) {
      this.logger.error({ err: error, eventId }, 'Failed to modify calendar event');
    }
  }

  /**
   * Deletes a calendar event.
   * @param eventId - The ID of the event to delete
   */
  async DeleteCalendarEvent(eventId: string): Promise<void> {
    try {
      await this.googleService.DeleteCalendarEvent(eventId);
      this.logger.info(`Deleted calendar event: ${eventId}`);
    } catch (error: unknown) {
      this.logger.error({ err: error, eventId }, 'Failed to delete calendar event');
    }
  }
}
