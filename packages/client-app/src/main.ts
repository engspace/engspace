import vuetify from '@/plugins/vuetify';
import Vue from 'vue';
import { apolloProvider } from './apollo';
import App from './App.vue';
import router from './router';
import store from './store';

Vue.config.productionTip = false;

Vue.mixin({
    methods: {
        hasUserPerm(perm: string): boolean {
            return this.$store.getters.userPermissions.includes(perm);
        },
    },
});

new Vue({
    router,
    store,
    vuetify,
    apolloProvider,
    render: h => h(App),
}).$mount('#app');
