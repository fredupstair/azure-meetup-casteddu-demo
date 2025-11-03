import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'MyProductivityWebPartStrings';
import MyProductivity from './components/MyProductivity';
import { IMyProductivityProps } from './components/IMyProductivityProps';
import { GraphService } from '../../services/GraphService';
import { ProductivityApiService } from '../../services/ProductivityApiService';

export interface IMyProductivityWebPartProps {
  description: string;
  apiBaseUrl: string;
  apiResourceUri: string;
}

export default class MyProductivityWebPart extends BaseClientSideWebPart<IMyProductivityWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';
  private _graphService: GraphService;
  private _productivityService: ProductivityApiService;

  public render(): void {
    const element: React.ReactElement<IMyProductivityProps> = React.createElement(
      MyProductivity,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        context: this.context,
        graphService: this._graphService,
        productivityService: this._productivityService
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    // Initialize services
    this._graphService = new GraphService(this.context);
    
    // Default values for Azure API (can be configured via web part properties)
    const apiBaseUrl = this.properties.apiBaseUrl || 'https://prodcasteddu-apim-demo.azure-api.net/productivity';
    const apiResourceUri = this.properties.apiResourceUri || 'api://4543e176-c20a-4904-bed3-49463d757c4f';
    
    this._productivityService = new ProductivityApiService(apiBaseUrl, apiResourceUri);

    return this._getEnvironmentMessage().then(message => {
      this._environmentMessage = message;
    });
  }



  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) { // running in Teams, office.com or Outlook
      return this.context.sdks.microsoftTeams.teamsJs.app.getContext()
        .then(context => {
          let environmentMessage: string = '';
          switch (context.app.host.name) {
            case 'Office': // running in Office
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOffice : strings.AppOfficeEnvironment;
              break;
            case 'Outlook': // running in Outlook
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOutlook : strings.AppOutlookEnvironment;
              break;
            case 'Teams': // running in Teams
            case 'TeamsModern':
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
              break;
            default:
              environmentMessage = strings.UnknownEnvironment;
          }

          return environmentMessage;
        });
    }

    return Promise.resolve(this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            },
            {
              groupName: 'Configurazione Azure API',
              groupFields: [
                PropertyPaneTextField('apiBaseUrl', {
                  label: 'API Base URL',
                  description: 'URL base dell\'API Management (es: https://your-apim.azure-api.net/productivity)',
                  placeholder: 'https://prodcasteddu-apim-demo.azure-api.net/productivity'
                }),
                PropertyPaneTextField('apiResourceUri', {
                  label: 'API Resource URI',
                  description: 'Application ID URI dell\'API (es: api://client-id)',
                  placeholder: 'api://4543e176-c20a-4904-bed3-49463d757c4f'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
