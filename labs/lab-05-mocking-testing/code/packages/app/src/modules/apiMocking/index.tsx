// Lab 5: Mocking and Testing
//
// Overrides `apiDocsConfigRef` (the same wrapper-module pattern Lab 3 used for `apiGrade` /
// `spectralLinter`) because Backstage's default OpenAPI viewer has no built-in config-level
// toggle for extra "Try it out" target servers or credential pre-fill (confirmed by direct
// inspection of @backstage/plugin-api-docs — see specs/005-lab-5-mocking-testing/research.md R1).
//
// Two things are added to every `openapi`-type API's page, with no per-entity configuration:
//   1. A "Local mock (Lab 5)" server entry pointing at this workspace's single mock gateway
//      (scripts/mock-gateway.mjs), computed purely from `entity.metadata.name`.
//   2. A pre-authorized Swagger UI "Authorize" dialog, using `mocking.defaultCredential`, for
//      any `http`/`bearer` security scheme the spec declares — fully editable/overridable by a
//      learner through that same dialog (research.md R6).
//
// `entity.spec.definition` only ever reaches us as a raw YAML/JSON string (the type signature of
// `ApiDefinitionWidget.component`), so it's parsed here rather than mutated as text. The parsed,
// merged spec is passed through the widget as an *extra* `spec` prop: `OpenApiDefinitionWidget`
// forwards all received props down to `swagger-ui-react`'s own `<SwaggerUI>`, whose `spec` prop
// is spread in *after* its own internal `spec={definitionString}` — so our `spec` object wins
// (confirmed by reading OpenApiDefinition.esm.js's source, not assumed).
import React, { useEffect, useMemo, useState } from 'react';
import * as yaml from 'js-yaml';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ApiBlueprint } from '@backstage/frontend-plugin-api';
import { configApiRef, discoveryApiRef, useApi } from '@backstage/core-plugin-api';
import type { Entity } from '@backstage/catalog-model';
import {
  apiDocsConfigRef,
  defaultDefinitionWidgets,
  OpenApiDefinitionWidget,
  type ApiDocsConfig,
  type ApiDefinitionWidget,
} from '@backstage/plugin-api-docs';

const MOCK_SERVER_DESCRIPTION = 'Local mock (Lab 5)';

interface DefaultCredential {
  scheme: string;
  value: string;
}

/** Every `http`-type security scheme matching the configured default scheme (case-insensitive),
 * keyed by its declared name — Swagger UI's `authorize()` call is keyed the same way. Generic by
 * design: works for any OpenAPI spec that declares a matching scheme, with no per-API mapping. */
function buildAuthorization(spec: any, credential: DefaultCredential | undefined) {
  if (!credential) return {};
  const schemes = spec?.components?.securitySchemes ?? {};
  const authorization: Record<string, unknown> = {};
  for (const [name, definition] of Object.entries<any>(schemes)) {
    if (
      definition?.type === 'http' &&
      typeof definition.scheme === 'string' &&
      definition.scheme.toLowerCase() === credential.scheme.toLowerCase()
    ) {
      authorization[name] = { name, schema: definition, value: credential.value };
    }
  }
  return authorization;
}

function MockableOpenApiWidget({
  definition,
  entity,
  credential,
}: {
  definition: string;
  entity: Entity;
  credential: DefaultCredential | undefined;
}) {
  // The mock URL must be absolute, not a path relative to the page's own origin: in local dev
  // the frontend (:3000) and backend (:7007) are different origins, so a relative
  // `/api/proxy/mock/...` string resolves against the *frontend's* origin and never reaches the
  // backend's proxy plugin at all (confirmed by reproducing issues.md's Step 7 404 — the
  // frontend dev server's own 404/SPA-fallback answers before the backend ever sees the
  // request). `discoveryApiRef.getBaseUrl('proxy')` resolves the backend's actual, correct
  // origin for both dev and packaged/same-origin production deployments.
  const discoveryApi = useApi(discoveryApiRef);
  const [proxyBaseUrl, setProxyBaseUrl] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    discoveryApi.getBaseUrl('proxy').then(baseUrl => {
      if (!cancelled) setProxyBaseUrl(baseUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [discoveryApi]);

  const mergedSpec = useMemo(() => {
    if (!proxyBaseUrl) return undefined;

    let parsed: any;
    try {
      parsed = yaml.load(definition);
    } catch {
      return undefined;
    }
    if (!parsed || typeof parsed !== 'object') return undefined;

    const mockUrl = `${proxyBaseUrl}/mock/${entity.metadata.name}`;
    const nativeServers = Array.isArray(parsed.servers) ? parsed.servers : [];
    return {
      ...parsed,
      servers: [...nativeServers, { url: mockUrl, description: MOCK_SERVER_DESCRIPTION }],
    };
  }, [definition, entity, proxyBaseUrl]);

  if (!mergedSpec) {
    // Not yet parseable as an OpenAPI document, or the proxy base URL hasn't resolved yet —
    // fall back to the unmodified default rendering (re-renders once it has).
    return <OpenApiDefinitionWidget definition={definition} />;
  }

  const authorization = buildAuthorization(mergedSpec, credential);

  return (
    <OpenApiDefinitionWidget
      definition={definition}
      // @ts-expect-error swagger-ui-react props passed through beyond OpenApiDefinitionWidgetProps
      spec={mergedSpec}
      onComplete={(system: any) => {
        if (Object.keys(authorization).length > 0) {
          system.authActions.authorize(authorization);
        }
      }}
    />
  );
}

function readDefaultCredential(config: {
  getOptional(key: string): unknown;
}): DefaultCredential | undefined {
  const raw = config.getOptional('mocking.defaultCredential') as
    | { scheme?: string; value?: string }
    | undefined;
  if (!raw?.scheme || !raw?.value) return undefined;
  return { scheme: raw.scheme, value: raw.value };
}

const apiMockingConfigApi = ApiBlueprint.make({
  name: 'config',
  params: defineParams =>
    defineParams({
      api: apiDocsConfigRef,
      deps: { configApi: configApiRef },
      factory: ({ configApi }) => {
        const fallbackWidgets = defaultDefinitionWidgets();
        const credential = readDefaultCredential(configApi);

        const config: ApiDocsConfig = {
          getApiDefinitionWidget: (apiEntity: Entity): ApiDefinitionWidget | undefined => {
            if (apiEntity.spec?.type !== 'openapi') {
              return fallbackWidgets.find(widget => widget.type === apiEntity.spec?.type);
            }
            return {
              type: 'openapi',
              title: 'OpenAPI',
              rawLanguage: 'yaml',
              component: (definition: string) => (
                <MockableOpenApiWidget
                  definition={definition}
                  entity={apiEntity}
                  credential={credential}
                />
              ),
            };
          },
        };
        return config;
      },
    }),
});

export const apiMockingModule = createFrontendModule({
  pluginId: 'api-docs',
  extensions: [apiMockingConfigApi],
});
