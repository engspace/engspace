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
        partCreations {
            family {
                id
            }
            version
            designation
            comments
        }
        partChanges {
            part {
                id
            }
            version
            designation
            comments
        }
        partRevisions {
            part {
                id
            }
            designation
            comments
        }
        reviews {
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
