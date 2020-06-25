import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';
import App from './App.vue';
import { router } from './router';
import { store } from './store';
import { vuetify } from './vuetify';
import { provideApollo } from './apollo';

Vue.use(VueCompositionApi);

Vue.config.productionTip = false;

new Vue({
    store,
    router,
    vuetify,
    setup() {
        provideApollo();
    },
    render: (h) => h(App),
}).$mount('#app');
