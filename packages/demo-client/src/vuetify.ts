import { provide, inject } from '@vue/composition-api';
import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

export const vuetify = new Vuetify({});

const VuetifySymbol = Symbol();

export function provideVuetify() {
    provide(VuetifySymbol, vuetify);
}

export function useVuetify() {
    return inject(VuetifySymbol);
}
