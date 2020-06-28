<template>
    <v-app>
        <tool-bar v-if="loggedIn" />
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<script>
import { onBeforeMount, defineComponent } from '@vue/composition-api';
import HttpStatus from 'http-status-codes';
import { api, authHeader } from './api';
import { useAuth } from './auth';
import ToolBar from './components/ToolBar.vue';

export default defineComponent({
    name: 'App',
    components: {
        ToolBar,
    },
    setup(props, { root }) {
        const auth = useAuth();
        if (auth.loggedIn.value) {
            console.log('logged-in');
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
        } else {
            console.log('not logged-in');
        }
        return {
            loggedIn: auth.loggedIn,
        };
    },
});
</script>
