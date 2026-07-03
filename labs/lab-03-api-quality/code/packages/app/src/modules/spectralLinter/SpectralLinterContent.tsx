import React, { useEffect, useState } from 'react';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { useEntity, useEntityOwnership } from '@backstage/plugin-catalog-react';
import { EntityApiDocsSpectralLinterContent } from '@dweber019/backstage-plugin-api-docs-spectral-linter/dist/components/EntityApiDocsSpectralLinterContent/index.esm.js';
import { InfoCard } from '@backstage/core-components';
import { Typography } from '@material-ui/core';

export function SpectralLinterContent() {
  const { entity } = useEntity();
  const identityApi = useApi(identityApiRef);
  const { isOwnedEntity, loading: ownershipLoading } = useEntityOwnership();
  const [isPlatformTeamMember, setIsPlatformTeamMember] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(true);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setIsPlatformTeamMember(
        identity.ownershipEntityRefs.includes('group:default/platform-team'),
      );
      setIdentityLoading(false);
    });
  }, [identityApi]);

  if (ownershipLoading || identityLoading) return null;

  // `isOwnedEntity` from useEntityOwnership() is a per-entity predicate
  // FUNCTION, not a boolean — it must be called with the current entity.
  if (!isOwnedEntity(entity) && !isPlatformTeamMember) {
    return (
      <InfoCard title="Spectral Linter">
        <Typography variant="body2" color="textSecondary">
          Detailed quality information is restricted to members of the API's owning team
          and the platform team. Sign in as a member of the owning team or the platform
          team to view linting results.
        </Typography>
      </InfoCard>
    );
  }

  return <EntityApiDocsSpectralLinterContent />;
}
