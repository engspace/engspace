import { VueConstructor } from 'vue';
import EsDisplayLabel from './components/DisplayLabel.vue';
import EsMemberTable from './components/MemberTable.vue';
import EsProjectCard from './components/ProjectCard.vue';
import EsSuccessBtn from './components/SuccessBtn.vue';
import EsUserCard from './components/UserCard.vue';
import EsUserEdit from './components/UserEdit.vue';
import EsUserFinder from './components/UserFinder.vue';

export { useSuccessAnimate } from './components/success-btn';
export { USER_FIELDS, useUserCheckExist, useUserConflicts, useUserSearch } from './components/user';
export { PROJECT_FIELDS } from './components/project';
export { provideConfig, useConfig } from './config';
export { operationName } from './graphql-helper';

const comps: { [name: string]: VueConstructor } = {
    EsDisplayLabel,
    EsMemberTable,
    EsProjectCard,
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
