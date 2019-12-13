import { apolloProvider } from '@/plugins/apollo';
import vuetify from '@/plugins/vuetify';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

Vue.config.productionTip = false;

new Vue({
    router,
    store,
    vuetify,
    apolloProvider,
    render: h => h(App),
}).$mount('#app');
