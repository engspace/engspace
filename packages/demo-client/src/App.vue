<template>
    <v-app>
        <tool-bar v-if="loggedIn" />
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<script>
import HttpStatus from 'http-status-codes';
import { onBeforeMount } from '@vue/composition-api';
import { api, authHeader } from './api';
import ToolBar from './components/ToolBar.vue';
import { useAuth } from './auth';

export default {
    name: 'App',
    components: {
        ToolBar,
    },
    setup(props, { root }) {
        const auth = useAuth();
        if (auth.loggedIn.value) {
            onBeforeMount(async () => {
                // if already authenticated, we double check the token here
                // as it can have expired
                const resp = await api.get('/api/check_token', {
                    headers: authHeader(),
                });
                if (resp.status !== HttpStatus.OK) {
                    auth.logout();
                    root.$router.push('/login');
                }
            });
        }
        return {
            loggedIn: auth.loggedIn,
        };
    },
};
</script>
