import { provide, inject } from '@vue/composition-api';
import Vue from 'vue';
import Router from 'vue-router';
import { loggedIn, useAuth } from './auth';
import HomePage from './pages/HomePage.vue';
import LoginPage from './pages/LoginPage.vue';
import UserPage from './pages/UserPage.vue';

const RouterSymbol = Symbol();

Vue.use(Router);

function redirectLogin(to, next) {
    const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
    next({ path: `/login${redirectQuery}` });
}

function requireAuth(to, from, next) {
    if (loggedIn()) {
        next();
    } else {
        redirectLogin(to, next);
    }
}

function requirePerm(perm) {
    return (to, from, next) => {
        const auth = useAuth();
        if (auth.loggedIn.value && auth.userPerms.value.includes(perm)) {
            next();
        } else {
            redirectLogin(to, next);
        }
    };
}

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

export const router = new Router({
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
        {
            path: '/user/by-name/:name',
            component: UserPage,
            beforeEnter: requirePerm('user.read'),
        },
        {
            path: '/user/:id',
            component: UserPage,
            beforeEnter: requirePerm('user.read'),
        },
    ],
});

export function provideRouter() {
    provide(RouterSymbol, router);
}

export function useRouter() {
    return inject(RouterSymbol);
}
