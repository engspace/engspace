import Vue from 'vue';
import Router, { Location, Route } from 'vue-router';
import FirstAdminPage from './pages/FirstAdminPage.vue';
import HomePage from './pages/HomePage.vue';
import LoginPage from './pages/LoginPage.vue';
import ProjectNewPage from './pages/ProjectNewPage.vue';
import ProjectPage from './pages/ProjectPage.vue';
import UserAdminPage from './pages/UserAdminPage.vue';
import store from './store';

Vue.use(Router);

type NextCallback = (to?: Location) => void;

function redirectLogin(to: Route, next: NextCallback): void {
    const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
    next({ path: `/login${redirectQuery}` });
}

function requireAuth(to: Route, from: Route, next: NextCallback): void {
    if (store.getters.isAuth) {
        next();
    } else {
        redirectLogin(to, next);
    }
}

function requirePerm(perm: string) {
    return (to: Route, from: Route, next: NextCallback): void => {
        if (store.getters.isAuth && store.getters.auth.userPerms.includes(perm)) {
            next();
        } else {
            redirectLogin(to, next);
        }
    };
}

function requirePerms(perms: string[]) {
    return (to: Route, from: Route, next: NextCallback): void => {
        if (!store.getters.isAuth) {
            redirectLogin(to, next);
            return;
        }
        for (const p of perms) {
            if (!store.getters.auth.userPerms.includes(p)) {
                redirectLogin(to, next);
                return;
            }
        }
        next();
    };
}

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
            path: '/first_admin',
            component: FirstAdminPage,
        },
        {
            path: '/login',
            component: LoginPage,
        },
        {
            path: '/admin/users',
            component: UserAdminPage,
            beforeEnter: requirePerms(['user.create', 'user.update']),
        },
        {
            path: '/project/new',
            component: ProjectNewPage,
            beforeEnter: requirePerm('project.create'),
        },
        {
            path: '/project/by-code/:code',
            component: ProjectPage,
            beforeEnter: requireAuth,
        },
        {
            path: '/project/:id',
            component: ProjectPage,
            beforeEnter: requireAuth,
        },
    ],
});
