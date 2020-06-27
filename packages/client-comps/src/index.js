import EsUserCard from './components/UserCard.vue';

const comps = {
    EsUserCard,
};

export default {
    install(Vue) {
        Object.keys(comps).forEach((name) => {
            Vue.component(name, comps[name]);
        });
    },
};
