import { WebPartContext } from '@microsoft/sp-webpart-base';
import { GraphService } from '../../../services/GraphService';
import { ProductivityApiService } from '../../../services/ProductivityApiService';

export interface IMyProductivityProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  context: WebPartContext;
  graphService: GraphService;
  productivityService: ProductivityApiService;
}
