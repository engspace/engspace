import { useQuery, useResult } from '@vue/apollo-composable';
import { computed, ref, Ref } from '@vue/composition-api';
import gql from 'graphql-tag';
import { Id } from '@engspace/core';
import { RefOrRaw, unref } from '../composition-helper';

export const USER_FIELDS = gql`
    fragment UserFields on User {
        id
        name
        email
        fullName
    }
`;

export const USER_GET = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            ...UserFields
            roles
        }
    }
    ${USER_FIELDS}
`;

export const USER_GET_BY_NAME = gql`
    query GetUserByName($name: String!) {
        userByName(name: $name) {
            ...UserFields
            roles
        }
    }
    ${USER_FIELDS}
`;

const USER_SEARCH = gql`
    query SearchUsers($search: String, $offset: Int, $limit: Int) {
        userSearch(search: $search, offset: $offset, limit: $limit) {
            count
            users {
                ...UserFields
            }
        }
    }
    ${USER_FIELDS}
`;

interface IdOrName {
    id?: Id;
    name?: string;
}

/**
 * Return a reactive apollo query for a user.
 *
 * Will search by name if id is not provided.
 */
export function useUserQuery(idOrName: IdOrName) {
    const id = ref(idOrName.id);
    const name = ref(idOrName.name);
    const doc = computed(() => (id.value ? USER_GET : USER_GET_BY_NAME));
    const vars = computed(() => (id.value ? { id } : { name }));
    const query = useQuery(doc, vars);
    return {
        id,
        name,
        query,
    };
}

interface SearchParams {
    search: Ref<string>;
    page: Ref<number>;
    itemsPerPage?: RefOrRaw<number>;
    debounce?: RefOrRaw<number>;
    emptyAll?: RefOrRaw<boolean>;
}

/**
 * Stateful reactive user search.
 */
export function useUserSearch({
    search,
    page,
    itemsPerPage = 10,
    debounce = 500,
    emptyAll = false,
}: SearchParams) {
    const offset = computed(() => unref(itemsPerPage) * (unref(page) - 1));
    const variables = computed(() => ({
        search: unref(search),
        offset: offset.value,
        limit: unref(itemsPerPage),
    }));
    const options = computed(() => ({
        debounce: unref(debounce),
        enabled: !!variables.value.search || unref(emptyAll),
    }));

    const { result, error, loading } = useQuery(USER_SEARCH, variables, options);

    const users = useResult(result, [], (data) => data.userSearch.users);
    const count = useResult(result, 0, (data) => data.userSearch.count);

    return {
        users: computed(() => (options.value.enabled ? users.value : [])),
        count: computed(() => (options.value.enabled ? count.value : 0)),

        loading,
        error,
    };
}
