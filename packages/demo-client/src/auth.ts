import { ref, computed, Ref, provide, inject, InjectionKey } from '@vue/composition-api';
import jwtDecode from 'jwt-decode';
import { AuthToken, Id } from '@engspace/core';

const storageKey = 'auth-token';

let authToken: AuthToken | undefined;

/**
 * Login token (non-reactive)
 */
export function token(): string | null {
    return localStorage.getItem(storageKey);
}

/**
 * Whether user is logged-in (non-reactive)
 */
export function loggedIn(): boolean {
    return !!token();
}

function getAuthToken(): AuthToken | undefined {
    if (!authToken) {
        const tok = token();
        if (!tok) {
            return undefined;
        }
        authToken = jwtDecode(tok) as AuthToken;
    }
    return authToken;
}

/**
 * Id of logged-in user (non-reactive)
 */
export function userId(): Id | undefined {
    return getAuthToken()?.userId;
}

/**
 * Permissions of logged-in user (non-reactive)
 */
export function userPerms(): string[] | undefined {
    return getAuthToken()?.userPerms;
}

interface AuthStore {
    token: Ref<string>;
    auth: Ref<AuthToken | null>;
}

const AuthSymbol: InjectionKey<AuthStore> = Symbol();

/**
 * Provide reactive authentification information to Vue
 */
export function provideAuth(): void {
    const tok = ref(token() || '');
    const auth = computed(() => (tok.value ? (jwtDecode(tok.value) as AuthToken) : null));
    provide(AuthSymbol, { token: tok, auth });
}

/**
 * Reactive Authentification information
 */
export function useAuth() {
    const store = inject(AuthSymbol, { token: ref(''), auth: ref(null) });

    const loggedIn = computed(() => !!store.auth.value);
    const userId = computed(() => store.auth.value?.userId);
    const userPerms = computed(() => store.auth.value?.userPerms);

    function logout() {
        localStorage.removeItem(storageKey);
        authToken = undefined;
        store.token.value = '';
    }

    function login(token: string) {
        store.token.value = token;
        authToken = undefined;
        localStorage.setItem(storageKey, token);
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
