import VueCompositionApi from '@vue/composition-api';
import Vue from 'vue';
import EsComps, { provideConfig } from '@engspace/client-comps';
import { buildDefaultAppRolePolicies } from '@engspace/core';
import App from './App.vue';
import { provideApollo } from './apollo';
import { provideAuth } from './auth';
import { router, provideRouter } from './router';
import { vuetify } from './vuetify';

Vue.use(VueCompositionApi);
Vue.use(EsComps);

Vue.config.productionTip = false;

new Vue({
    router,
    vuetify,
    setup() {
        provideConfig({
            rolePolicies: buildDefaultAppRolePolicies(),
        });
        provideAuth();
        provideRouter();
        provideApollo();
        return {};
    },
    render: (h) => h(App),
}).$mount('#app');
