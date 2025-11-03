import * as React from 'react';
import { Spinner, SpinnerSize, MessageBar, MessageBarType, List, Icon } from '@fluentui/react';
import { GraphService, IEmailMessage } from '../../../../services/GraphService';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import styles from './Tabs.module.scss';

export interface IEmailTabProps {
  context: WebPartContext;
  graphService: GraphService;
}

export const EmailTab: React.FC<IEmailTabProps> = ({ context, graphService }) => {
  const [emails, setEmails] = React.useState<IEmailMessage[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await graphService.getUnreadEmails();
      setEmails(data);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load emails';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('Access is denied')) {
        setError('Permesso Mail.Read non disponibile o mailbox non configurata. Verifica i permessi API in SharePoint Admin Center.');
      } else {
        setError(errorMessage);
      }
      console.error('Email error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minuti fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ore fa`;
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else {
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const onRenderCell = (item: IEmailMessage, index: number | undefined): JSX.Element => {
    return (
      <div className={styles.listItem}>
        <div className={styles.itemIcon}>
          <Icon iconName="Mail" />
        </div>
        <div className={styles.itemContent}>
          <div className={styles.itemTitle}>{item.subject}</div>
          <div className={styles.itemDetails}>
            <Icon iconName="Contact" className={styles.detailIcon} />
            {item.from.emailAddress.name}
          </div>
          <div className={styles.itemDetails}>
            <Icon iconName="Clock" className={styles.detailIcon} />
            {formatDateTime(item.receivedDateTime)}
          </div>
          <div className={styles.itemPreview}>{item.bodyPreview}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.centerContent}>
        <Spinner size={SpinnerSize.large} label="Caricamento email..." />
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

  if (emails.length === 0) {
    return (
      <MessageBar messageBarType={MessageBarType.success}>
        ✅ Nessuna email non letta. Ottimo lavoro!
      </MessageBar>
    );
  }

  return (
    <div className={styles.tabContent}>
      <h3>📧 Email Non Lette ({emails.length})</h3>
      <List items={emails} onRenderCell={onRenderCell} />
    </div>
  );
};
