import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { InfoCard } from '@backstage/core-components';
import { Typography, Box, Chip } from '@material-ui/core';

const VISIBILITY_ANNOTATION = 'example.com/visibility';

export function ApiVisibilityCard() {
  const { entity } = useEntity();
  const visibility = entity.metadata.annotations?.[VISIBILITY_ANNOTATION];

  if (!visibility) {
    return (
      <InfoCard title="API Visibility">
        <Typography variant="body2" color="textSecondary">
          No visibility designation set. Under the permission policy, this API is visible
          only to members of the owning team (treated as private by default).
        </Typography>
      </InfoCard>
    );
  }

  const isShared = visibility === 'shared';

  return (
    <InfoCard title="API Visibility">
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          label={isShared ? 'Shared' : 'Private'}
          color={isShared ? 'primary' : 'default'}
          size="small"
        />
        <Typography variant="body2">
          {isShared
            ? 'Visible to all authenticated users regardless of team membership.'
            : 'Visible only to members of the owning team.'}
        </Typography>
      </Box>
    </InfoCard>
  );
}
