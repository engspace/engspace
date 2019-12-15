import jwtDecode from 'jwt-decode';
import Vue from 'vue';
import Vuex from 'vuex';
import { Api } from './api';

Vue.use(Vuex);

export const AUTH_LOGIN_ACTION = 'AUTH_LOGIN_ACTION';
export const AUTH_LOGOUT_ACTION = 'AUTH_LOGOUT_ACTION';
export const AUTH_TOKEN_MUTATION = 'AUTH_TOKEN_MUTATION';

const store = new Vuex.Store({
    state: {
        token: localStorage.getItem('auth-token') || '',
    },
    getters: {
        isAuth: state => !!state.token,
        auth: state => (state.token ? jwtDecode(state.token) : null),
    },
    actions: {
        async [AUTH_LOGIN_ACTION]({ commit }, cred) {
            try {
                const resp = await Api.post('/auth/login', cred);
                localStorage.setItem('auth-token', resp.data.token);
                commit(AUTH_TOKEN_MUTATION, resp.data.token);
            } catch (err) {
                localStorage.removeItem('auth-token');
                commit(AUTH_TOKEN_MUTATION, '');
            }
        },
        async [AUTH_LOGOUT_ACTION]({ commit }) {
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

export default store;
