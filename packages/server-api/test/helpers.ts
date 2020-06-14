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

export const PART_FIELDS = gql`
    fragment PartFields on Part {
        id
        family {
            id
        }
        ref
        designation
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
`;

export const PARTREV_FIELDS = gql`
    fragment PartRevFields on PartRevision {
        id
        part {
            id
        }
        revision
        designation
        cycle
        ...TrackedFields
    }
    ${TRACKED_FIELDS}
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

        createdParts {
            ...PartFields
        }

        revisedParts {
            ...PartRevFields
        }

        ...TrackedFields
    }
    ${TRACKED_FIELDS}
    ${PART_FIELDS}
    ${PARTREV_FIELDS}
`;
