import gql from 'graphql-tag';

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
