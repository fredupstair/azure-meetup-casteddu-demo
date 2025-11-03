import * as React from 'react';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ProductivityApiService, IProductionStats } from '../../../../services/ProductivityApiService';
import styles from './Tabs.module.scss';

export interface IProductionStatsTabProps {
  context: WebPartContext;
  productivityService: ProductivityApiService;
}

export const ProductionStatsTab: React.FC<IProductionStatsTabProps> = ({ context, productivityService }) => {
  const [stats, setStats] = React.useState<IProductionStats | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await productivityService.getProductionStats(context);
      setStats(data);
    } catch (err) {
      setError(err.message || 'Errore durante il caricamento delle statistiche');
      console.error('Error loading production stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <h3>📊 Statistiche Produzione</h3>
      
      {loading && (
        <Spinner size={SpinnerSize.large} label="Caricamento dati da Azure API..." />
      )}

      {error && (
        <MessageBar messageBarType={MessageBarType.error} isMultiline>
          <strong>Errore:</strong> {error}
        </MessageBar>
      )}

      {!loading && !error && stats && (
        <div className={styles.statsContainer}>
          <MessageBar messageBarType={MessageBarType.success}>
            ✅ Dati caricati correttamente da APIM
          </MessageBar>
          
          <div className={styles.debugOutput}>
            <h4>🔍 Debug - Dati ricevuti dall'API:</h4>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '15px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(stats, null, 2)}
            </pre>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Data</div>
              <div className={styles.statValue}>{stats.date}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Pezzi Prodotti</div>
              <div className={styles.statValue}>{stats.totalPiecesProduced}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Velocità Media</div>
              <div className={styles.statValue}>{stats.averageProductionSpeed} pz/h</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Efficienza</div>
              <div className={styles.statValue}>{stats.efficiency}%</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Ultimo Aggiornamento</div>
              <div className={styles.statValue}>{new Date(stats.lastUpdated).toLocaleString('it-IT')}</div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !stats && (
        <MessageBar messageBarType={MessageBarType.info}>
          Nessun dato disponibile
        </MessageBar>
      )}
    </div>
  );
};
