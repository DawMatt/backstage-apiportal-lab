import React from 'react';
import { useEntity, EntityRefLink } from '@backstage/plugin-catalog-react';
import { WarningPanel } from '@backstage/core-components';
import {
  DEPRECATED,
  RETIRED,
  findLatest,
  getLifecycle,
  useApiSiblings,
} from './versionUtils';

// A loud, main-content-area warning for deprecated/retired API versions — the sidebar
// Versions card exists too, but it's easy to miss, so this makes the two "don't use this"
// states impossible to overlook when a learner (or a real API consumer) lands on the page.
export function ApiLifecycleBanner() {
  const { entity } = useEntity();
  const { siblings } = useApiSiblings(entity);
  const lifecycle = getLifecycle(entity);

  if (lifecycle !== DEPRECATED && lifecycle !== RETIRED) {
    return null;
  }

  const latest = siblings && findLatest(siblings);
  const latestIsSelf = latest?.metadata.name === entity.metadata.name;

  const severity = lifecycle === RETIRED ? 'error' : 'warning';
  const verb = lifecycle === RETIRED ? 'has been retired' : 'is deprecated';
  const title = lifecycle === RETIRED ? 'This API is retired' : 'This API is deprecated';

  return (
    <div style={{ width: '100%' }}>
      <WarningPanel severity={severity} title={title} defaultExpanded>
        This API version {verb} and should not be used for new integrations.
        {latest && !latestIsSelf ? (
          <>
            {' '}
            Use{' '}
            <EntityRefLink entityRef={latest}>
              {latest.metadata.name}
            </EntityRefLink>{' '}
            instead.
          </>
        ) : null}
      </WarningPanel>
    </div>
  );
}
