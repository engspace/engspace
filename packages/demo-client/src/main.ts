import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';
import apolloProvider from './plugins/apollo';
import VueCompositionApi from '@vue/composition-api';

Vue.use(VueCompositionApi);

Vue.config.productionTip = false;

new Vue({
    router,
    store,
    vuetify,
    apolloProvider,
    render: (h) => h(App),
}).$mount('#app');
