<template>
    <v-app>
        <tool-bar v-if="$store.getters.isAuth" />
        <v-content>
            <router-view />
        </v-content>
    </v-app>
</template>

<script>
import { Api } from './api';
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
    created() {
        if (this.$store.getters.isAuth) {
            // if already authenticated, we double check the token here
            // as it can have expired
            Api.get('/auth/check_token').catch(() => {
                this.$store.dispatch(AUTH_LOGOUT_ACTION);
                this.$router.push('/login');
            });
        }
    },
};
</script>
