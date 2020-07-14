import { useQuery, useResult } from '@vue/apollo-composable';
import { computed, Ref } from '@vue/composition-api';
import gql from 'graphql-tag';
import validator from 'validator';
import { User, hasId } from '@engspace/core';
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
 * Rule suitable for a v-text-field that checks if the e-mail is valid
 *
 * @param email the email to validate
 */
export function emailValidRule(email: string): string | undefined {
    if (!validator.isEmail(email)) {
        return `"${email}" is not a valid email address`;
    }
}

export const USER_CHECK_EXIST = gql`
    query CheckUserExist($name: String, $email: String) {
        userByName(name: $name) {
            ...UserFields
        }
        userByEmail(email: $email) {
            ...UserFields
        }
    }
    ${USER_FIELDS}
`;

/**
 * Parameters of useUserCheckExist function
 */
interface CheckExistParams {
    user: Ref<Partial<User> | null>;
    debounce?: RefOrRaw<number>;
}

/**
 * Result of useUserCheckExist function
 */
interface CheckExistResult {
    /**
     * id of existing user with the same name, or null.
     */
    nameExist: Ref<User | undefined>;
    /**
     * id of existing user with the same email, or null.
     */
    emailExist: Ref<User | undefined>;
    /**
     * indicate that request is in flight
     */
    loading: Ref<boolean>;
    /**
     * error during the request
     */
    error: Ref<Error>;
}

/**
 * Hook that checks if the email and name of the user are already used.
 */
export function useUserCheckExist({ user, debounce = 500 }: CheckExistParams): CheckExistResult {
    const variables = computed(() => ({
        name: user.value?.name || null,
        email: user.value?.email || null,
    }));
    const options = computed(() => ({
        debounce: unref(debounce),
    }));
    const { result, loading, error } = useQuery(USER_CHECK_EXIST, variables, options);
    const nameExist = computed(() => result.value?.userByName as User | undefined);
    const emailExist = computed(() => result.value?.userByEmail as User | undefined);
    return {
        nameExist,
        emailExist,
        loading,
        error,
    };
}

/** Result of useUserConflicts */
interface ConflictsResult {
    /** Name conflict with another user in the database */
    name: Ref<boolean>;
    /** E-mail conflict with another user in the database */
    email: Ref<boolean>;
    /** indicate that request is in flight */
    loading: Ref<boolean>;
    /** error during the request */
    error: Ref<Error>;
}

/**
 * Hook that checks if name or e-mail conflict with another user in the database.
 * If the user has an id (already created), it will not report conflict if the
 * found existing user has same id.
 * (meaning updating user without changing name or e-mail - most common case).
 * It is also check whether the name or e-mail in input fit with the received
 * from database to avoid reporting false positive while request is flying.
 */
export function useUserConflicts({ user, debounce = 500 }: CheckExistParams): ConflictsResult {
    const { nameExist, emailExist, loading, error } = useUserCheckExist({ user, debounce });
    const name = computed(() => {
        const usr = user.value;
        const exist = nameExist.value;

        return (
            !loading.value &&
            !!usr &&
            !!exist &&
            usr.name === exist.name &&
            ((hasId(usr) && exist.id !== usr.id) || !hasId(usr))
        );
    });
    const email = computed(() => {
        const usr = user.value;
        const exist = emailExist.value;

        return (
            !loading.value &&
            !!usr &&
            !!exist &&
            usr.email === exist.email &&
            ((hasId(usr) && exist.id !== usr.id) || !hasId(usr))
        );
    });
    return {
        name,
        email,
        loading: loading,
        error: error,
    };
}

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
