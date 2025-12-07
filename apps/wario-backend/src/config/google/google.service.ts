import { Injectable, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OAuth2Client } from 'google-auth-library';
import { calendar_v3, google, sheets_v4 } from 'googleapis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { ExponentialBackoff } from '../../utils/exponential-backoff';
import { DataProviderService } from '../data-provider/data-provider.service';

const OAuth2 = google.auth.OAuth2;

@Injectable()
export class GoogleService implements OnModuleInit {
  private accessToken: string;
  private smtpTransport: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private calendarAPI: calendar_v3.Calendar;
  private sheetsAPI: sheets_v4.Sheets;
  private oauth2Client: OAuth2Client;

  constructor(
    private readonly dataProvider: DataProviderService,
    @InjectPinoLogger(GoogleService.name)
    private readonly logger: PinoLogger,
  ) {
    this.calendarAPI = google.calendar('v3');
    this.sheetsAPI = google.sheets('v4');
  }

  @Interval(2700000)
  async handleTokenRefresh() {
    await this.RefreshAccessToken();
  }

  RefreshAccessToken = async () => {
    try {
      const token = await this.oauth2Client.getAccessToken();
      this.logger.debug({ token: token.token }, 'Refreshing Google OAUTH2 access token');
      this.accessToken = token.token as string;
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Failed to refresh Google access token');
    }
  };

  async onModuleInit() {
    // this bootstrapping requires having used https://developers.google.com/oauthplayground/ to get a refresh token.
    // 1. Go to https://developers.google.com/oauthplayground/
    // 2. set scopes to https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://mail.google.com/
    // 3. Click on the gear icon, and check "Use your own OAuth credentials"
    // 4. Enter the client ID and client secret from the Google Cloud Console
    // 5. Click "Authorize APIs" and use the account you want to send emails from
    // 6. Click "Exchange authorization code for tokens"
    // In the future, this should be changed to handle Oauth2 via the UI or to use a service account.
    this.logger.debug('Bootstrapping GoogleProvider');
    const cfg = this.dataProvider.KeyValueConfig;
    this.oauth2Client = new OAuth2(
      cfg.GOOGLE_CLIENTID,
      cfg.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground',
    );
    if (cfg.GOOGLE_REFRESH_TOKEN && cfg.EMAIL_ADDRESS) {
      this.logger.debug({ refreshToken: cfg.GOOGLE_REFRESH_TOKEN }, 'Got refresh token from DB config');
      this.oauth2Client.setCredentials({
        refresh_token: cfg.GOOGLE_REFRESH_TOKEN,
      });
      await this.RefreshAccessToken();
      this.logger.debug({ email: cfg.EMAIL_ADDRESS }, 'Got EMAIL_ADDRESS from DB config');
      this.smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: cfg.EMAIL_ADDRESS,
          clientId: cfg.GOOGLE_CLIENTID,
          clientSecret: cfg.GOOGLE_CLIENT_SECRET,
          refreshToken: cfg.GOOGLE_REFRESH_TOKEN,
        },
      });
      this.smtpTransport.set('oauth2_provision_cb', (_user, renew, callback) => {
        if (renew) {
          void this.RefreshAccessToken();
        }
        if (!this.accessToken) {
          this.logger.error('Fucked up the access token situation!');
          callback(new Error('Done fukt up.'));
          return;
        } else {
          this.logger.info({ accessToken: this.accessToken }, 'Access token');
          callback(null, this.accessToken);
          return;
        }
      });
    } else {
      this.logger.warn('CANT DO IT BRO');
    }
    this.logger.info('Finished Bootstrap of GoogleProvider');
  };

  get AccessToken() {
    return this.accessToken;
  }

  SendEmail = async (
    from: string | Mail.Address,
    to: string | Mail.Address,
    subject: string,
    replyto: string,
    htmlbody: string,
    attachments: Mail.Attachment[] = [],
    retry = 0,
    max_retry = 5,
  ) => {
    const mailOptions: Mail.Options = {
      from: from,
      to: to,
      subject: subject,
      replyTo: replyto,
      html: htmlbody,
      attachments,
    };
    const call_fxn = async () => {
      try {
        const res = await this.smtpTransport.sendMail(mailOptions);
        this.logger.debug({ subject, to }, 'Sent mail');
        return res;
      } catch (error: unknown) {
        this.logger.error({ err: error, mailOptions }, 'Email not sent');
        //this.#smtpTransport.close(); not sure if this is needed or not?
        throw error;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  CreateCalendarEvent = async (
    eventJson: calendar_v3.Schema$Event,
    retry = 0,
    max_retry = 5,
  ): Promise<calendar_v3.Schema$Event | undefined> => {
    const call_fxn = async (): Promise<calendar_v3.Schema$Event | undefined> => {
      try {
        const event = await this.calendarAPI.events.insert({
          auth: this.oauth2Client,
          calendarId: 'primary',
          requestBody: eventJson,
        });
        this.logger.debug({ event }, 'Created event');
        // event.data is the event object
        return event.data;
      } catch (err: unknown) {
        this.logger.error({ eventJson }, 'Event not created');
        this.logger.error({ err }, 'Event creation failed');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  DeleteCalendarEvent = async (eventId: string, retry = 0, max_retry = 5) => {
    const call_fxn = async () => {
      try {
        await this.calendarAPI.events.delete({
          auth: this.oauth2Client,
          calendarId: 'primary',
          eventId: eventId,
        });
        this.logger.debug({ eventId }, 'Deleted event');
        return true;
      } catch (err: unknown) {
        this.logger.error({ err }, 'Event not deleted');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  ModifyCalendarEvent = async (
    eventId: string,
    sparseEvent: Partial<Omit<calendar_v3.Schema$Event, 'id'>>,
    retry = 0,
    max_retry = 5,
  ): Promise<calendar_v3.Schema$Event | undefined> => {
    const call_fxn = async (): Promise<calendar_v3.Schema$Event | undefined> => {
      try {
        const response = await this.calendarAPI.events.patch({
          auth: this.oauth2Client,
          calendarId: 'primary',
          eventId: eventId,
          requestBody: sparseEvent,
        });
        this.logger.debug({ eventId, sparseEvent }, 'Patched event');
        // response.data is the event object
        return response.data;
      } catch (err: unknown) {
        this.logger.error({ err }, 'Event not updated');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  GetEventsForDate = async (min_date: string, max_date: string, tz: string, retry = 0, max_retry = 5) => {
    const call_fxn = async () => {
      try {
        const response = await this.calendarAPI.events.list({
          auth: this.oauth2Client,
          calendarId: 'primary',
          timeMin: min_date,
          timeMax: max_date,
          timeZone: tz,
          maxResults: 2500,
        });
        return response.data.items;
      } catch (err: unknown) {
        this.logger.error({ err }, 'Unable to get events for date');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  AppendToSheet = async (sheetId: string, range: string, fields: unknown[], retry = 0, max_retry = 5) => {
    const call_fxn = async () => {
      try {
        const response = await this.sheetsAPI.spreadsheets.values.append({
          auth: this.oauth2Client,
          spreadsheetId: sheetId,
          range: range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            majorDimension: 'ROWS',
            values: [fields],
          },
        });
        return response.data;
      } catch (err: unknown) {
        this.logger.error({ err }, 'Unable to append to sheet');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  GetValuesFromSheet = async (sheetId: string, range: string, retry = 0, max_retry = 5) => {
    const call_fxn = async () => {
      try {
        const response = await this.sheetsAPI.spreadsheets.values.get({
          auth: this.oauth2Client,
          spreadsheetId: sheetId,
          range: range,
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING',
          majorDimension: 'ROWS',
        });
        return response.data;
      } catch (err: unknown) {
        this.logger.error({ err }, 'Unable to get values from sheet');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };

  UpdateValuesInSheet = async (sheetId: string, range: string, fields: unknown[], retry = 0, max_retry = 5) => {
    const call_fxn = async () => {
      try {
        const response = await this.sheetsAPI.spreadsheets.values.update({
          auth: this.oauth2Client,
          spreadsheetId: sheetId,
          range: range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            majorDimension: 'ROWS',
            values: [fields],
          },
        });
        return response.data;
      } catch (err: unknown) {
        this.logger.error({ err }, 'Unable to update values in sheet');
        throw err;
      }
    };
    return await ExponentialBackoff(call_fxn, () => true, retry, max_retry, this.logger);
  };
}
