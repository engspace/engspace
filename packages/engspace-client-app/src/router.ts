import Vue from 'vue';
import Router, { Location, Route } from 'vue-router';

import store from './store';

import AdminUsersPage from './pages/AdminUsersPage.vue';
import ProjectPage from './pages/ProjectPage.vue';
import ProjectNewPage from './pages/ProjectNewPage.vue';
import ProjectEditPage from './pages/ProjectEditPage.vue';
import HomePage from './pages/HomePage.vue';
import FirstAdminPage from './pages/FirstAdminPage.vue';
import LoginPage from './pages/LoginPage.vue';

Vue.use(Router);

type NextCallback = (to?: Location) => void;

function requiresUserAuth(to: Route, from: Route, next: NextCallback): void {
    if (store.getters.isAuth) {
        next();
    } else {
        const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
        next({ path: `/login${redirectQuery}` });
    }
}

function requiresManagerAuth(to: Route, from: Route, next: NextCallback): void {
    if (store.getters.user.manager) {
        next();
    } else {
        const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
        next({ path: `/login${redirectQuery}` });
    }
}

function requiresAdminAuth(to: Route, from: Route, next: NextCallback): void {
    if (store.getters.user.admin) {
        next();
    } else {
        const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
        next({ path: `/login${redirectQuery}` });
    }
}

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
        {
            path: '/admin/users',
            component: AdminUsersPage,
            beforeEnter: requiresAdminAuth,
        },
        {
            path: '/project/new',
            component: ProjectNewPage,
            beforeEnter: requiresManagerAuth,
        },
        {
            path: '/project/:code',
            component: ProjectPage,
            beforeEnter: requiresUserAuth,
        },
        {
            path: '/project/:code/edit',
            component: ProjectEditPage,
            beforeEnter: requiresManagerAuth,
        },
    ],
});
