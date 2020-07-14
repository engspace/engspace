import { provide, inject } from '@vue/composition-api';
import Vue from 'vue';
import Router, { Route, Location } from 'vue-router';
import { loggedIn, userPerms } from './auth';
import AdminPage from './pages/AdminPage.vue';
import HomePage from './pages/HomePage.vue';
import LoginPage from './pages/LoginPage.vue';
import ProjectPage from './pages/ProjectPage.vue';
import UserPage from './pages/UserPage.vue';

const RouterSymbol = Symbol();

Vue.use(Router);

type NextCallback = (to?: Location) => void;

function redirectLogin(to: Route, next: NextCallback) {
    const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
    next({ path: `/login${redirectQuery}` });
}

function requireAuth(to: Route, from: Route, next: NextCallback) {
    if (loggedIn()) {
        next();
    } else {
        redirectLogin(to, next);
    }
}

function requirePerm(perm: string) {
    return (to: Route, from: Route, next: NextCallback) => {
        const perms = userPerms();
        if (perms?.includes(perm)) {
            next();
        } else {
            redirectLogin(to, next);
        }
    };
}

function requirePerms(required: string[]) {
    return (to: Route, from: Route, next: NextCallback) => {
        const available = userPerms();
        if (!available) {
            redirectLogin(to, next);
            return;
        }
        for (const p of required) {
            if (!available.includes(p)) {
                redirectLogin(to, next);
                return;
            }
        }
        next();
    };
}

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
            path: '/admin',
            component: AdminPage,
            beforeEnter: requirePerms(['user.update', 'user.create']),
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
        {
            path: '/project/:id',
            component: ProjectPage,
            beforeEnter: requirePerm('project.read'),
        },
        {
            path: '/project/by-code/:code',
            component: ProjectPage,
            beforeEnter: requirePerm('project.read'),
        },
    ],
});

export function provideRouter() {
    provide(RouterSymbol, router);
}

export function useRouter() {
    return inject(RouterSymbol);
}
