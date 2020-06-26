<template>
    <div>
        <v-app-bar>
            <v-app-bar-nav-icon @click="drawer = !drawer" />
            <router-link to="/">
                <v-icon>mdi-home</v-icon>
            </router-link>
            <v-spacer />
            <v-menu offset-y>
                <template #activator="{ on }">
                    <div class="clickable" v-on="on">
                        <span>{{ user.fullName }}</span>
                        <v-icon>mdi-arrow_drop_down</v-icon>
                    </div>
                </template>
                <v-list>
                    <v-subheader>User space</v-subheader>
                    <v-list-item-group>
                        <v-list-item>
                            <v-list-item-icon>
                                <v-icon>mdi-account</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title
                                >Account settings</v-list-item-title
                            >
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-icon>
                                <v-icon>mdi-logout</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title
                                @click="logout"
                                v-text="'Disconnect'"
                            />
                        </v-list-item>
                    </v-list-item-group>
                </v-list>
            </v-menu>
        </v-app-bar>
        <v-navigation-drawer v-model="drawer" app absolute temporary>
            <template v-if="isAdmin">
                <v-subheader>Admin space</v-subheader>
                <v-list-item>
                    <v-list-item-title>Users</v-list-item-title>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title>Part families</v-list-item-title>
                </v-list-item>
                <v-divider />
            </template>
            <template v-if="isManager">
                <v-subheader>Manager space</v-subheader>
                <v-list-item>
                    <v-list-item-title>New Project</v-list-item-title>
                </v-list-item>
                <v-divider />
            </template>
        </v-navigation-drawer>
    </div>
</template>

<script>
import gql from 'graphql-tag';
import { useQuery, useResult } from '@vue/apollo-composable';
import { ref, computed } from '@vue/composition-api';
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
                        roles
                    }
                }
            `,
            {
                userId,
            }
        );

        const user = useResult(result, { fullName: '', roles: [] });
        const isAdmin = computed(() => user.value.roles.includes('admin'));
        const isManager = computed(() => user.value.roles.includes('manager'));

        function logout() {
            authLogout();
            root.$router.push('/login');
        }

        const drawer = ref(false);

        return {
            user,
            drawer,
            isAdmin,
            isManager,
            logout,
        };
    },
};
</script>

<style>
.clickable {
    cursor: pointer;
}
</style>
