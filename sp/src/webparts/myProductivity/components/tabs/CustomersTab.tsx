import * as React from 'react';
import { MessageBar, MessageBarType, Spinner, SpinnerSize, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ProductivityApiService, ICustomer } from '../../../../services/ProductivityApiService';
import styles from './Tabs.module.scss';

export interface ICustomersTabProps {
  context: WebPartContext;
  productivityService: ProductivityApiService;
}

export const CustomersTab: React.FC<ICustomersTabProps> = ({ context, productivityService }) => {
  const [customers, setCustomers] = React.useState<ICustomer[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');

  const columns: IColumn[] = [
    {
      key: 'customerCode',
      name: 'Codice',
      fieldName: 'customerCode',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true
    },
    {
      key: 'customerName',
      name: 'Cliente',
      fieldName: 'customerName',
      minWidth: 150,
      maxWidth: 250,
      isResizable: true
    },
    {
      key: 'location',
      name: 'Località',
      fieldName: 'location',
      minWidth: 120,
      maxWidth: 180,
      isResizable: true
    },
    {
      key: 'totalOrders',
      name: 'Totale Ordini',
      fieldName: 'totalOrders',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: ICustomer) => <span>{item.totalOrders.toLocaleString()}</span>
    },
    {
      key: 'lastOrderDate',
      name: 'Ultimo Ordine',
      fieldName: 'lastOrderDate',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: ICustomer) => {
        const date = new Date(item.lastOrderDate);
        return <span>{date.toLocaleDateString('it-IT')}</span>;
      }
    }
  ];

  const loadCustomers = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const data = await productivityService.getRecentCustomers(context);
      console.log('[CustomersTab] Customers loaded:', data);
      
      // Handle both response formats: {allUsers: [...], message: '...'} or [...]
      const customers = (data as any).allUsers || data;
      setCustomers(Array.isArray(customers) ? customers : []);
    } catch (err) {
      console.error('[CustomersTab] Error loading customers:', err);
      setError(err.message || 'Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCustomers();
  }, []);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <Spinner size={SpinnerSize.large} label="Caricamento clienti..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.tabContent}>
        <MessageBar messageBarType={MessageBarType.error}>
          {error}
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <MessageBar messageBarType={MessageBarType.success}>
        ✅ {customers.length} clienti recenti caricati da APIM
      </MessageBar>
      
      <div style={{ marginTop: '20px' }}>
        <DetailsList
          items={customers}
          columns={columns}
          selectionMode={SelectionMode.none}
          layoutMode={DetailsListLayoutMode.justified}
          isHeaderVisible={true}
        />
      </div>
    </div>
  );
};
