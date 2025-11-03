import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ProductivityApiService } from '../../../../services/ProductivityApiService';
import styles from './Tabs.module.scss';

export interface IProductionStatsTabProps {
  context: WebPartContext;
  productivityService: ProductivityApiService;
}

export const ProductionStatsTab: React.FC<IProductionStatsTabProps> = ({ context, productivityService }) => {
  return (
    <div className={styles.tabContent}>
      <h3>📊 Statistiche Produzione</h3>
      <MessageBar messageBarType={MessageBarType.info}>
        🚧 Questa funzionalità verrà implementata successivamente con integrazione Azure API Management.
      </MessageBar>
      <div className={styles.placeholder}>
        <p>Qui visualizzeremo:</p>
        <ul>
          <li>Pezzi totali prodotti</li>
          <li>Velocità media di produzione</li>
          <li>Efficienza percentuale</li>
          <li>Ultimo aggiornamento</li>
        </ul>
      </div>
    </div>
  );
};
