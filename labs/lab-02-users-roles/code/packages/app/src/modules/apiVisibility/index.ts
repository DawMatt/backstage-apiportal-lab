import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiVisibilityCard } from './ApiVisibilityCard';

const apiVisibilityCard = EntityCardBlueprint.make({
  name: 'api-visibility',
  params: {
    filter: 'kind:API',
    type: 'info',
    loader: async () => React.createElement(ApiVisibilityCard),
  },
});

export const apiVisibilityModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiVisibilityCard],
});
