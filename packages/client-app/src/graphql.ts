import gql from 'graphql-tag';

export const USER_FIELDS = gql`
    fragment UserFields on User {
        id
        name
        email
        fullName
    }
`;

export const PROJECT_FIELDS = gql`
    fragment ProjectFields on Project {
        id
        code
        name
        description
    }
`;

export const MEMBER_FIELDS = gql`
    fragment MemberFields on ProjectMember {
        id
        roles
    }
`;

export const PROJECT_MEMBER_FIELDS = gql`
    fragment ProjectMemberFields on ProjectMember {
        id
        user {
            ...UserFields
        }
        roles
    }
    ${USER_FIELDS}
`;

export const USER_MEMBERSHIP_FIELDS = gql`
    fragment UserMembershipFields on ProjectMember {
        id
        project {
            ...ProjectFields
        }
        roles
    }
    ${PROJECT_FIELDS}
`;

export const DOCUMENT_FIELDS = gql`
    fragment DocumentFields on Document {
        id
        name
        description
        createdBy {
            ...UserFields
        }
        createdAt
        checkout {
            ...UserFields
        }
    }
    ${USER_FIELDS}
`;

export const DOCUMENT_REV_FIELDS = gql`
    fragment DocumentRevFields on DocumentRevision {
        id
        revision
        filename
        filesize
        author {
            ...UserFields
        }
        createdAt
        uploaded
        sha1
    }
    ${USER_FIELDS}
`;
