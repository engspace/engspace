<template>
    <div>
        <es-user-card :value="user"></es-user-card>
    </div>
</template>

<script lang="ts">
import { useQuery, useResult } from '@vue/apollo-composable';
import { defineComponent } from '@vue/composition-api';
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
export default defineComponent({
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
});
</script>
