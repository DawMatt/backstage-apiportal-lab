import React, { useState } from 'react';
import { useEntity, EntityRefLink } from '@backstage/plugin-catalog-react';
import { InfoCard, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import {
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@material-ui/core';
import {
  RETIRED,
  compareVersions,
  findLatest,
  getLifecycle,
  getVersion,
  isRetired,
  useApiSiblings,
} from './versionUtils';

function VersionRow({
  sibling,
  isCurrent,
  isLatest,
}: {
  sibling: Entity;
  isCurrent: boolean;
  isLatest: boolean;
}) {
  const [major, minor] = getVersion(sibling);
  const lifecycle = getLifecycle(sibling);
  return (
    <ListItem key={sibling.metadata.name} disableGutters>
      <ListItemText
        primary={
          <Typography
            variant="body2"
            component="span"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {isCurrent ? (
              <strong>
                {sibling.metadata.name} — v{major}.{minor} (this page)
              </strong>
            ) : (
              <EntityRefLink entityRef={sibling}>
                {sibling.metadata.name} — v{major}.{minor}
              </EntityRefLink>
            )}
            {isLatest && <Chip label="Latest" color="primary" size="small" />}
            {lifecycle && (
              <Chip
                label={lifecycle}
                size="small"
                variant={
                  lifecycle === 'deprecated' || lifecycle === RETIRED
                    ? 'default'
                    : 'outlined'
                }
              />
            )}
          </Typography>
        }
      />
    </ListItem>
  );
}

export function ApiVersionsCard() {
  const { entity } = useEntity();
  const { siblings, error } = useApiSiblings(entity);
  const [showRetired, setShowRetired] = useState(false);

  const system = entity.spec?.system as string | undefined;

  if (!system) {
    return (
      <InfoCard title="API Versions">
        <Typography variant="body2" color="textSecondary">
          This API is not part of a System, so no other versions are known.
        </Typography>
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title="API Versions">
        <ResponseErrorPanel error={error} />
      </InfoCard>
    );
  }

  if (!siblings) {
    return (
      <InfoCard title="API Versions">
        <Progress />
      </InfoCard>
    );
  }

  const sorted = [...siblings].sort(compareVersions).reverse();
  const latest = findLatest(siblings);

  // Retired versions are collapsed by default (research.md R4/R5) — still in the catalog,
  // still reachable, just not part of the default view a learner sees first.
  const active = sorted.filter(sibling => !isRetired(sibling));
  const retired = sorted.filter(sibling => isRetired(sibling));

  return (
    <InfoCard title="API Versions">
      <List dense>
        {active.map(sibling => (
          <VersionRow
            key={sibling.metadata.name}
            sibling={sibling}
            isCurrent={sibling.metadata.name === entity.metadata.name}
            isLatest={latest?.metadata.name === sibling.metadata.name}
          />
        ))}
        {retired.length > 0 && showRetired &&
          retired.map(sibling => (
            <VersionRow
              key={sibling.metadata.name}
              sibling={sibling}
              isCurrent={sibling.metadata.name === entity.metadata.name}
              isLatest={latest?.metadata.name === sibling.metadata.name}
            />
          ))}
      </List>
      {retired.length > 0 && (
        <Button size="small" onClick={() => setShowRetired(v => !v)}>
          {showRetired
            ? 'Hide retired versions'
            : `Show retired versions (${retired.length})`}
        </Button>
      )}
    </InfoCard>
  );
}
