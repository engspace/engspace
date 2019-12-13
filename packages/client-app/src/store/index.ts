import jwtDecode from 'jwt-decode';
import Vue from 'vue';
import Vuex from 'vuex';
import { Api } from '../api';
import { AUTH_LOGIN, AUTH_LOGOUT } from './actions';
import { AUTH_TOKEN } from './mutations';

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        token: localStorage.getItem('auth-token') || '',
    },
    getters: {
        isAuth: state => !!state.token,
        auth: state => (state.token ? jwtDecode(state.token) : null),
    },
    actions: {
        async [AUTH_LOGIN]({ commit }, cred) {
            try {
                const resp = await Api.post('/auth/login', cred);
                localStorage.setItem('auth-token', resp.data.token);
                commit(AUTH_TOKEN, resp.data.token);
            } catch (err) {
                localStorage.removeItem('auth-token');
                commit(AUTH_TOKEN, '');
            }
        },
        async [AUTH_LOGOUT]({ commit }) {
            localStorage.removeItem('auth-token');
            commit(AUTH_TOKEN, '');
        },
    },
    mutations: {
        [AUTH_TOKEN]: (state, token) => {
            state.token = token;
        },
    },
});

export default store;
