import Vue from 'vue';
import Router, { Location, Route } from 'vue-router';
import FirstAdminPage from './pages/FirstAdminPage.vue';
import HomePage from './pages/HomePage.vue';
import LoginPage from './pages/LoginPage.vue';
import store from './store';

Vue.use(Router);

type NextCallback = (to?: Location) => void;

function requiresUserAuth(to: Route, from: Route, next: NextCallback): void {
    console.log('checking auth');
    if (store.getters.isAuth) {
        console.log('is auth');
        next();
    } else {
        console.log('is not auth');
        const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
        next({ path: `/login${redirectQuery}` });
    }
}

// function requiresManagerAuth(to: Route, from: Route, next: NextCallback): void {
//     if (store.getters.user.manager) {
//         next();
//     } else {
//         const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
//         next({ path: `/login${redirectQuery}` });
//     }
// }

// function requiresAdminAuth(to: Route, from: Route, next: NextCallback): void {
//     if (store.getters.user.admin) {
//         next();
//     } else {
//         const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
//         next({ path: `/login${redirectQuery}` });
//     }
// }

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            component: HomePage,
            beforeEnter: requiresUserAuth,
        },
        {
            path: '/first_admin',
            component: FirstAdminPage,
        },
        {
            path: '/login',
            component: LoginPage,
        },
    ],
});
