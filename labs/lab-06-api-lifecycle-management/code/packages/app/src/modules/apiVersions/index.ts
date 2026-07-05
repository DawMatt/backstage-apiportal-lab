import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiVersionsCard } from './ApiVersionsCard';

const apiVersionsCard = EntityCardBlueprint.make({
  name: 'api-versions',
  params: {
    filter: 'kind:API',
    type: 'info',
    loader: async () => React.createElement(ApiVersionsCard),
  },
});

export const apiVersionsModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiVersionsCard],
});
