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

export const CHANGEREQ_DEEPFIELDS = gql`
    fragment ChangeReqDeepFields on ChangeRequest {
        id
        description
        cycle
        state
        partCreations {
            id
            family {
                id
            }
            version
            designation
            comments
        }
        partChanges {
            id
            part {
                id
            }
            version
            designation
            comments
        }
        partRevisions {
            id
            part {
                id
            }
            designation
            comments
        }
        reviews {
            id
            assignee {
                id
            }
            decision
            comments
        }
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;
