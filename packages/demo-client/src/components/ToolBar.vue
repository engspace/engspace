<template>
    <div>
        <v-app-bar app clipped-left dense elevation="1">
            <span class="mr-2"><span class="code text--secondary">{engspace}</span> demo</span>
            <router-link to="/">
                <v-icon>mdi-home</v-icon>
            </router-link>
        </v-app-bar>
        <v-navigation-drawer v-model="drawer" app permanent clipped>
            <v-list>
                <v-list-item two-line>
                    <v-list-item-content>
                        <v-list-item-title>{{ user.fullName }}</v-list-item-title>
                        <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-action>
                        <v-btn icon @click="logout"><v-icon>mdi-logout</v-icon></v-btn>
                    </v-list-item-action>
                </v-list-item>
                <v-list-item
                    v-for="item in navItems"
                    :key="item.path"
                    :to="item.path"
                    active-class="highlighted"
                    :class="item.path === $route.path ? 'highlighted' : ''"
                >
                    <v-list-item-content>
                        <v-list-item-title>
                            {{ item.title }}
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script>
import { useQuery, useResult } from '@vue/apollo-composable';
import { ref, computed } from '@vue/composition-api';
import gql from 'graphql-tag';
import { useAuth } from '../auth';

export default {
    name: 'ToolBar',
    setup(props, { root }) {
        const { userId, logout: authLogout } = useAuth();
        const { result } = useQuery(
            gql`
                query GetUserInfo($userId: ID!) {
                    user(id: $userId) {
                        fullName
                        email
                        roles
                    }
                }
            `,
            {
                userId,
            }
        );

        const user = useResult(result, { fullName: '', roles: [] });
        const navItems = computed(() => {
            const items = [];
            if (user.value.roles.includes('admin')) {
                items.push({
                    title: 'Admin space',
                    path: '/admin',
                });
            }
            return items;
        });

        function logout() {
            authLogout();
            root.$router.push('/login');
        }

        const drawer = ref(false);

        return {
            user,
            drawer,
            navItems,
            logout,
        };
    },
};
</script>

<style>
.clickable {
    cursor: pointer;
}
.code {
    font-family: 'Fira Code', 'Lucida Console', Monaco, monospace;
}
</style>
