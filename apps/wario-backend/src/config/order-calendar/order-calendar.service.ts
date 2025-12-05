import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { calendar_v3 } from 'googleapis';

import { GoogleService } from '../google/google.service';

/**
 * Service responsible for managing Google Calendar events for orders.
 */
@Injectable()
export class OrderCalendarService {
  private readonly logger = new Logger(OrderCalendarService.name);

  constructor(
    @Inject(forwardRef(() => GoogleService))
    private googleService: GoogleService,
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
        this.logger.log(`Created calendar event with ID: ${result.id}`);
        return result.id;
      }
      return null;
    } catch (error: unknown) {
      this.logger.error(`Failed to create calendar event: ${error}`);
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
      this.logger.log(`Modified calendar event: ${eventId}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to modify calendar event ${eventId}: ${error}`);
    }
  }

  /**
   * Deletes a calendar event.
   * @param eventId - The ID of the event to delete
   */
  async DeleteCalendarEvent(eventId: string): Promise<void> {
    try {
      await this.googleService.DeleteCalendarEvent(eventId);
      this.logger.log(`Deleted calendar event: ${eventId}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to delete calendar event ${eventId}: ${error}`);
    }
  }
}
