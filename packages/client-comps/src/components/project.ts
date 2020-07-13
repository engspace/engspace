import { useMutation } from '@vue/apollo-composable';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { USER_FIELDS } from './user';

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

export const PROJECT_MEMBER_UPDATE = gql`
    mutation UpdateProjectMember($memberId: ID!, $roles: [String!]) {
        projectUpdateMemberRoles(memberId: $memberId, roles: $roles) {
            ...ProjectMemberFields
        }
    }
    ${PROJECT_MEMBER_FIELDS}
`;

export const PROJECT_MEMBER_ADD = gql`
    mutation AddProjectMember($input: ProjectMemberInput!) {
        projectAddMember(input: $input) {
            ...ProjectMemberFields
        }
    }
    ${PROJECT_MEMBER_FIELDS}
`;

export const PROJECT_MEMBER_REMOVE = gql`
    mutation RemoveProjectMember($memberId: ID!) {
        projectDeleteMember(memberId: $memberId) {
            id
        }
    }
`;

interface UpdateParams {
    mutation?: DocumentNode;
}

export function useProjectUpdate({ mutation = PROJECT_UPDATE }: UpdateParams = {}) {
    return useMutation(mutation);
}
