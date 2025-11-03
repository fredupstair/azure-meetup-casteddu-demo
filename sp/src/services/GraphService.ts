import { MSGraphClientV3 } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface ICalendarEvent {
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  organizer?: {
    emailAddress: {
      name: string;
    };
  };
  webLink?: string;
}

export interface IEmailMessage {
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
}

export class GraphService {
  private graphClient: MSGraphClientV3;

  constructor(private context: WebPartContext) {}

  private async ensureGraphClient(): Promise<MSGraphClientV3> {
    if (!this.graphClient) {
      this.graphClient = await this.context.msGraphClientFactory.getClient('3');
    }
    return this.graphClient;
  }

  /**
   * Get upcoming calendar events (next 5)
   */
  public async getUpcomingEvents(): Promise<ICalendarEvent[]> {
    try {
      const client = await this.ensureGraphClient();
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days
      const response = await client
        .api('/me/calendarView')
        .version('v1.0')
        .select('subject,start,end,location,organizer,webLink')
        .orderby('start/dateTime')
        .query({
          startDateTime: now.toISOString(),
          endDateTime: endDate.toISOString()
        })
        .top(5)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to load calendar events');
    }
  }

  /**
   * Get unread emails (last 5)
   */
  public async getUnreadEmails(): Promise<IEmailMessage[]> {
    try {
      const client = await this.ensureGraphClient();

      const response = await client
        .api('/me/messages')
        .version('v1.0')
        .select('subject,from,receivedDateTime,bodyPreview,isRead')
        .filter('isRead eq false')
        .orderby('receivedDateTime desc')
        .top(5)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Failed to load emails');
    }
  }
}
