import { FetchResponse, getBackendSrv } from '@grafana/runtime';
import { getLogAnalyticsResourcePickerApiRoute } from '../api/routes';
import { ResourceRowType, ResourceRow, ResourceRowGroup } from '../components/ResourcePicker/types';
import { getAzureCloud } from '../credentials';
import {
  AzureDataSourceInstanceSettings,
  AzureGraphResponse,
  AzureResourceSummaryItem,
  RawAzureResourceGroupItem,
  RawAzureResourceItem,
} from '../types';
import { SUPPORTED_LOCATIONS, SUPPORTED_RESOURCE_TYPES } from './supportedResources';

const RESOURCE_GRAPH_URL = '/providers/Microsoft.ResourceGraph/resources?api-version=2020-04-01-preview';

export default class ResourcePickerData {
  private proxyUrl: string;
  private cloud: string;

  constructor(instanceSettings: AzureDataSourceInstanceSettings) {
    this.proxyUrl = instanceSettings.url!;
    this.cloud = getAzureCloud(instanceSettings);
  }

  async getResourcePickerData() {
    const query = `
      resources
        // Put subscription details on each row
        | join kind=leftouter (
          ResourceContainers
            | where type == 'microsoft.resources/subscriptions'
            | project subscriptionName=name, subscriptionURI=id, subscriptionId
          ) on subscriptionId

        // Put resource group details on each row
        | join kind=leftouter (
          ResourceContainers
            | where type == 'microsoft.resources/subscriptions/resourcegroups'
            | project resourceGroupURI=id, resourceGroupName=name, resourceGroup
          ) on resourceGroup

        | where type in (${SUPPORTED_RESOURCE_TYPES})

        // Get only unique resource groups and subscriptions. Also acts like a project
        | summarize count() by resourceGroupName, resourceGroupURI, subscriptionName, subscriptionURI
        | order by subscriptionURI asc
    `;

    const { ok, data: response } = await this.makeResourceGraphRequest<RawAzureResourceGroupItem[]>(query);

    // TODO: figure out desired error handling strategy
    if (!ok) {
      throw new Error('unable to fetch resource containers');
    }

    return formatResourceGroupData(response.data);
  }

  async getResourcesForResourceGroup(resourceGroup: ResourceRow) {
    const { ok, data: response } = await this.makeResourceGraphRequest<RawAzureResourceItem[]>(`
      resources
      | where id hasprefix "${resourceGroup.id}"
      | where type in (${SUPPORTED_RESOURCE_TYPES}) and location in (${SUPPORTED_LOCATIONS})
    `);

    // TODO: figure out desired error handling strategy
    if (!ok) {
      throw new Error('unable to fetch resource containers');
    }

    return formatResourceGroupChildren(response.data);
  }

  async getResource(resourceURI: string) {
    const query = `
      resources
        | join (
            resourcecontainers
              | where type == "microsoft.resources/subscriptions"
              | project subscriptionName=name, subscriptionId
          ) on subscriptionId
        | join (
            resourcecontainers
              | where type == "microsoft.resources/subscriptions/resourcegroups"
              | project resourceGroupName=name, resourceGroup
          ) on resourceGroup
        | where id == "${resourceURI}"
        | project id, name, subscriptionName, resourceGroupName
    `;

    const { ok, data: response } = await this.makeResourceGraphRequest<AzureResourceSummaryItem[]>(query);

    if (!ok || !response.data[0]) {
      throw new Error('unable to fetch resource details');
    }

    return response.data[0];
  }

  async getResourceURIFromWorkspace(workspace: string) {
    const { ok, data: response } = await this.makeResourceGraphRequest<RawAzureResourceItem[]>(`
      resources
      | where properties['customerId'] == "${workspace}"
      | project id
    `);

    // TODO: figure out desired error handling strategy
    if (!ok) {
      throw new Error('unable to fetch resource containers');
    }

    if (!response.data.length) {
      throw new Error('unable to find resource for workspace ' + workspace);
    }

    return response.data[0].id;
  }

  async makeResourceGraphRequest<T = unknown>(
    query: string,
    maxRetries = 1
  ): Promise<FetchResponse<AzureGraphResponse<T>>> {
    try {
      return await getBackendSrv()
        .fetch<AzureGraphResponse<T>>({
          url: this.proxyUrl + '/' + getLogAnalyticsResourcePickerApiRoute(this.cloud) + RESOURCE_GRAPH_URL,
          method: 'POST',
          data: {
            query: query,
            options: {
              resultFormat: 'objectArray',
            },
          },
        })
        .toPromise();
    } catch (error) {
      if (maxRetries > 0) {
        return this.makeResourceGraphRequest(query, maxRetries - 1);
      }

      throw error;
    }
  }
}

function formatResourceGroupData(rawData: RawAzureResourceGroupItem[]) {
  // Subscriptions goes into the top level array
  const rows: ResourceRowGroup = [];

  // Array of all the resource groups, with subscription data on each row
  for (const row of rawData) {
    const resourceGroupRow: ResourceRow = {
      name: row.resourceGroupName,
      id: row.resourceGroupURI,
      type: ResourceRowType.ResourceGroup,
      typeLabel: 'Resource Group',
      children: [],
    };

    const subscription = rows.find((v) => v.id === row.subscriptionURI);

    if (subscription) {
      if (!subscription.children) {
        subscription.children = [];
      }

      subscription.children.push(resourceGroupRow);
    } else {
      const newSubscriptionRow = {
        name: row.subscriptionName,
        id: row.subscriptionURI,
        typeLabel: 'Subscription',
        type: ResourceRowType.Subscription,
        children: [resourceGroupRow],
      };

      rows.push(newSubscriptionRow);
    }
  }

  return rows;
}

function formatResourceGroupChildren(rawData: RawAzureResourceItem[]): ResourceRowGroup {
  return rawData.map((item) => ({
    name: item.name,
    id: item.id,
    resourceGroupName: item.resourceGroup,
    type: ResourceRowType.Resource,
    typeLabel: item.type, // TODO: these types can be quite long, we may wish to format them more
    location: item.location, // TODO: we may wish to format these locations, by default they are written as 'northeurope' rather than a more human readable "North Europe"
  }));
}
