<template>
    <div>
        <h1>User administration</h1>
        <v-expansion-panels :multiple="true">
            <v-expansion-panel>
                <v-expansion-panel-header>Create</v-expansion-panel-header>
                <v-expansion-panel-content>
                    <user-edit :user="createdUser" :error="createError">
                        <template v-slot:action="{ user }">
                            <v-badge v-model="createSuccess" color="teal" left>
                                <template v-slot:badge>
                                    <v-icon dark>mdi-check</v-icon>
                                </template>
                                <v-btn small @click="createUser(user)">
                                    <v-icon>mdi-content-save</v-icon>
                                    Create
                                </v-btn>
                            </v-badge>
                        </template>
                    </user-edit>
                </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel>
                <v-expansion-panel-header>Search / Update</v-expansion-panel-header>
                <v-expansion-panel-content>
                    <v-container fluid>
                        <v-row>
                            <v-col :cols="12" :md="8">
                                <user-finder
                                    ref="userFinder"
                                    v-model="currentUserId"
                                    :empty-all="false"
                                ></user-finder>
                            </v-col>
                            <v-col :cols="12" :md="4">
                                <transition v-if="currentUserId" name="comp-fade" mode="out-in">
                                    <user-read
                                        v-if="!editing"
                                        key="read"
                                        :user="currentUser"
                                        :loading="loading"
                                    >
                                        <template v-slot:action>
                                            <v-btn small @click="editing = !editing">
                                                <v-icon>mdi-pencil</v-icon>
                                                Edit
                                            </v-btn>
                                        </template>
                                    </user-read>
                                    <user-edit
                                        v-if="editing"
                                        key="edit"
                                        :user="currentUser"
                                        :loading="loading"
                                        :error="updateError"
                                    >
                                        <template v-slot:action="{ user }">
                                            <v-badge v-model="updateSuccess" color="teal" left>
                                                <template v-slot:badge>
                                                    <v-icon dark>mdi-check</v-icon>
                                                </template>
                                                <v-btn small @click="updateUser(user)">
                                                    <v-icon>mdi-content-save</v-icon>
                                                    Update
                                                </v-btn>
                                            </v-badge>
                                        </template>
                                    </user-edit>
                                </transition>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<script>
import UserEdit from '../components/UserEdit';
import UserRead from '../components/UserRead';
import UserFinder from '../components/UserFinder';
import { CUser } from '@engspace/core';
import gql from 'graphql-tag';
import { apolloClient } from '../apollo';

const GET_USER = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            name
            email
            fullName
            roles
        }
    }
`;

const UPDATE_USER = gql`
    mutation UpdateUser($id: ID!, $user: UserInput!) {
        updateUser(id: $id, user: $user) {
            id
            name
            email
            fullName
            roles
        }
    }
`;

const CREATE_USER = gql`
    mutation CreateUser($user: UserInput!) {
        createUser(user: $user) {
            id
            name
            email
            fullName
            roles
        }
    }
`;

export default {
    components: {
        UserEdit,
        UserRead,
        UserFinder,
    },
    data() {
        return {
            currentUserId: '',
            currentUser: new CUser(),
            editing: false,
            loading: false,
            updateSuccess: false,
            updateError: '',

            createdUser: new CUser(),
            createSuccess: false,
            createError: '',
        };
    },
    watch: {
        async currentUserId() {
            this.editing = false;
            if (!this.currentUserId) {
                this.currentUser = new CUser();
                return;
            }
            this.loading = true;
            const res = await apolloClient.query({
                query: GET_USER,
                variables: {
                    id: this.currentUserId,
                },
            });
            this.currentUser = res.data.user;
            this.loading = false;
        },
    },
    methods: {
        async updateUser(user) {
            this.loading = true;
            const { id, name, email, fullName, roles } = user;
            const res = await apolloClient.mutate({
                mutation: UPDATE_USER,
                variables: {
                    id,
                    user: { name, email, fullName, roles },
                },
            });
            if (res.data && res.data.updateUser) {
                this.currentUser = res.data.updateUser;
                this.$refs.userFinder.notifyUpdate(res.data.updateUser);
                this.updateSuccess = true;
                setTimeout(() => {
                    this.updateSuccess = false;
                    this.editing = false;
                }, 1000);
            } else if (res.errors) {
                this.updateError = res.errors.map(err => err.message).join(' ; ');
            }
            this.loading = false;
        },

        async createUser(user) {
            const { name, email, fullName, roles } = user;
            const res = await apolloClient.mutate({
                mutation: CREATE_USER,
                variables: {
                    user: { name, email, fullName, roles },
                },
            });
            if (res.data.createUser) {
                this.createdUser = new CUser();
                this.createSuccess = true;
                setTimeout(() => (this.createSuccess = false), 1000);
            } else if (res.errors) {
                this.createError = res.errors.map(err => err.message).join(' ; ');
            }
        },
    },
};
</script>

<style scoped>
.comp-fade-enter-active,
.comp-fade-leave-active {
    transition: opacity 0.15s ease;
}
.comp-fade-enter,
.comp-fade-leave-to {
    opacity: 0;
}
</style>
