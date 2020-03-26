import gql from 'graphql-tag';

export const TRACKED_FIELDS = gql`
    fragment TrackedFields on Tracked {
        createdBy {
            id
        }
        createdAt
        updatedBy {
            id
        }
        updatedAt
    }
`;
