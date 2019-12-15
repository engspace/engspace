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
                            <v-list-item-title>
                                Account settings
                            </v-list-item-title>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-icon>
                                <v-icon>mdi-logout</v-icon>
                            </v-list-item-icon>
                            <v-list-item-title @click="logout" v-text="'Disconnect'" />
                        </v-list-item>
                    </v-list-item-group>
                </v-list>
            </v-menu>
        </v-app-bar>
        <v-navigation-drawer v-model="drawer" app absolute temporary>
            <template v-if="isAdmin">
                <v-subheader>Admin space</v-subheader>
                <v-list-item to="/admin/users">
                    <v-list-item-title>Users</v-list-item-title>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title>Part families</v-list-item-title>
                </v-list-item>
                <v-list-item>
                    <v-list-item-title>Reference naming</v-list-item-title>
                </v-list-item>
                <v-divider />
            </template>
            <template v-if="isManager">
                <v-subheader>Manager space</v-subheader>
                <v-list-item to="/project/new">
                    <v-list-item-title>New Project</v-list-item-title>
                </v-list-item>
                <v-divider />
            </template>
        </v-navigation-drawer>
    </div>
</template>

<script>
import { Role } from '@engspace/core';
import { mapGetters } from 'vuex';
import { AUTH_LOGOUT_ACTION } from '../store';
import gql from 'graphql-tag';

export default {
    name: 'ToolBar',
    apollo: {
        user: {
            query: gql`
                query GetUserInfo($userId: ID!) {
                    user(id: $userId) {
                        fullName
                        roles
                    }
                }
            `,
            variables() {
                return {
                    userId: this.auth.userId,
                };
            },
        },
    },
    data() {
        return {
            drawer: false,
            user: { fullName: '', roles: [] },
        };
    },
    computed: {
        ...mapGetters(['auth']),
        isAdmin() {
            return this.user.roles.includes(Role.Admin);
        },
        isManager() {
            return this.user.roles.includes(Role.Manager);
        },
    },
    methods: {
        logout() {
            this.$store.dispatch(AUTH_LOGOUT_ACTION);
            this.$router.push('/login');
        },
    },
};
</script>

<style>
.clickable {
    cursor: pointer;
}
</style>
