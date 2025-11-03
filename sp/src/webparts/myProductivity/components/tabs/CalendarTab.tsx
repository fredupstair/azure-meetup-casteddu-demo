import * as React from 'react';
import { Spinner, SpinnerSize, MessageBar, MessageBarType, List, Icon } from '@fluentui/react';
import { GraphService, ICalendarEvent } from '../../../../services/GraphService';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import styles from './Tabs.module.scss';

export interface ICalendarTabProps {
  context: WebPartContext;
  graphService: GraphService;
}

export const CalendarTab: React.FC<ICalendarTabProps> = ({ context, graphService }) => {
  const [events, setEvents] = React.useState<ICalendarEvent[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadCalendarEvents();
  }, []);

  const loadCalendarEvents = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await graphService.getUpcomingEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Failed to load calendar events');
      console.error('Calendar error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const onRenderCell = (item: ICalendarEvent, index: number | undefined): JSX.Element => {
    return (
      <div className={styles.listItem}>
        <div className={styles.itemIcon}>
          <Icon iconName="Calendar" />
        </div>
        <div className={styles.itemContent}>
          <div className={styles.itemTitle}>
            {item.webLink ? (
              <a href={item.webLink} target="_blank" rel="noopener noreferrer">
                {item.subject}
              </a>
            ) : (
              item.subject
            )}
          </div>
          <div className={styles.itemDetails}>
            <Icon iconName="Clock" className={styles.detailIcon} />
            {formatDateTime(item.start.dateTime)}
          </div>
          {item.location?.displayName && (
            <div className={styles.itemDetails}>
              <Icon iconName="MapPin" className={styles.detailIcon} />
              {item.location.displayName}
            </div>
          )}
          {item.organizer?.emailAddress?.name && (
            <div className={styles.itemDetails}>
              <Icon iconName="Contact" className={styles.detailIcon} />
              {item.organizer.emailAddress.name}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.centerContent}>
        <Spinner size={SpinnerSize.large} label="Caricamento eventi..." />
      </div>
    );
  }

  if (error) {
    return (
      <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
        {error}
      </MessageBar>
    );
  }

  if (events.length === 0) {
    return (
      <MessageBar messageBarType={MessageBarType.info}>
        Nessun evento in calendario nei prossimi giorni.
      </MessageBar>
    );
  }

  return (
    <div className={styles.tabContent}>
      <h3>📅 Prossimi Appuntamenti</h3>
      <List items={events} onRenderCell={onRenderCell} />
    </div>
  );
};
