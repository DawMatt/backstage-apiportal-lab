import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

export const VERSION_ANNOTATION = 'apiportal.io/version';
export const RETIRED = 'retired';
export const DEPRECATED = 'deprecated';

export function getVersion(entity: Entity): [number, number] {
  const raw = entity.metadata.annotations?.[VERSION_ANNOTATION];
  const [major, minor] = (raw ?? '0.0').split('.').map(Number);
  return [major || 0, minor || 0];
}

export function isRetired(entity: Entity): boolean {
  return entity.spec?.lifecycle === RETIRED;
}

export function getLifecycle(entity: Entity): string | undefined {
  return entity.spec?.lifecycle as string | undefined;
}

export function compareVersions(a: Entity, b: Entity): number {
  const [aMajor, aMinor] = getVersion(a);
  const [bMajor, bMinor] = getVersion(b);
  return aMajor !== bMajor ? aMajor - bMajor : aMinor - bMinor;
}

// "Latest" is computed from every sibling's version annotation, not manually flagged, to
// avoid two versions ever claiming "latest" at once (research.md R2). Prefer the highest
// non-retired version; if every sibling is retired, fall back to the highest overall
// (spec.md edge case: no current version at all).
export function findLatest(siblings: Entity[]): Entity | undefined {
  const active = siblings.filter(s => !isRetired(s));
  const pool = active.length > 0 ? active : siblings;
  return [...pool].sort(compareVersions).pop();
}

// Shared by the Versions card and the deprecated/retired banner so both agree on the same
// sibling set and the same "latest" computation (research.md R2).
export function useApiSiblings(entity: Entity): {
  siblings: Entity[] | undefined;
  error: Error | undefined;
} {
  const catalogApi = useApi(catalogApiRef);
  const [siblings, setSiblings] = useState<Entity[]>();
  const [error, setError] = useState<Error>();

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

  return { siblings, error };
}
