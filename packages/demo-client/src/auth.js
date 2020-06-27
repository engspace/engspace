import { ref, computed } from '@vue/composition-api';
import jwtDecode from 'jwt-decode';

const storageKey = 'auth-token';

let mutableToken = null;

/**
 * Login token (non-reactive)
 */
export function token() {
    return mutableToken?.value;
}

/**
 * Whether user is logged-in (non-reactive)
 */
export function loggedIn() {
    return mutableToken && !!mutableToken.value;
}

/**
 * Reactive Authentification information
 */
export function useAuth() {
    if (!mutableToken) {
        mutableToken = ref(localStorage.getItem(storageKey) || '');
    }

    const token = computed(() => mutableToken.value);
    const loggedIn = computed(() => !!mutableToken.value);
    const auth = computed(() => (mutableToken.value ? jwtDecode(mutableToken.value) : null));
    const userId = computed(() => auth.value?.userId);
    const userPerms = computed(() => auth.value?.userPerms);

    function logout() {
        mutableToken.value = '';
        localStorage.removeItem(storageKey);
    }

    function login(authToken) {
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
