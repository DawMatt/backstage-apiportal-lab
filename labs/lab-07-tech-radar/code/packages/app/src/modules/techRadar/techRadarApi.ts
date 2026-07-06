import {
  TechRadarApi,
} from '@backstage-community/plugin-tech-radar';
import {
  TechRadarLoaderResponse,
  TechRadarLoaderResponseParser,
} from '@backstage-community/plugin-tech-radar-common';
import radarData from './radarData.json';

// The radar's actual content lives entirely in radarData.json (research.md R2) — this class is
// fixed plumbing, not something a learner edits to change what appears on the radar. Reusing the
// plugin's own TechRadarLoaderResponseParser (the same schema its optional backend loader uses)
// means a malformed radarData.json fails loudly here, before it ever reaches the plugin's UI.
export class StaticTechRadarApi implements TechRadarApi {
  async load(): Promise<TechRadarLoaderResponse> {
    return TechRadarLoaderResponseParser.parse(radarData);
  }
}
