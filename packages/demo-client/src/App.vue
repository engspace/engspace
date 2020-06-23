<template>
    <v-app>
        <tool-bar v-if="$store.getters.isAuth" />
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<script>
import HttpStatus from 'http-status-codes';
import { api, authHeader } from './api';
import ToolBar from './components/ToolBar.vue';
import { AUTH_LOGOUT_ACTION } from './store';

export default {
    name: 'App',
    components: {
        ToolBar,
    },
    data() {
        return {
            //
        };
    },
    async created() {
        if (this.$store.getters.isAuth) {
            // if already authenticated, we double check the token here
            // as it can have expired
            const resp = await api.get('/api/check_token', {
                headers: authHeader(),
            });
            if (resp.status !== HttpStatus.OK) {
                this.$store.dispatch(AUTH_LOGOUT_ACTION);
                this.$router.push('/login');
            }
        }
    },
};
</script>
