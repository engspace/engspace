import jwtDecode from 'jwt-decode';
import Vue from 'vue';
import Vuex from 'vuex';
import { AuthToken, Id } from '@engspace/core';

Vue.use(Vuex);

export const AUTH_LOGIN_ACTION = 'AUTH_LOGIN_ACTION';
export const AUTH_LOGOUT_ACTION = 'AUTH_LOGOUT_ACTION';
export const AUTH_TOKEN_MUTATION = 'AUTH_TOKEN_MUTATION';

export default new Vuex.Store({
    state: {
        token: localStorage.getItem('auth-token') || '',
    },
    getters: {
        isAuth: (state) => !!state.token,
        auth: (state): AuthToken | null =>
            state.token ? jwtDecode(state.token) : null,
        userPermissions: (state, getters): string[] | null => {
            const auth: AuthToken = getters.auth;
            return auth ? auth.userPerms : null;
        },
        userId: (state, getters): Id | null => {
            const auth: AuthToken = getters.auth;
            return auth ? auth.userId : null;
        },
    },
    actions: {
        [AUTH_LOGIN_ACTION]({ commit }, token) {
            localStorage.setItem('auth-token', token);
            commit(AUTH_TOKEN_MUTATION, token);
        },
        [AUTH_LOGOUT_ACTION]({ commit }) {
            localStorage.removeItem('auth-token');
            commit(AUTH_TOKEN_MUTATION, '');
        },
    },
    mutations: {
        [AUTH_TOKEN_MUTATION]: (state, token) => {
            state.token = token;
        },
    },
});
