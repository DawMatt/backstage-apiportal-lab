import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';
import React from 'react';
import { ApiVersionsCard } from './ApiVersionsCard';
import { ApiLifecycleBanner } from './ApiLifecycleBanner';

const apiVersionsCard = EntityCardBlueprint.make({
  name: 'api-versions',
  params: {
    filter: 'kind:API',
    type: 'info',
    loader: async () => React.createElement(ApiVersionsCard),
  },
});

// A 'content' card, not 'info' — it renders in the main content column (alongside the About
// card) instead of the sidebar, so a deprecated/retired version is hard to miss. Renders
// nothing for any other lifecycle value.
const apiLifecycleBanner = EntityCardBlueprint.make({
  name: 'api-lifecycle-banner',
  params: {
    filter: 'kind:API',
    type: 'content',
    loader: async () => React.createElement(ApiLifecycleBanner),
  },
});

export const apiVersionsModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [apiVersionsCard, apiLifecycleBanner],
});
