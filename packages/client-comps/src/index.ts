import { VueConstructor } from 'vue';
import EsDisplayLabel from './components/DisplayLabel.vue';
import EsSuccessBtn from './components/SuccessBtn.vue';
import EsUserCard from './components/UserCard.vue';
import EsUserEdit from './components/UserEdit.vue';
import EsUserFinder from './components/UserFinder.vue';

export { useSuccessAnimate } from './components/success-btn';
export { USER_FIELDS, useUserCheckExist, useUserConflicts, useUserSearch } from './components/user';
export { provideConfig, useConfig } from './config';
export { operationName } from './graphql-helper';

const comps: { [name: string]: VueConstructor } = {
    EsDisplayLabel,
    EsSuccessBtn,
    EsUserCard,
    EsUserEdit,
    EsUserFinder,
};

export default {
    install(Vue: VueConstructor) {
        Object.keys(comps).forEach((name) => {
            Vue.component(name, comps[name]);
        });
    },
};
