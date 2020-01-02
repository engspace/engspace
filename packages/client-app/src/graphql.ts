import gql from 'graphql-tag';

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
        user {
            id
            name
            email
            fullName
        }
        roles
    }
`;
