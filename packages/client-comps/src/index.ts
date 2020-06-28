import { VueConstructor } from 'vue';
import EsUserCard from './components/UserCard.vue';

const comps: { [name: string]: VueConstructor } = {
    EsUserCard,
};

export default {
    install(Vue: VueConstructor) {
        Object.keys(comps).forEach((name) => {
            Vue.component(name, comps[name]);
        });
    },
};
