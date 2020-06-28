import { ref, computed, Ref } from '@vue/composition-api';
import jwtDecode from 'jwt-decode';
import { AuthToken } from '@engspace/core';

const storageKey = 'auth-token';

let mutableToken: Ref<string> | null = null;

/**
 * Login token (non-reactive)
 */
export function token(): string | undefined {
    return mutableToken?.value;
}

/**
 * Whether user is logged-in (non-reactive)
 */
export function loggedIn(): boolean {
    return !!mutableToken?.value;
}

function mt(): Ref<string> {
    if (!mutableToken) {
        mutableToken = ref(localStorage.getItem(storageKey) || '');
    }
    return mutableToken as Ref<string>;
}

/**
 * Reactive Authentification information
 */
export function useAuth() {
    const mutableToken = mt();

    const token = computed(() => mutableToken.value);
    const loggedIn = computed(() => !!mutableToken.value);
    const auth = computed(() =>
        mutableToken.value ? (jwtDecode(mutableToken.value) as AuthToken) : null
    );
    const userId = computed(() => auth.value?.userId);
    const userPerms = computed(() => auth.value?.userPerms);

    function logout() {
        mutableToken.value = '';
        localStorage.removeItem(storageKey);
    }

    function login(authToken: string) {
        localStorage.setItem(storageKey, authToken);
        mutableToken.value = authToken;
    }

    return {
        loggedIn,
        userId,
        userPerms,
        token,

        logout,
        login,
    };
}
