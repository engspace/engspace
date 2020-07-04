import { useQuery, useResult } from '@vue/apollo-composable';
import { computed, Ref } from '@vue/composition-api';
import gql from 'graphql-tag';
import { RefOrRaw, unref } from '../composition-helper';

export const USER_FIELDS = gql`
    fragment UserFields on User {
        id
        name
        email
        fullName
    }
`;

/**
 * GraphQL `userSearch` query.
 *
 * operation name: SearchUsers
 */
export const USER_SEARCH = gql`
    query SearchUsers($search: String, $offset: Int, $limit: Int, $fetchRoles: Boolean!) {
        userSearch(search: $search, offset: $offset, limit: $limit) {
            count
            users {
                ...UserFields
                roles @include(if: $fetchRoles)
            }
        }
    }
    ${USER_FIELDS}
`;

interface SearchParams {
    search: Ref<string>;
    page: Ref<number>;
    itemsPerPage?: RefOrRaw<number>;
    fetchRoles?: RefOrRaw<boolean>;
    debounce?: RefOrRaw<number>;
    emptyAll?: RefOrRaw<boolean>;
}

/**
 * Stateful reactive user search. The query operation name is 'SearchUsers'.
 */
export function useUserSearch({
    search,
    page,
    itemsPerPage = 10,
    fetchRoles = false,
    debounce = 500,
    emptyAll = false,
}: SearchParams) {
    const offset = computed(() => unref(itemsPerPage) * (unref(page) - 1));
    const variables = computed(() => ({
        search: unref(search),
        offset: offset.value,
        limit: unref(itemsPerPage),
        fetchRoles: unref(fetchRoles),
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