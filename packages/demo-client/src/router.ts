import Vue from 'vue';
import Router, { Location, Route } from 'vue-router';
import HomePage from './pages/HomePage.vue';
import LoginPage from './pages/LoginPage.vue';
import store from './store';

Vue.use(Router);

type NextCallback = (to?: Location) => void;

function redirectLogin(to: Route, next: NextCallback): void {
    const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
    next({ path: `/login${redirectQuery}` });
}

function requireAuth(to: Route, from: Route, next: NextCallback): void {
    if (store.getters.isAuth) {
        console.log('logged in');
        next();
    } else {
        console.log('not logged in');
        redirectLogin(to, next);
    }
}

// function requirePerm(perm: string) {
//     return (to: Route, from: Route, next: NextCallback): void => {
//         if (
//             store.getters.isAuth &&
//             store.getters.auth.userPerms.includes(perm)
//         ) {
//             next();
//         } else {
//             redirectLogin(to, next);
//         }
//     };
// }

// function requirePerms(perms: string[]) {
//     return (to: Route, from: Route, next: NextCallback): void => {
//         if (!store.getters.isAuth) {
//             redirectLogin(to, next);
//             return;
//         }
//         for (const p of perms) {
//             if (!store.getters.auth.userPerms.includes(p)) {
//                 redirectLogin(to, next);
//                 return;
//             }
//         }
//         next();
//     };
// }

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            component: HomePage,
            beforeEnter: requireAuth,
        },
        {
            path: '/login',
            component: LoginPage,
        },
    ],
});
