<template>
    <div>
        <es-user-card :user="user"></es-user-card>
    </div>
</template>

<script>
import { useQuery, useResult } from '@vue/apollo-composable';
import gql from 'graphql-tag';

const GET_USER = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            name
            email
            fullName
            roles
        }
    }
`;

const GET_USER_BY_NAME = gql`
    query GetUserByName($name: String!) {
        userByName(name: $name) {
            id
            name
            email
            fullName
            roles
        }
    }
`;
export default {
    name: 'UserPage',
    setup(props, { root }) {
        const { $route } = root;
        const { path, params } = $route;
        let q;
        if (path.includes('/by-name/')) {
            const { name } = params;
            q = useQuery(GET_USER_BY_NAME, {
                name,
            });
        } else {
            const { id } = params;
            q = useQuery(GET_USER, {
                id,
            });
        }
        const { result, error } = q;
        const user = useResult(result);
        return {
            user,
            error,
        };
    },
};
</script>
