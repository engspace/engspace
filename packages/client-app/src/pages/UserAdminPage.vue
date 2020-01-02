<template>
    <div>
        <h1 class="headline">User administration</h1>
        <v-expansion-panels :multiple="true">
            <v-expansion-panel>
                <v-expansion-panel-header>Create</v-expansion-panel-header>
                <v-expansion-panel-content>
                    <user-edit :user="createdUser" :error="createError">
                        <template v-slot:action="{ user }">
                            <success-btn ref="createBtn" badge-left small @click="createUser(user)">
                                <v-icon>mdi-content-save</v-icon>
                                Create
                            </success-btn>
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
                                    selectable
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
                                            <success-btn
                                                ref="updateBtn"
                                                badge-left
                                                small
                                                @click="updateUser(user)"
                                            >
                                                <v-icon>mdi-content-save</v-icon>
                                                Update
                                            </success-btn>
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
import SuccessBtn from '../components/SuccessBtn';
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
        }
    }
`;

export default {
    components: {
        SuccessBtn,
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
            updateError: '',

            createdUser: new CUser(),
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
            try {
                const res = await apolloClient.mutate({
                    mutation: UPDATE_USER,
                    variables: {
                        id,
                        user: { name, email, fullName, roles },
                    },
                });
                this.currentUser = res.data.updateUser;
                this.$refs.userFinder.notifyUpdate(res.data.updateUser);
                await this.$refs.updateBtn.animate();
                this.editing = false;
            } catch (err) {
                this.updateError = err.message;
            } finally {
                this.loading = false;
            }
        },

        async createUser(user) {
            const { name, email, fullName, roles } = user;
            try {
                await apolloClient.mutate({
                    mutation: CREATE_USER,
                    variables: {
                        user: { name, email, fullName, roles },
                    },
                });
                this.createdUser = new CUser();
                this.$refs.createBtn.animate();
            } catch (err) {
                console.error(err);
                this.createError = err.message;
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
