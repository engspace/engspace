<template>
    <v-container fluid>
        <v-row>
            <v-col :cols="12" :md="8">
                <user-finder v-model="currentUserId"></user-finder>
            </v-col>
            <v-col :cols="12" :md="4">
                <transition v-if="currentUserId" name="comp-fade" mode="out-in">
                    <user-read
                        v-if="!editing"
                        key="read"
                        :user="currentUser"
                        :loading="loading"
                        :show-edit="true"
                        @edit="editing = true"
                    ></user-read>
                    <user-edit
                        v-if="editing"
                        key="edit"
                        :user="currentUser"
                        :loading="loading"
                        @save="saveUser($event)"
                    ></user-edit>
                </transition>
            </v-col>
        </v-row>
    </v-container>
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
            loading: false,
            editing: false,
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
        saveUser(user) {
            // const { id, name, email, fullName, roles } = user;
            this.currentUser = user;
            this.editing = false;
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
