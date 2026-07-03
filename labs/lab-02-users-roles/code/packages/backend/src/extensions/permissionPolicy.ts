// packages/backend/src/extensions/permissionPolicy.ts
import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  PolicyDecision,
  AuthorizeResult,
  isResourcePermission,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import {
  catalogConditions,
  createCatalogConditionalDecision,
} from '@backstage/plugin-catalog-backend/alpha';

class CatalogOwnershipPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    if (isResourcePermission(request.permission, 'catalog-entity')) {
      return createCatalogConditionalDecision(
        request.permission,
        {
          anyOf: [
            // Rule 1: Non-API entities (User, Group, etc.) are always visible to all users.
            // This keeps the org chart and team pages open for everyone.
            { not: catalogConditions.isEntityKind({ kinds: ['API'] }) },

            // Rule 2: APIs annotated as shared are visible to all authenticated users,
            // regardless of which team they belong to.
            catalogConditions.hasAnnotation({
              annotation: 'example.com/visibility',
              value: 'shared',
            }),

            // Rule 3: Private APIs are visible only to members of the owning team.
            // The user's ownershipEntityRefs contains their user ref plus all their
            // group refs, resolved from the catalog User entity's memberOf list.
            catalogConditions.isEntityOwner({
              claims: user?.info.ownershipEntityRefs ?? [],
            }),
          ],
        },
      );
    }
    // All non-catalog permissions (scaffolding, TechDocs, search) are unconditionally allowed.
    return { result: AuthorizeResult.ALLOW };
  }
}

export default createBackendModule({
  pluginId: 'permission',
  moduleId: 'permission-policy',
  register(reg) {
    reg.registerInit({
      deps: { policy: policyExtensionPoint },
      async init({ policy }) {
        policy.setPolicy(new CatalogOwnershipPolicy());
      },
    });
  },
});
