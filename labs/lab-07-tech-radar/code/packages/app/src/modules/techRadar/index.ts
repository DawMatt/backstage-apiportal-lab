import { createFrontendModule } from '@backstage/frontend-plugin-api';
import techRadarPlugin, {
  techRadarApi,
} from '@backstage-community/plugin-tech-radar/alpha';
import { techRadarApiRef } from '@backstage-community/plugin-tech-radar';
import { StaticTechRadarApi } from './techRadarApi';

// The plugin's own default `techRadarApi` extension calls out to the optional
// tech-radar-backend plugin over the network (research.md R1). This lab deliberately does not
// install that backend, so the default API is overridden here with one that resolves the
// committed radarData.json instead — `.override()` replaces the factory in place, keeping the
// same extension id. `techRadarPlugin` itself (the page, routing) is registered unmodified in
// App.tsx; this module only contributes the api override alongside it.
const staticTechRadarApi = techRadarApi.override({
  params: defineParams =>
    defineParams({
      api: techRadarApiRef,
      deps: {},
      factory: () => new StaticTechRadarApi(),
    }),
});

export const techRadarModule = createFrontendModule({
  pluginId: 'tech-radar',
  extensions: [staticTechRadarApi],
});

export { techRadarPlugin };
