import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ProductivityApiService, IProductionItem } from '../../../../services/ProductivityApiService';
import { Spinner, SpinnerSize, MessageBar, MessageBarType, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react';
import styles from './Tabs.module.scss';

export interface IProductionItemsTabProps {
  context: WebPartContext;
  productivityService: ProductivityApiService;
}

export const ProductionItemsTab: React.FC<IProductionItemsTabProps> = ({ context, productivityService }) => {
  const [items, setItems] = React.useState<IProductionItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');

  const columns: IColumn[] = [
    {
      key: 'itemCode',
      name: 'Codice',
      fieldName: 'itemCode',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true
    },
    {
      key: 'productName',
      name: 'Prodotto',
      fieldName: 'productName',
      minWidth: 150,
      maxWidth: 250,
      isResizable: true
    },
    {
      key: 'quantity',
      name: 'Quantità',
      fieldName: 'quantity',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: IProductionItem) => <span>{item.quantity.toLocaleString()}</span>
    },
    {
      key: 'productionDate',
      name: 'Data Produzione',
      fieldName: 'productionDate',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: IProductionItem) => {
        const date = new Date(item.productionDate);
        return <span>{date.toLocaleDateString('it-IT')}</span>;
      }
    },
    {
      key: 'status',
      name: 'Stato',
      fieldName: 'status',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: IProductionItem) => {
        const statusColors: { [key: string]: string } = {
          'Completed': '#107c10',
          'In Progress': '#ff8c00',
          'Pending': '#d13438'
        };
        return (
          <span style={{ 
            color: statusColors[item.status] || '#000',
            fontWeight: 600 
          }}>
            {item.status}
          </span>
        );
      }
    }
  ];

  const loadItems = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const data = await productivityService.getProductionItems(context);
      console.log('[ProductionItemsTab] Items loaded:', data);
      setItems(data);
    } catch (err) {
      console.error('[ProductionItemsTab] Error loading items:', err);
      setError(err.message || 'Errore nel caricamento degli articoli di produzione');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadItems();
  }, []);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <Spinner size={SpinnerSize.large} label="Caricamento articoli di produzione..." />
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
        ✅ {items.length} articoli caricati da APIM
      </MessageBar>
      
      <div style={{ marginTop: '20px' }}>
        <DetailsList
          items={items}
          columns={columns}
          selectionMode={SelectionMode.none}
          layoutMode={DetailsListLayoutMode.justified}
          isHeaderVisible={true}
        />
      </div>
    </div>
  );
};
