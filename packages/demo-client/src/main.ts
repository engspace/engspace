import VueCompositionApi from '@vue/composition-api';
import Vue from 'vue';
import EsComps from '@engspace/client-comps';
import App from './App.vue';
import { provideApollo } from './apollo';
import { router, provideRouter } from './router';
import { vuetify } from './vuetify';

Vue.use(VueCompositionApi);
Vue.use(EsComps);

Vue.config.productionTip = false;

new Vue({
    router,
    vuetify,
    setup() {
        provideRouter();
        provideApollo();
        return {};
    },
    render: (h) => h(App),
}).$mount('#app');
