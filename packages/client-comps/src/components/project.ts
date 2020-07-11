import gql from 'graphql-tag';

export const PROJECT_FIELDS = gql`
    fragment ProjectFields on Project {
        id
        name
        code
        description
    }
`;
