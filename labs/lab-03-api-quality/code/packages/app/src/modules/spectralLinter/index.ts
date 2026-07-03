import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { convertLegacyPlugin } from '@backstage/core-compat-api';
import { apiDocsSpectralLinterPlugin } from '@dweber019/backstage-plugin-api-docs-spectral-linter';
import React from 'react';
import { SpectralLinterContent } from './SpectralLinterContent';

const spectralLinterContent = EntityContentBlueprint.make({
  name: 'spectral-linter',
  params: {
    defaultPath: '/spectral',
    defaultTitle: 'Spectral',
    filter: 'kind:API',
    loader: async () => React.createElement(SpectralLinterContent),
  },
});

export const spectralLinterModule = createFrontendModule({
  pluginId: 'catalog',
  extensions: [spectralLinterContent],
});

// Registers the plugin's linterApiRef (backed by its LinterClient) with the new frontend
// system's API registry. `extensions: []` means we deliberately do NOT bring in the
// plugin's own page/route extensions — we only need its API, since Step 8's unwrapped
// component looks up `linterApiRef` via the ambient `useApi` context, not via a prop.
export const spectralLinterApiPlugin = convertLegacyPlugin(apiDocsSpectralLinterPlugin, {
  extensions: [],
});
