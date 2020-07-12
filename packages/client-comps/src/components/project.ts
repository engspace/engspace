import { useMutation } from '@vue/apollo-composable';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';

export const PROJECT_FIELDS = gql`
    fragment ProjectFields on Project {
        id
        name
        code
        description
    }
`;

export const PROJECT_UPDATE = gql`
    mutation UpdateProject($id: ID!, $input: ProjectInput!) {
        projectUpdate(id: $id, input: $input) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

interface UpdateParams {
    mutation?: DocumentNode;
}

export function useProjectUpdate({ mutation = PROJECT_UPDATE }: UpdateParams = {}) {
    return useMutation(mutation);
}
