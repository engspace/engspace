<template>
    <v-container fluid>
        <v-row>
            <v-col :cols="12" :md="8">
                <user-finder v-model="currentUserId"></user-finder>
            </v-col>
            <v-col :cols="12" :md="4">
                <transition>
                    <component
                        :is="currentUserComp"
                        v-show="currentUserId"
                        :user="currentUser"
                        :loading="loading"
                        :show-edit="true"
                        @edit="currentUserComp = 'user-edit'"
                        @save="saveUser($event)"
                    ></component>
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
            currentUserComp: 'user-read',
            loading: false,
        };
    },
    watch: {
        async currentUserId() {
            this.currentUserComp = 'user-read';
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
            this.currentUserComp = 'user-read';
        },
    },
};
</script>
