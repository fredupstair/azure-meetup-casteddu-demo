import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ProductivityApiService } from '../../../../services/ProductivityApiService';
import styles from './Tabs.module.scss';

export interface ICustomersTabProps {
  context: WebPartContext;
  productivityService: ProductivityApiService;
}

export const CustomersTab: React.FC<ICustomersTabProps> = ({ context, productivityService }) => {
  return (
    <div className={styles.tabContent}>
      <h3>👥 Clienti Recenti</h3>
      <MessageBar messageBarType={MessageBarType.info}>
        🚧 Questa funzionalità verrà implementata successivamente con integrazione Azure API Management.
      </MessageBar>
      <div className={styles.placeholder}>
        <p>Qui visualizzeremo gli ultimi 3 clienti:</p>
        <ul>
          <li>Codice cliente</li>
          <li>Nome cliente</li>
          <li>Data ultimo ordine</li>
          <li>Totale ordini</li>
          <li>Località</li>
        </ul>
      </div>
    </div>
  );
};
