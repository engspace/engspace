import { Role } from '@engspace/core';
import gql from 'graphql-tag';
import Vue from 'vue';
import Router, { Location, Route } from 'vue-router';
import { apolloClient } from './apollo';
import AdminUserPage from './pages/AdminUserPage.vue';
import FirstAdminPage from './pages/FirstAdminPage.vue';
import HomePage from './pages/HomePage.vue';
import LoginPage from './pages/LoginPage.vue';
import store from './store';

Vue.use(Router);

type NextCallback = (to?: Location) => void;

function redirectLogin(to: Route, next: NextCallback): void {
    const redirectQuery = to.path !== '/' ? `?redirect=${to.path}` : '';
    next({ path: `/login${redirectQuery}` });
}

function requiresAuth(to: Route, from: Route, next: NextCallback): void {
    if (store.getters.isAuth) {
        next();
    } else {
        redirectLogin(to, next);
    }
}

// function requirePerm(perm: string) {
//     return (to: Route, from: Route, next: NextCallback): void => {
//         if (store.getters.isAuth && store.getters.auth.userPerms.contains(perm)) {
//             next();
//         } else {
//             redirectLogin(to, next);
//         }
//     };
// }

function requireRole(role: Role) {
    return async (to: Route, from: Route, next: NextCallback): Promise<void> => {
        if (store.getters.isAuth) {
            try {
                const { userId } = store.getters.auth;
                const q = await apolloClient.query({
                    query: gql`
                        query GetRoles($userId: ID!) {
                            user(id: $userId) {
                                roles
                            }
                        }
                    `,
                    variables: {
                        userId,
                    },
                });
                if (q.data.user.roles && q.data.user.roles.includes(role)) {
                    next();
                    return;
                }
            } catch (err) {
                console.error(err);
                return;
            }
        }
        redirectLogin(to, next);
    };
}

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            component: HomePage,
            beforeEnter: requiresAuth,
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
            component: AdminUserPage,
            beforeEnter: requireRole(Role.Admin),
        },
    ],
});
