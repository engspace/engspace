import { VueConstructor } from 'vue';
import EsDisplayLabel from './components/DisplayLabel.vue';
import EsErrorAlert from './components/ErrorAlert.vue';
import EsMemberEditTable from './components/MemberEditTable.vue';
import EsMemberTable from './components/MemberTable.vue';
import EsProjectCard from './components/ProjectCard.vue';
import EsSuccessBtn from './components/SuccessBtn.vue';
import EsUserCard from './components/UserCard.vue';
import EsUserEdit from './components/UserEdit.vue';
import EsUserFinder from './components/UserFinder.vue';

export { useSuccessAnimate } from './components/success-btn';
export { USER_FIELDS, useUserCheckExist, useUserConflicts, useUserSearch } from './components/user';
export {
    PROJECT_FIELDS,
    PROJECT_MEMBER_FIELDS,
    PROJECT_MEMBER_ADD,
    PROJECT_MEMBER_REMOVE,
    PROJECT_MEMBER_UPDATE,
} from './components/project';
export { provideConfig, useConfig } from './config';
export { operationName } from './graphql-helper';

const comps: { [name: string]: VueConstructor } = {
    EsDisplayLabel,
    EsErrorAlert,
    EsMemberEditTable,
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
