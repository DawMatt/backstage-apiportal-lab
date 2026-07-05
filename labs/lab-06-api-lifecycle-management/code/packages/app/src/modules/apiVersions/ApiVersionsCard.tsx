import React, { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  useEntity,
  EntityRefLink,
} from '@backstage/plugin-catalog-react';
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

const VERSION_ANNOTATION = 'apiportal.io/version';
const RETIRED = 'retired';

function getVersion(entity: Entity): [number, number] {
  const raw = entity.metadata.annotations?.[VERSION_ANNOTATION];
  const [major, minor] = (raw ?? '0.0').split('.').map(Number);
  return [major || 0, minor || 0];
}

function isRetired(entity: Entity): boolean {
  return entity.spec?.lifecycle === RETIRED;
}

function getLifecycle(entity: Entity): string | undefined {
  return entity.spec?.lifecycle as string | undefined;
}

function compareVersions(a: Entity, b: Entity): number {
  const [aMajor, aMinor] = getVersion(a);
  const [bMajor, bMinor] = getVersion(b);
  return aMajor !== bMajor ? aMajor - bMajor : aMinor - bMinor;
}

// "Latest" is computed from every sibling's version annotation, not manually flagged, to
// avoid two versions ever claiming "latest" at once (research.md R2). Prefer the highest
// non-retired version; if every sibling is retired, fall back to the highest overall
// (spec.md edge case: no current version at all).
function findLatest(siblings: Entity[]): Entity | undefined {
  const active = siblings.filter(s => !isRetired(s));
  const pool = active.length > 0 ? active : siblings;
  return [...pool].sort(compareVersions).pop();
}

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
  const catalogApi = useApi(catalogApiRef);
  const [siblings, setSiblings] = useState<Entity[]>();
  const [error, setError] = useState<Error>();
  const [showRetired, setShowRetired] = useState(false);

  const system = entity.spec?.system as string | undefined;

  useEffect(() => {
    if (!system) {
      setSiblings([]);
      return;
    }
    catalogApi
      .getEntities({
        filter: {
          kind: 'API',
          'spec.system': system,
        },
      })
      .then(response => setSiblings(response.items))
      .catch(setError);
  }, [catalogApi, system]);

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
