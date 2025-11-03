import * as React from 'react';
import styles from './MyProductivity.module.scss';
import type { IMyProductivityProps } from './IMyProductivityProps';
import { escape } from '@microsoft/sp-lodash-subset';
import { Pivot, PivotItem } from '@fluentui/react';
import { CalendarTab } from './tabs/CalendarTab';
import { EmailTab } from './tabs/EmailTab';
import { ProductionStatsTab } from './tabs/ProductionStatsTab';
import { ProductionItemsTab } from './tabs/ProductionItemsTab';
import { CustomersTab } from './tabs/CustomersTab';

export default class MyProductivity extends React.Component<IMyProductivityProps> {
  public render(): React.ReactElement<IMyProductivityProps> {
    const {
      userDisplayName,
      hasTeamsContext,
      context,
      graphService,
      productivityService
    } = this.props;

    return (
      <section className={`${styles.myProductivity} ${hasTeamsContext ? styles.teams : ''}`}>
        <div className={styles.header}>
          <h2>🚀 Dashboard di Produttività</h2>
          <div className={styles.userInfo}>Ciao, {escape(userDisplayName)}!</div>
        </div>

        <Pivot aria-label="Productivity Dashboard Tabs" className={styles.pivot}>
          <PivotItem 
            headerText="📅 Calendario" 
            itemKey="calendar"
            itemIcon="Calendar"
          >
            <CalendarTab context={context} graphService={graphService} />
          </PivotItem>

          <PivotItem 
            headerText="📧 Email" 
            itemKey="email"
            itemIcon="Mail"
          >
            <EmailTab context={context} graphService={graphService} />
          </PivotItem>

          <PivotItem 
            headerText="📊 Produzione" 
            itemKey="production"
            itemIcon="BarChartVertical"
          >
            <ProductionStatsTab 
              context={context} 
              productivityService={productivityService} 
            />
          </PivotItem>

          <PivotItem 
            headerText="📦 Articoli Produzione" 
            itemKey="productionItems"
            itemIcon="ProductList"
          >
            <ProductionItemsTab 
              context={context} 
              productivityService={productivityService} 
            />
          </PivotItem>

          <PivotItem 
            headerText="👥 Clienti" 
            itemKey="customers"
            itemIcon="People"
          >
            <CustomersTab 
              context={context} 
              productivityService={productivityService} 
            />
          </PivotItem>
        </Pivot>
      </section>
    );
  }
}
