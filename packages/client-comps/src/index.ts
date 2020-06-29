import { VueConstructor } from 'vue';
import EsSuccessBtn from './components/SuccessBtn.vue';
import EsUserCard from './components/UserCard.vue';
import EsUserEditCard from './components/UserEditCard.vue';

export { provideConfig, useConfig } from './config';
export { useSuccessAnimate } from './components/success-btn';

const comps: { [name: string]: VueConstructor } = {
    EsSuccessBtn,
    EsUserCard,
    EsUserEditCard,
};

export default {
    install(Vue: VueConstructor) {
        Object.keys(comps).forEach((name) => {
            Vue.component(name, comps[name]);
        });
    },
};
