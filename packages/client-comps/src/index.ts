import { VueConstructor } from 'vue';
import EsSuccessBtn from './components/SuccessBtn.vue';
import EsUserCard from './components/UserCard.vue';
import EsUserEditCard from './components/UserEditCard.vue';
import EsUserFinder from './components/UserFinder.vue';

export { provideConfig, useConfig } from './config';
export { useSuccessAnimate } from './components/success-btn';

const comps: { [name: string]: VueConstructor } = {
    EsSuccessBtn,
    EsUserCard,
    EsUserEditCard,
    EsUserFinder,
};

export default {
    install(Vue: VueConstructor) {
        Object.keys(comps).forEach((name) => {
            Vue.component(name, comps[name]);
        });
    },
};
