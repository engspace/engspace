<template>
    <div>
        <v-toolbar app>
            <v-toolbar-side-icon @click="drawer = !drawer" />
            <router-link to="/">
                <v-icon>home</v-icon>
            </router-link>
            <v-spacer />
            <v-menu offset-y>
                <template #activator="{ on }">
                    <div class="clickable" v-on="on">
                        <span>{{ user.fullName }}</span>
                        <v-icon>arrow_drop_down</v-icon>
                    </div>
                </template>
                <v-list>
                    <v-subheader>User space</v-subheader>
                    <v-list-tile>
                        <v-list-tile-title>Account settings</v-list-tile-title>
                    </v-list-tile>
                    <v-list-tile @click="logout">
                        <v-list-tile-title v-text="'Disconnect'" />
                    </v-list-tile>
                </v-list>
            </v-menu>
        </v-toolbar>
        <v-navigation-drawer v-model="drawer" app absolute temporary>
            <template v-if="user.admin">
                <v-subheader>Admin space</v-subheader>
                <v-list-tile to="/admin/users">
                    <v-list-tile-title>Users</v-list-tile-title>
                </v-list-tile>
                <v-list-tile>
                    <v-list-tile-title>Part families</v-list-tile-title>
                </v-list-tile>
                <v-list-tile>
                    <v-list-tile-title>Reference naming</v-list-tile-title>
                </v-list-tile>
                <v-divider />
            </template>
            <template v-if="user.manager">
                <v-subheader>Manager space</v-subheader>
                <v-list-tile to="/project/new">
                    <v-list-tile-title>New Project</v-list-tile-title>
                </v-list-tile>
                <v-divider />
            </template>
        </v-navigation-drawer>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import { AUTH_LOGOUT } from '../store/actions';

export default Vue.extend({
    name: 'ToolBar',
    data() {
        return {
            drawer: false,
        };
    },
    computed: {
        ...mapGetters(['user']),
    },
    methods: {
        logout() {
            this.$store.dispatch(AUTH_LOGOUT);
            this.$router.push('/login');
        },
    },
});
</script>

<style>
.clickable {
    cursor: pointer;
}
</style>
